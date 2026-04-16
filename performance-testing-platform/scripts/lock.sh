#!/bin/bash
# Lock Mechanism for Script Mutual Exclusion
#
# Usage:
#   bash lock.sh acquire <lock_dir>    # Acquire lock, exit 1 if already held
#   bash lock.sh release <lock_dir>    # Release lock (silent if not held)
#   bash lock.sh guard <lock_dir> "<cmd>"  # Acquire, run cmd, release

set -e

COMMAND="${1}"
LOCK_DIR="${2}"
CMD="${3}"

# ============================================================
# acquire_lock: Create lock directory (atomic mkdir)
# ============================================================
acquire_lock() {
  local lock_dir="$1"

  if mkdir "$lock_dir" 2>/dev/null; then
    return 0
  else
    echo "❌ ERROR: Integration test is already running in another process"
    echo "   Lock file: $lock_dir"
    echo "   If the previous run crashed, remove it: rm -rf $lock_dir"
    return 1
  fi
}

# ============================================================
# release_lock: Remove lock directory
# ============================================================
release_lock() {
  local lock_dir="$1"
  rmdir "$lock_dir" 2>/dev/null || true
}

# ============================================================
# Main dispatcher
# ============================================================
case "$COMMAND" in
  acquire)
    acquire_lock "$LOCK_DIR"
    ;;
  release)
    release_lock "$LOCK_DIR"
    ;;
  guard)
    # Acquire lock, run command with auto-release
    acquire_lock "$LOCK_DIR"
    trap "release_lock '$LOCK_DIR'" EXIT
    eval "$CMD"
    ;;
  *)
    echo "Usage: $0 {acquire|release|guard} <lock_dir> [<cmd>]"
    exit 1
    ;;
esac
