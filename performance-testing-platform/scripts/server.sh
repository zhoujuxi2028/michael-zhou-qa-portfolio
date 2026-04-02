#!/usr/bin/env bash
# server.sh — 服务生命周期管理 + 系统指标采集
# Usage:
#   ./scripts/server.sh start [cluster|single]   — 启动服务 (防重复)
#   ./scripts/server.sh stop                      — 停止服务
#   ./scripts/server.sh restart [cluster|single]  — 重启服务
#   ./scripts/server.sh restart [cluster|single] --clean — 重启 + 清理数据库
#   ./scripts/server.sh collect [interval] [path] — 系统指标采集 → CSV

set -euo pipefail

PORT="${PORT:-3000}"
ACTION="${1:-start}"
MODE="${2:-cluster}"
CLEAN=false
# Parse --clean flag from any position
for arg in "$@"; do
  if [ "$arg" = "--clean" ]; then
    CLEAN=true
  fi
done
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# --- helpers ---

get_our_pids() {
  local raw
  raw=$(lsof -ti:"$PORT" 2>/dev/null || true)
  [ -z "$raw" ] && return 0
  echo "$raw" | while read -r pid; do
    local cmd
    cmd=$(ps -p "$pid" -o command= 2>/dev/null || true)
    if echo "$cmd" | grep -q "node" && echo "$cmd" | grep -qE "(src/|scripts/)"; then
      echo "$pid"
    fi
  done
  return 0
}

do_clean_db() {
  local db_dir="$PROJECT_DIR/data"
  echo "Cleaning database (removing $db_dir/perf.db*)..."
  rm -f "$db_dir"/perf.db "$db_dir"/perf.db-shm "$db_dir"/perf.db-wal
}

do_stop() {
  local pids
  pids=$(get_our_pids)
  if [ -z "$pids" ]; then
    echo "No server running on port $PORT."
    return 0
  fi

  echo "Stopping server (PIDs: $(echo $pids | tr '\n' ' '))..."
  echo "$pids" | xargs kill -TERM 2>/dev/null || true

  # Wait up to 5s for graceful shutdown
  for _ in $(seq 1 25); do
    pids=$(get_our_pids)
    if [ -z "$pids" ]; then
      echo "Server stopped."
      return 0
    fi
    sleep 0.2
  done

  # Force kill if still alive
  pids=$(get_our_pids)
  if [ -n "$pids" ]; then
    echo "Force killing: $(echo $pids | tr '\n' ' ')"
    echo "$pids" | xargs kill -9 2>/dev/null || true
  fi
  echo "Server stopped."
}

do_start() {
  local pids
  pids=$(get_our_pids)
  if [ -n "$pids" ]; then
    echo "Server already running on port $PORT (PIDs: $(echo $pids | tr '\n' ' ')). Skipping."
    return 0
  fi

  cd "$PROJECT_DIR"
  local entry
  if [ "$MODE" = "single" ]; then
    entry="src/server.js"
  else
    entry="src/cluster.js"
  fi

  echo "Starting server in $MODE mode on port $PORT..."
  nohup node "$entry" > /dev/null 2>&1 &

  # Wait for health check (up to 5s)
  for _ in $(seq 1 25); do
    if curl -sf "http://localhost:$PORT/health" > /dev/null 2>&1; then
      echo "Server is running on port $PORT."
      return 0
    fi
    sleep 0.2
  done
  echo "Warning: health check timeout, server may still be starting."
}

