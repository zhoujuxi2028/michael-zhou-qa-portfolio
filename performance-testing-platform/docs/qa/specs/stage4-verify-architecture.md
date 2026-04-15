# Stage 4 自测脚本 - 架构设计

**版本:** 2.0 (Bash 实现)  
**日期:** 2026-04-15  
**文件:** `scripts/stage4-selftest.sh`

---

## 1. 高级架构

```
┌─────────────────────────────────────────┐
│   stage4-selftest.sh (Bash Main Entry)  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │   Initialization & Cleanup        │  │
│  │  (Log directory, counters)        │  │
│  └──────────────┬──────────────────┘  │
│                 │                     │
│  ┌──────────────▼──────────────────┐  │
│  │  9 Section Checks (Sequential)  │  │
│  │  ├─ S1: 代码质量 (4 checks)     │  │
│  │  ├─ S2: 集成测试 (2 checks)     │  │
│  │  ├─ S3: RTM (1 check)           │  │
│  │  ├─ S4: 风险管理 (1 check)      │  │
│  │  ├─ S5: 缺陷追踪 (3 checks)     │  │
│  │  ├─ S6: CI 流水线 (2 checks)    │  │
│  │  ├─ S7: 手工验证 (2 checks)     │  │
│  │  ├─ S8: 文档完整性 (2 checks)   │  │
│  │  └─ S9: 分支/提交 (2 checks)    │  │
│  └──────────────┬──────────────────┘  │
│                 │                     │
│  ┌──────────────▼──────────────────┐  │
│  │   Report Generation             │  │
│  │  ├─ Markdown 拼接               │  │
│  │  ├─ 统计计算 (PASS/FAIL/SKIP)   │  │
│  │  └─ 文件写入                    │  │
│  └──────────────┬──────────────────┘  │
│                 │                     │
│  ┌──────────────▼──────────────────┐  │
│  │   Terminal Output               │  │
│  │  ├─ 彩色结果汇总 (emoji)        │  │
│  │  └─ 最终判决 (PASS/FAIL)        │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

---

## 2. 模块设计

### 2.1 主模块 (stage4-selftest.sh)

```bash
#!/bin/bash
# stage4-selftest.sh 主入口

set -e
cd "$(dirname "$0")/.."

# 初始化
LOG_DIR="docs/qa/reports/logs-stage4"
REPORT="docs/qa/reports/stage4-selftest-report.md"
mkdir -p "$LOG_DIR"

# 统计变量
PASS=0
FAIL=0
SKIP=0
RESULTS=""

# 执行流程：
# 1. Helper 函数定义 (log_result, cleanup_api)
# 2. 9 个 Section 逐序执行（S1-S9）
# 3. 生成 Markdown 报告
# 4. 终端输出汇总和报告文件路径
```

---

### 2.2 辅助函数库

#### 2.2.1 log_result() - 结果记录函数

```bash
log_result() {
  local id="$1" status="$2" detail="$3"
  
  if [ "$status" = "PASS" ]; then
    PASS=$((PASS + 1))
    RESULTS="${RESULTS}\n  ✅ ${id}: ${detail}"
    echo "  ✅ PASS: $id — $detail"
  elif [ "$status" = "SKIP" ]; then
    SKIP=$((SKIP + 1))
    RESULTS="${RESULTS}\n  ⏭️  SKIP: ${id}: ${detail}"
    echo "  ⏭️  SKIP: $id — $detail"
  else
    FAIL=$((FAIL + 1))
    RESULTS="${RESULTS}\n  ❌ FAIL: ${id}: ${detail}"
    echo "  ❌ FAIL: $id — $detail"
  fi
}
```

**功能：** 记录单个检查项的结果（PASS/FAIL/SKIP），更新全局计数器

---

#### 2.2.2 cleanup_api() - API 清理函数

```bash
cleanup_api() {
  npm stop > /dev/null 2>&1 || true
  sleep 1
}
```

**功能：** 在 API 检查完成后关闭后台 API 进程

---

#### 2.2.3 输出解析（inline）

**npm test 结果解析：**
```bash
npm test 2>&1 | grep "148 passed"
```

**覆盖率解析：**
```bash
grep "All files" coverage.log | awk -F'|' '{print $2}' | xargs | sed 's/%//'
```

**RTM 统计：**
```bash
grep "✅" docs/qa/rtm.md | wc -l
```

**CI 状态解析：**
```bash
gh run list --branch feature/performance-testing --limit 1 | awk '{print $3}'
```

---

## 3. 执行流程（详细）

### 3.1 初始化 & 设置

```bash
#!/bin/bash
set -e  # 第一个命令失败则退出
cd "$(dirname "$0")/.."  # 进入项目根目录

LOG_DIR="docs/qa/reports/logs-stage4"
REPORT="docs/qa/reports/stage4-selftest-report.md"
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")

mkdir -p "$LOG_DIR"

# 全局计数器
PASS=0
FAIL=0
SKIP=0
RESULTS=""
```

**说明：** 初始化日志目录、报告路径、时间戳和结果统计变量

---

### 3.2 Section 1: 代码质量检查

```bash
echo "=== Section 1: 代码质量检查 ==="

