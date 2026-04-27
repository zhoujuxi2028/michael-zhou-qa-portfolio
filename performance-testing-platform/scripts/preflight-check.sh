#!/usr/bin/env bash
# scripts/preflight-check.sh — Pre-flight environment check before performance testing
#
# Usage:
#   bash scripts/preflight-check.sh
#
# Env overrides (for testing):
#   LOAD_THRESHOLD=5      — fail if 1-min load avg >= this (default: 5)
#   MEM_MIN_GB=2          — fail if available memory < this GB (default: 2)
#   CPU_IDLE_MIN=50       — fail if CPU idle% < this (default: 50)
#
# Exit codes:
#   0 — all checks passed, safe to run performance tests
#   1 — one or more checks failed, do NOT start tests

set -uo pipefail

LOAD_THRESHOLD="${LOAD_THRESHOLD:-10}"
MEM_MIN_GB="${MEM_MIN_GB:-2}"
CPU_IDLE_MIN="${CPU_IDLE_MIN:-50}"

PASS=true
HINTS=""

echo "=================================================="
echo "  Performance Test Pre-flight Check"
echo "=================================================="

# ── Step 1: Kill orphaned "node -e" processes ────────────────────────────────
# 注意：只清理 "node -e" 一次性脚本，不清理 cluster.js（由 server.sh stop 管理）
echo ""
echo "[ 1/4 ] Checking for orphaned node processes..."
ORPHAN_PIDS=$(ps aux | awk '$0 ~ /[n]ode -e/ && $0 !~ /Collecting metrics every/ {print $2}' || true)
if [ -n "$ORPHAN_PIDS" ]; then
  echo "  Found orphaned processes: $(echo "$ORPHAN_PIDS" | tr '\n' ' ')"
  echo "$ORPHAN_PIDS" | xargs kill -9 2>/dev/null || true
  echo "  Killed."
  sleep 1
else
  echo "  No orphaned processes found."
fi

# ── Step 2: Check Load Average ────────────────────────────────────────────────
echo ""
echo "[ 2/4 ] Checking Load Average (threshold: < ${LOAD_THRESHOLD})..."
# Extract load average — sanitize output to prevent warning pollution (ISS-010)
LOAD_RAW=$(sysctl -n vm.loadavg 2>/dev/null | awk '{print $2}' || echo "0")
LOAD=$(echo "$LOAD_RAW" | tail -1 | tr -dc '0-9.' || echo "0")
LOAD="${LOAD:-0}"
LOAD_INT=$(echo "$LOAD" | awk '{printf "%d", int($1 + 0.5)}')
echo "  Current: ${LOAD}"
if [ "${LOAD_INT}" -lt "${LOAD_THRESHOLD}" ]; then
  echo "  ✅ Load Average OK"
else
  echo "  ❌ Load Average ${LOAD} exceeds threshold ${LOAD_THRESHOLD}"
  HINTS="${HINTS}\n  → Please wait for system to recover (current load: ${LOAD}, threshold: ${LOAD_THRESHOLD})"
  PASS=false
fi