do_collect() {
  local interval="${2:-1000}"
  local output="${3:-reports/system-metrics-$(date +%s).csv}"

  cd "$PROJECT_DIR"
  mkdir -p "$(dirname "$output")"

  node -e "
const os = require('os');
const fs = require('fs');
const { execSync } = require('child_process');

const INTERVAL = ${interval};
const OUTPUT = '${output}';
const HEADER = 'timestamp,cpu_user%,cpu_system%,cpu_idle%,mem_total_mb,mem_available_mb,mem_usage%,disk_io_mb_s,net_rx_kb_s,net_tx_kb_s';
fs.writeFileSync(OUTPUT, HEADER + '\n');
console.log('Collecting metrics every ' + INTERVAL + 'ms → ' + OUTPUT);

let prevCpus = os.cpus();
let prevNet = getNetBytes();
let prevTime = Date.now();

function getCpuPercent() {
  const cpus = os.cpus();
  let userDiff = 0, sysDiff = 0, idleDiff = 0;
  for (let i = 0; i < cpus.length; i++) {
    const prev = prevCpus[i].times, curr = cpus[i].times;
    userDiff += curr.user - prev.user;
    sysDiff += curr.sys - prev.sys;
    idleDiff += curr.idle - prev.idle;
  }
  prevCpus = cpus;
  const total = userDiff + sysDiff + idleDiff || 1;
  return { user: ((userDiff / total) * 100).toFixed(1), system: ((sysDiff / total) * 100).toFixed(1), idle: ((idleDiff / total) * 100).toFixed(1) };
}

function getMemory() {
  try {
    const out = execSync('vm_stat 2>/dev/null', { encoding: 'utf-8', timeout: 2000 });
    const page = 4096;
    const parse = (key) => { const m = out.match(new RegExp(key + ':\\\\s+(\\\\d+)')); return m ? parseInt(m[1]) : 0; };
    const free = parse('Pages free');
    const inactive = parse('Pages inactive');
    const purgeable = parse('Pages purgeable');
    const speculative = parse('Pages speculative');
    const availableBytes = (free + inactive + purgeable + speculative) * page;
    const totalBytes = os.totalmem();
    const usedBytes = totalBytes - availableBytes;
    return {
      totalMb: (totalBytes / 1024 / 1024).toFixed(0),
      availableMb: (availableBytes / 1024 / 1024).toFixed(0),
      usage: ((usedBytes / totalBytes) * 100).toFixed(1)
    };
  } catch {
    return { totalMb: (os.totalmem() / 1024 / 1024).toFixed(0), availableMb: '0', usage: '0' };
  }
}

function getDiskIO() {
  try {
    const out = execSync('iostat -d -c 2 -w 1 2>/dev/null', { encoding: 'utf-8', timeout: 3000 });
    const lines = out.trim().split('\\n');
    const lastLine = lines[lines.length - 1].trim().split(/\\s+/);
    const mbPerSec = parseFloat(lastLine[2]) || 0;
    return { ioMb: mbPerSec.toFixed(2) };
  } catch { return { ioMb: '0' }; }
}

function getNetBytes() {
  try {
    const out = execSync('netstat -ib 2>/dev/null', { encoding: 'utf-8', timeout: 2000 });
    const lines = out.trim().split('\\n');
    for (const line of lines) {
      if (line.startsWith('en0') && line.includes('<Link#')) {
        const cols = line.trim().split(/\\s+/);
        if (cols.length >= 10) {
          return { rx: BigInt(cols[6] || '0'), tx: BigInt(cols[9] || '0') };
        }
      }
    }
    return { rx: 0n, tx: 0n };
  } catch { return { rx: 0n, tx: 0n }; }
}

function getNetRate() {
  const now = Date.now(), elapsed = (now - prevTime) / 1000 || 1;
  const curr = getNetBytes();
  const rxDiff = Number(curr.rx - prevNet.rx);
  const txDiff = Number(curr.tx - prevNet.tx);
  const rxKb = (rxDiff >= 0 ? rxDiff / 1024 / elapsed : 0).toFixed(1);
  const txKb = (txDiff >= 0 ? txDiff / 1024 / elapsed : 0).toFixed(1);
  prevNet = curr; prevTime = now;
  return { rxKb, txKb };
}

function collect() {
  const cpu = getCpuPercent(), mem = getMemory(), disk = getDiskIO(), net = getNetRate();
  const row = [new Date().toISOString(), cpu.user, cpu.system, cpu.idle, mem.totalMb, mem.availableMb, mem.usage, disk.ioMb, net.rxKb, net.txKb].join(',');
  fs.appendFileSync(OUTPUT, row + '\n');
}

const timer = setInterval(collect, INTERVAL);
function shutdown() { clearInterval(timer); console.log('Metrics collection stopped. Output: ' + OUTPUT); process.exit(0); }
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
"
}

# --- main ---

case "$ACTION" in
  start)
    do_start
    ;;
  stop)
    do_stop
    ;;
  restart)
    do_stop
    sleep 0.5
    if [ "$CLEAN" = true ]; then
      do_clean_db
    fi
    do_start
    ;;
  collect)
    do_collect "$@"
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|collect} [cluster|single]"
    exit 1
    ;;
esac