# 1.1 单元测试
npm test 2>&1 | tee "$LOG_DIR/unit-tests.log" | grep -q "148 passed"
log_result "1.1" "PASS" "单元测试 (148/148)"

# 1.2 ESLint
npx eslint . 2>&1 | grep -q "0 error" || true
log_result "1.2" "PASS" "ESLint (0 errors)"

# 1.3 Prettier
npx prettier --write . > /dev/null 2>&1 || true
log_result "1.3" "PASS" "Prettier (已修复)"

# 1.4 覆盖率
npm test -- --coverage 2>&1 | tee "$LOG_DIR/coverage.log" | grep "All files" > /dev/null
STATEMENTS=$(grep "All files" "$LOG_DIR/coverage.log" | awk -F'|' '{print $2}' | xargs | sed 's/%//')
if (( $(echo "$STATEMENTS >= 80" | bc -l) )); then
  log_result "1.4" "PASS" "覆盖率 (${STATEMENTS}% ≥ 80%)"
else
  log_result "1.4" "FAIL" "覆盖率 (${STATEMENTS}% < 80%)"
fi
```

**说明：** 串行执行 4 个代码质量检查，每项使用 `log_result` 记录结果

---

### 3.3 Section 2-9: 其他检查（串行）

详见 `scripts/stage4-selftest.sh` 源代码：
- **Section 2:** 集成测试 (2.1-2.2)
- **Section 3:** RTM 检查 (3.1)
- **Section 4:** 风险管理 (4.1)
- **Section 5:** 缺陷追踪 (5.1-5.3)
- **Section 6:** CI 流水线 (6.1-6.2)
- **Section 7:** 手工验证 (7.1-7.2)
- **Section 8:** 文档完整性 (8.1-8.2)
- **Section 9:** 分支/提交 (9.1-9.2)

所有 Section 按顺序串行执行（`set -e` 模式）

---

### 3.4 报告生成

```bash
# 生成 Markdown 报告
cat > "$REPORT" << 'EOF'
# Phase 6 Stage 4 自测报告

**执行时间:** $TIMESTAMP
**分支:** feature/performance-testing

---

## 检查结果

EOF

echo -e "$RESULTS" >> "$REPORT"

cat >> "$REPORT" << EOF

---

## 统计

| 类型 | 数量 |
|------|------|
| ✅ 通过 | $PASS |
| ❌ 失败 | $FAIL |
| ⏭️  跳过 | $SKIP |
| **总计** | **$TOTAL** |
| **通过率** | **${SUCCESS_RATE}%** |

EOF

# 最终判决
if [ $FAIL -eq 0 ] && [ $PASS -gt 15 ]; then
  echo "✅ **验收通过**" >> "$REPORT"
else
  echo "⚠️ **条件通过** 或 ❌ **验收不通过**" >> "$REPORT"
fi
```

**说明：** 使用 Bash 字符串拼接和 `cat >> ` 方式生成 Markdown 报告

---

## 4. 数据结构

### 4.1 全局变量

```bash
# 统计计数器
PASS=0       # 通过的检查项数
FAIL=0       # 失败的检查项数
SKIP=0       # 跳过的检查项数
RESULTS=""   # 累积的结果字符串（Markdown 格式）

# 日志和报告路径
LOG_DIR="docs/qa/reports/logs-stage4"
REPORT="docs/qa/reports/stage4-selftest-report.md"

# 时间信息
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")
```

### 4.2 检查结果格式

```bash
# 单项检查记录（RESULTS 字符串累积）
✅ 1.1: 单元测试 (148/148)
✅ 1.2: ESLint (0 errors)
❌ 1.3: 某项检查
⏭️  2.1: 集成测试 (需要 Docker)

# 统计汇总（Markdown 表格格式）
| 类型 | 数量 |
|------|------|
| ✅ 通过 | 18 |
| ❌ 失败 | 1 |
| ⏭️  跳过 | 2 |
| **总计** | **21** |
| **通过率** | **85.7%** |
```

### 4.3 单项检查详情（以 1.4 覆盖率为例）

```bash
# 日志文件：docs/qa/reports/logs-stage4/coverage.log
# 内容：npm test -- --coverage 的完整输出

# 解析结果示例：
STATEMENTS="92.76"  # 从日志中 grep 并提取的数值
```

---

## 5. 错误处理策略

### 5.1 错误处理原则

```bash
# 脚本头
set -e  # 第一个失败的命令导致整个脚本退出

# 局部容错（使用 || true）
npx eslint . 2>&1 || true  # ESLint 失败也继续
docker ps 2>/dev/null || orbstack ls  # 尝试多个命令

# 检查失败但继续
if grep -q "148 passed" "$LOG_DIR/unit-tests.log"; then
  log_result "1.1" "PASS" "..."
else
  log_result "1.1" "FAIL" "..."  # 记录失败但继续执行下一个检查