# ── Step 3: Check Available Memory ───────────────────────────────────────────
echo ""
echo "[ 3/4 ] Checking Available Memory (min: ${MEM_MIN_GB} GB)..."
MEM_AVAIL_MB=$(node -e "
const { execSync } = require('child_process');
try {
  const out = execSync('vm_stat', { encoding: 'utf-8' });
  const page = 4096;
  const parse = (key) => { const m = out.match(new RegExp(key + ':\\\\s+(\\\\d+)')); return m ? parseInt(m[1]) : 0; };
  const avail = (parse('Pages free') + parse('Pages inactive') + parse('Pages purgeable') + parse('Pages speculative')) * page;
  console.log(Math.floor(avail / 1024 / 1024));
} catch(e) { console.log(0); }
" 2>/dev/null | tail -1 | tr -dc '0-9' || echo "0")
MEM_AVAIL_MB="${MEM_AVAIL_MB:-0}"
MEM_MIN_MB=$(( MEM_MIN_GB * 1024 ))
echo "  Available: ${MEM_AVAIL_MB} MB  (required: ${MEM_MIN_MB} MB / ${MEM_MIN_GB} GB)"
if [ "${MEM_AVAIL_MB}" -ge "${MEM_MIN_MB}" ]; then
  echo "  ✅ Memory OK"
else
  echo "  ❌ Available Memory ${MEM_AVAIL_MB} MB below threshold ${MEM_MIN_MB} MB (${MEM_MIN_GB} GB)"
  HINTS="${HINTS}\n  → Please close other applications to free memory (available: ${MEM_AVAIL_MB}MB, required: ${MEM_MIN_MB}MB)"
  PASS=false
fi

# ── Step 4: Check CPU Idle ────────────────────────────────────────────────────
echo ""
echo "[ 4/4 ] Checking CPU Idle (min: ${CPU_IDLE_MIN}%)..."
# Extract CPU idle% — sanitize output to prevent warning pollution (ISS-010)
CPU_IDLE_RAW=$(top -l 1 | grep "CPU usage" | grep -oE '[0-9.]+% idle' | grep -oE '[0-9.]+' || echo "0")
CPU_IDLE=$(echo "$CPU_IDLE_RAW" | tail -1 | tr -dc '0-9.' || echo "0")
CPU_IDLE="${CPU_IDLE:-0}"
CPU_IDLE_INT=$(echo "${CPU_IDLE}" | awk '{printf "%d", int($1)}')
echo "  Current idle: ${CPU_IDLE}%"
if [ "${CPU_IDLE_INT}" -ge "${CPU_IDLE_MIN}" ]; then
  echo "  ✅ CPU Idle OK"
else
  echo "  ❌ CPU Idle ${CPU_IDLE}% below threshold ${CPU_IDLE_MIN}%"
  HINTS="${HINTS}\n  → Please close other applications to reduce CPU usage (idle: ${CPU_IDLE}%, required: ${CPU_IDLE_MIN}%)"
  PASS=false
fi

# ── Step 5: Stage 4 Docker Check (optional, --stage4 flag) ──────────────────
if [[ "$*" == *"--stage4"* ]]; then
  echo ""
  echo "[ 5/5 ] Checking Docker for Stage 4 Integration Tests..."
  if ! docker info > /dev/null 2>&1; then
    echo "  ⏳ Docker daemon not running — attempting auto-start..."
    
    # Auto-detect and start container runtime
    if command -v open &> /dev/null; then
      # macOS: try OrbStack first (fastest), then Docker, then Colima
      if [ -d "/Applications/OrbStack.app" ]; then
        echo "  → Starting OrbStack..."
        open -a OrbStack
        sleep 5
      elif [ -d "/Applications/Docker.app" ]; then
        echo "  → Starting Docker Desktop..."
        open -a Docker
        sleep 8
      elif command -v colima &> /dev/null; then
        echo "  → Starting Colima..."
        colima start
        sleep 5
      else
        echo "  ❌ No container runtime found (OrbStack, Docker, or Colima)"
        HINTS="${HINTS}\n  → Install OrbStack (recommended) or Docker Desktop"
        PASS=false
      fi
    else
      # Linux: try systemctl
      if command -v systemctl &> /dev/null; then
        echo "  → Starting Docker via systemctl..."
        sudo systemctl start docker
        sleep 3
      else
        echo "  ❌ Cannot auto-start Docker on this system"
        HINTS="${HINTS}\n  → Please start Docker manually"
        PASS=false
      fi
    fi
    
    # Verify Docker is now running
    if docker info > /dev/null 2>&1; then
      echo "  ✅ Docker daemon started successfully"
    else
      echo "  ❌ Docker daemon failed to start"
      HINTS="${HINTS}\n  → Check container runtime logs or start manually"
      PASS=false
    fi
  else
    echo "  ✅ Docker daemon OK"
  fi
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "=================================================="
if [ "$PASS" = true ]; then
  echo "  ✅ Preflight passed — environment ready for performance testing"
  [[ "$*" == *"--stage4"* ]] && echo "  ✅ Stage 4 integration test environment ready"
  echo "=================================================="
  exit 0
else
  echo "  ❌ Preflight FAILED — do NOT start performance tests until resolved"
  echo ""
  echo "  Action required:"
  echo -e "$HINTS"
  echo "=================================================="
  exit 1
fi
