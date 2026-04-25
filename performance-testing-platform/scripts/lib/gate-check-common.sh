#!/usr/bin/env bash

# scripts/lib/gate-check-common.sh — Stage 4 P0/P1 门禁检查脚本公共库
#
# 提供：
#   - 计数器（PASS/FAIL/SKIP）与 log_result
#   - 覆盖率解析与阈值比较
#   - Markdown 报告生成
#   - 控制台横幅与统计输出
#
# 使用方式：
#   source "$(dirname "$0")/lib/gate-check-common.sh"
#   gate_init
#   log_result "P0-01" PASS "单元测试 (148 passed)"
#   ...
#   write_report "P0" "$REPORT_PATH" 5
#   print_summary "P0"
#   exit_with_status

# ============================================================
# 计数器（全局）
# ============================================================

PASS=0
FAIL=0
SKIP=0
RESULTS=""
START_TIME=0

gate_init() {
  PASS=0
  FAIL=0
  SKIP=0
  RESULTS=""
  START_TIME="$(date +%s)"
}

# ============================================================
# log_result <id> <PASS|FAIL|SKIP> <detail>
# ============================================================

log_result() {
  local id="$1" status="$2" detail="${3:-}"

  case "$status" in
    PASS)
      PASS=$((PASS + 1))
      RESULTS="${RESULTS}"$'\n'"  ✅ PASS: ${id} — ${detail}"
      printf '  ✅ PASS: %s — %s\n' "$id" "$detail"
      ;;
    SKIP)
      SKIP=$((SKIP + 1))
      RESULTS="${RESULTS}"$'\n'"  ⏭️ SKIP: ${id} — ${detail}"
      printf '  ⏭️ SKIP: %s — %s\n' "$id" "$detail"
      ;;
    FAIL | *)
      FAIL=$((FAIL + 1))
      RESULTS="${RESULTS}"$'\n'"  ❌ FAIL: ${id} — ${detail}"
      printf '  ❌ FAIL: %s — %s\n' "$id" "$detail"
      ;;
  esac
}

# ============================================================
# 覆盖率工具
# ============================================================

# extract_coverage <line>
# 输入：Jest 覆盖率"All files"行，例如：
#   "All files |   85.5 |   72.3 |   80.1 |   84.9 |"
# 输出（空格分隔，4 列）：stmt branch funcs lines
extract_coverage() {
  local line="$1"
  # 用 awk 切分管道分隔符，去除空格与 % 符号
  echo "$line" | awk -F'|' '{
    gsub(/[[:space:]%]/, "", $2);
    gsub(/[[:space:]%]/, "", $3);
    gsub(/[[:space:]%]/, "", $4);
    gsub(/[[:space:]%]/, "", $5);
    printf "%s %s %s %s\n", $2, $3, $4, $5;
  }'
}

# meets_threshold <actual> <threshold>
# 浮点比较（基于 awk）；actual >= threshold 返回 0
meets_threshold() {
  local actual="$1" threshold="$2"
  # 防御：空值或非数字一律视为 0
  if ! [[ "$actual" =~ ^[0-9]+([.][0-9]+)?$ ]]; then
    actual=0
  fi
  awk -v a="$actual" -v t="$threshold" 'BEGIN { exit (a + 0 >= t + 0) ? 0 : 1 }'
}

# below_threshold <actual> <threshold>
# 浮点比较；actual < threshold 返回 0（即"指标低于上限 = 通过"，例如错误率 < 1%）
below_threshold() {
  local actual="$1" threshold="$2"
  if ! [[ "$actual" =~ ^[0-9]+([.][0-9]+)?$ ]]; then
    actual=0
  fi
  awk -v a="$actual" -v t="$threshold" 'BEGIN { exit (a + 0 < t + 0) ? 0 : 1 }'
}

# sanitize_number <raw>
# 清洗 grep -c 等可能产出的多行/含非数字字符的计数；不存在或非数字 → 0
sanitize_number() {
  local raw="${1:-0}"
  raw="${raw//[^0-9]/}"
  printf '%s' "${raw:-0}"
}

# ============================================================
# 报告生成
# ============================================================

