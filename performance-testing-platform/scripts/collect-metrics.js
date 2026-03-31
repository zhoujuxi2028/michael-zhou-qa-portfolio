#!/usr/bin/env node
'use strict';

const os = require('os');
const fs = require('fs');
const { execSync } = require('child_process');

const INTERVAL = parseInt(process.argv[2]) || 1000;
const OUTPUT = process.argv[3] || `reports/system-metrics-${Date.now()}.csv`;

// Ensure output directory exists
fs.mkdirSync(require('path').dirname(OUTPUT), { recursive: true });

const HEADER =
  'timestamp,cpu_user%,cpu_system%,cpu_idle%,mem_total_mb,mem_used_mb,mem_usage%,disk_read_kb_s,disk_write_kb_s,net_rx_kb_s,net_tx_kb_s';

fs.writeFileSync(OUTPUT, HEADER + '\n');
console.log(`Collecting metrics every ${INTERVAL}ms → ${OUTPUT}`);

let prevCpus = os.cpus();
let prevNet = getNetBytes();
let prevTime = Date.now();

function getCpuPercent() {
  const cpus = os.cpus();
  let userDiff = 0,
    sysDiff = 0,
    idleDiff = 0;
  for (let i = 0; i < cpus.length; i++) {
    const prev = prevCpus[i].times;
    const curr = cpus[i].times;
    userDiff += curr.user - prev.user;
    sysDiff += curr.sys - prev.sys;
    idleDiff += curr.idle - prev.idle;
  }
  prevCpus = cpus;
  const total = userDiff + sysDiff + idleDiff || 1;
  return {
    user: ((userDiff / total) * 100).toFixed(1),
    system: ((sysDiff / total) * 100).toFixed(1),
    idle: ((idleDiff / total) * 100).toFixed(1),
  };
}

function getMemory() {
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;
  return {
    totalMb: (total / 1024 / 1024).toFixed(0),
    usedMb: (used / 1024 / 1024).toFixed(0),
    usage: ((used / total) * 100).toFixed(1),
  };
}

function getDiskIO() {
  try {
    const out = execSync('iostat -d -c 2 -w 1 2>/dev/null', { encoding: 'utf-8', timeout: 3000 });
    const lines = out.trim().split('\n');
    // Last data line has KB/t, tps, MB/s
    const lastLine = lines[lines.length - 1].trim().split(/\s+/);
    const mbPerSec = parseFloat(lastLine[2]) || 0;
    return {
      readKb: (mbPerSec * 1024 * 0.5).toFixed(1),
      writeKb: (mbPerSec * 1024 * 0.5).toFixed(1),
    };
  } catch {
    return { readKb: '0', writeKb: '0' };
  }
}

function getNetBytes() {
  try {
    const out = execSync('netstat -ib 2>/dev/null', { encoding: 'utf-8', timeout: 3000 });
    const lines = out.trim().split('\n');
    let rxBytes = 0,
      txBytes = 0;
    for (const line of lines) {
      if (line.startsWith('en0')) {
        const cols = line.trim().split(/\s+/);
        // en0 columns: Name, Mtu, Network, Address, Ipkts, Ierrs, Ibytes, Opkts, Oerrs, Obytes
        if (cols.length >= 10) {
          rxBytes += parseInt(cols[6]) || 0;
          txBytes += parseInt(cols[9]) || 0;
        }
      }
    }
    return { rx: rxBytes, tx: txBytes };
  } catch {
    return { rx: 0, tx: 0 };
  }
}

function getNetRate() {
  const now = Date.now();
  const elapsed = (now - prevTime) / 1000 || 1;
  const curr = getNetBytes();
  const rxKb = ((curr.rx - prevNet.rx) / 1024 / elapsed).toFixed(1);
  const txKb = ((curr.tx - prevNet.tx) / 1024 / elapsed).toFixed(1);
  prevNet = curr;
  prevTime = now;
  return { rxKb, txKb };
}

function collect() {
  const cpu = getCpuPercent();
  const mem = getMemory();
  const disk = getDiskIO();
  const net = getNetRate();
  const row = [
    new Date().toISOString(),
    cpu.user,
    cpu.system,
    cpu.idle,
    mem.totalMb,
    mem.usedMb,
    mem.usage,
    disk.readKb,
    disk.writeKb,
    net.rxKb,
    net.txKb,
  ].join(',');
  fs.appendFileSync(OUTPUT, row + '\n');
}

const timer = setInterval(collect, INTERVAL);

function shutdown() {
  clearInterval(timer);
  console.log(`Metrics collection stopped. Output: ${OUTPUT}`);
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