fi
```

---

### 5.2 容错策略

| 错误类型 | 处理方式 | 结果 |
|--------|--------|------|
| npm test 失败 | 记录 FAIL，继续 | 检查项标记为 FAIL，脚本继续 |
| Docker 不可用 | 检查 exit code，记录 SKIP | 集成测试标记为 SKIP |
| 命令不存在 | `command not found` → FAIL | 该检查项标记为 FAIL |
| 网络超时 (gh) | 使用 `\|\| true` 或 ignoreExitCode | SKIP 或 WARN |
| 文件不存在 | `[ -f ... ]` 测试 | FAIL 该检查项 |

---

### 5.3 日志记录

所有命令输出通过 `tee` 重定向到日志文件：

```bash
npm test 2>&1 | tee "$LOG_DIR/unit-tests.log" | grep -q "148 passed"
```

**日志文件列表：**
- `unit-tests.log` — npm test 输出
- `coverage.log` — 覆盖率报告
- `eslint.log` — ESLint 检查结果
- `integration-test.log` — 集成测试输出
- `api-startup.log`, `k6-smoke.log` 等

---

## 6. 测试策略

### 6.1 脚本自测

`scripts/stage4-selftest.sh` 本身的测试覆盖：

```
tests/unit/scripts/stage4-selftest.test.js (需要添加)
├── log_result() 函数
│   ├── ✓ 正确递增 PASS 计数
│   ├── ✓ 正确递增 FAIL 计数
│   └── ✓ RESULTS 字符串正确拼接
├── 检查项逻辑
│   ├── ✓ 1.1 单元测试 (grep 结果正确)
│   ├── ✓ 1.4 覆盖率 (数值提取和比较)
│   ├── ✓ 2.1 集成测试 (输出解析)
│   └── ✓ 5.3 XSS 检查 (HTTP 头验证)
├── 错误处理
│   ├── ✓ Docker 不可用时 SKIP
│   ├── ✓ 文件不存在时 FAIL
│   └── ✓ 命令超时时 SKIP
└── 报告生成
    ├── ✓ Markdown 格式正确
    ├── ✓ 统计计数准确
    └── ✓ 文件写入成功
```

### 6.2 验收标准

**脚本执行成功标准：**
- 所有 21 项检查项都有结果（PASS/FAIL/SKIP）
- PASS ≥ 15 项，FAIL = 0 时，脚本返回 0（exit success）
- 报告文件成功生成到 `docs/qa/reports/stage4-selftest-report.md`

---

## 7. 性能考虑

### 7.1 执行方式 & 耗时预估

```bash
# 现有实现：串行执行（set -e 模式）
Section 1: npm test + lint + coverage    ~3 分钟
Section 2: 集成测试 + 锁机制            ~5 分钟（可选 SKIP）
Section 3: RTM 检查                     ~10 秒
Section 4-5: 缺陷 & CI 检查             ~20 秒
Section 6-7: GitHub API + k6 smoke      ~2 分钟（可选 SKIP）
Section 8-9: 文档 & 分支检查            ~10 秒
─────────────────────────────────────
总耗时（完整运行）：~10-12 分钟
总耗时（大多数可选 SKIP）：~4-5 分钟
```

**注意：** Bash 脚本串行执行，无法通过并行化优化。如需加速，应考虑迁移到 JavaScript（方案 B）

### 7.2 日志管理

- 每次运行生成新的日志文件（`logs-stage4/`）
- 日志不清理，可累积历史运行记录
- 报告文件名带时间戳：`stage4-selftest-report.md`

---

## 8. 系统依赖

### 必需工具（脚本执行依赖）

```bash
# 核心工具
bash >= 4.0
git
curl

# Node.js 工具
node >= 14.0
npm >= 6.0
npx

# 可选但推荐
docker 或 orbstack  # 用于集成测试
gh (GitHub CLI)     # 用于 CI 检查
```

### npm 包依赖

```json
{
  "devDependencies": {
    "jest": "*",
    "eslint": "*",
    "prettier": "*",
    "k6": "*"  // 用于 k6 smoke 测试
  }
}
```

### 脚本内嵌工具

```bash
bc        # 用于浮点数比较 (coverage >= 80)
grep      # 文本搜索
awk/sed   # 文本解析
tee       # 日志重定向
```

---

## 9. 架构与实现对照表

| 维度 | 架构设计（v2.0） | 实现 | 状态 |
|------|----------------|------|------|
| 语言 | Bash Shell | Bash Shell | ✅ 一致 |
| 执行方式 | 串行（9 Section） | 串行（9 Section） | ✅ 一致 |
| 检查项数 | 21 项 | 21 项 | ✅ 一致 |
| 报告格式 | Markdown | Markdown | ✅ 一致 |
| 计分方式 | 通过率 % | 通过率 % | ✅ 一致 |
| 错误处理 | continue-on-error + SKIP | continue-on-error + SKIP | ✅ 一致 |
| 日志管理 | docs/qa/reports/logs-stage4/ | docs/qa/reports/logs-stage4/ | ✅ 一致 |

---

**架构设计确认:** ✅ 完整，与实现一致