# write_report <level> <out_path> <total_items>
#   level     — "P0" 或 "P1"
#   out_path  — Markdown 文件路径
#   total_items — 该级别的检查项总数（用于占比）
write_report() {
  local level="$1" out="$2" total_items="${3:-0}"
  local timestamp end_ts duration
  timestamp="$(date '+%Y-%m-%d %H:%M:%S')"
  end_ts="$(date +%s)"
  duration=$((end_ts - START_TIME))

  local total=$((PASS + FAIL + SKIP))
  local rate=0
  if [ "$total" -gt 0 ]; then
    rate="$(awk "BEGIN { printf \"%.1f\", ($PASS * 100) / $total }")"
  fi

  local branch
  branch="$(git branch --show-current 2>/dev/null || echo "detached")"
  if [ -z "$branch" ]; then
    branch="${GITHUB_HEAD_REF:-${GITHUB_REF_NAME:-detached}}"
  fi

  local verdict
  if [ "$FAIL" -eq 0 ] && [ "$PASS" -ge 1 ]; then
    verdict="✅ **${level} Gate PASS** — 关键检查项全部通过。"
  elif [ "$FAIL" -eq 0 ]; then
    verdict="⚠️ **${level} Gate 条件通过** — 全部项被 SKIP，无 FAIL，但请确认是否符合预期。"
  else
    verdict="❌ **${level} Gate FAIL** — 存在 ${FAIL} 个失败项，请修复后重新运行。"
  fi

  mkdir -p "$(dirname "$out")"
  {
    printf '# %s Gate Check 报告\n\n' "$level"
    printf '**执行时间:** %s\n' "$timestamp"
    printf '**分支:** %s\n' "$branch"
    printf '**耗时:** %ss\n' "$duration"
    printf '**脚本:** scripts/%s-gate-check.sh\n\n' "$(echo "$level" | tr '[:upper:]' '[:lower:]')"
    printf -- '---\n\n'
    printf '## 检查结果\n'
    printf '%s\n\n' "$RESULTS"
    printf -- '---\n\n'
    printf '## 统计\n\n'
    printf '| 类型 | 数量 |\n|------|------|\n'
    printf '| ✅ 通过 | %s |\n' "$PASS"
    printf '| ❌ 失败 | %s |\n' "$FAIL"
    printf '| ⏭️ 跳过 | %s |\n' "$SKIP"
    printf '| **总计** | **%s** |\n' "$total"
    printf '| **声明项数** | **%s** |\n' "$total_items"
    printf '| **通过率** | **%s%%** |\n\n' "$rate"
    printf -- '---\n\n## 评估\n\n%s\n' "$verdict"
  } > "$out"
}

# ============================================================
# 控制台横幅与统计
# ============================================================

print_banner() {
  local level="$1"
  local mode="${2:-}"
  echo "=================================================="
  if [ -n "$mode" ]; then
    echo "  ${level} Gate Check — $(date '+%Y-%m-%d %H:%M:%S') [${mode}]"
  else
    echo "  ${level} Gate Check — $(date '+%Y-%m-%d %H:%M:%S')"
  fi
  echo "=================================================="
}

print_summary() {
  local level="$1"
  local total=$((PASS + FAIL + SKIP))
  local end_ts duration rate
  end_ts="$(date +%s)"
  duration=$((end_ts - START_TIME))
  if [ "$total" -gt 0 ]; then
    rate="$(awk "BEGIN { printf \"%.1f\", ($PASS * 100) / $total }")"
  else
    rate=0
  fi

  echo ""
  echo "=================================================="
  echo "  ${level} Gate — 统计结果"
  echo "=================================================="
  printf '✅ PASS: %d\n' "$PASS"
  printf '❌ FAIL: %d\n' "$FAIL"
  printf '⏭️ SKIP: %d\n' "$SKIP"
  printf '总计:    %d\n' "$total"
  printf '通过率:  %s%%\n' "$rate"
  printf '耗时:    %ss\n' "$duration"
  echo "=================================================="
}

# 退出码：FAIL > 0 → 1，否则 0
exit_with_status() {
  if [ "$FAIL" -gt 0 ]; then
    exit 1
  fi
  exit 0
}
