# Stage 4 自测脚本 - 功能规格

**版本:** 1.0  
**日期:** 2026-04-15  
**文件:** `scripts/stage4-verify.js`

---

## 1. 概述

Stage 4 自测脚本是一个 Node.js 命令行工具，用于自动化验证 Phase 6 Stage 4 的所有交付物。脚本执行 8 大类 21 个检查项，生成 Markdown 报告，并提供总体评分。

### 调用方式

```bash
node scripts/stage4-verify.js              # 本地运行
npm run stage4:verify                      # npm script

# 可选参数（预留）
node scripts/stage4-verify.js --fail-fast  # 遇到失败立即停止
node scripts/stage4-verify.js --verbose    # 详细输出
```

### 输出

```
报告文件: reports/stage4-verify-20260415-123456.md
终端输出: 彩色进度条 + 最终评分
```

---

## 2. 检查项详细规格

### 2.1 前置条件检查 (Preflight)

**目的:** 确保脚本运行环境合法

| 检查     | 命令                        | 期望                          | 失败处理            |
| -------- | --------------------------- | ----------------------------- | ------------------- |
| 当前分支 | `git branch --show-current` | `feature/performance-testing` | ❌ 报错退出         |
| 必需工具 | `which node npm git`        | 都存在                        | ⚠️ 显示缺失工具列表 |
| npm 依赖 | `npm ls`                    | 无重大错误                    | ⚠️ 显示警告         |

---

### 2.2 代码质量检查

#### 2.2.1 单元测试

**命令:**

```bash
npm test
```

**检查内容:**

- 测试通过数: 应为 148/148
- 执行耗时: 应为 55s ± 10s
- 超时: 5 分钟

**期望结果:**

```
Test Suites: 17 passed, 17 total
Tests:       148 passed, 148 total
Time:        55.5s
```

**失败标准:**

- 任何测试失败 → ❌ FAIL
- 耗时超过 5 分钟 → ⚠️ TIMEOUT

---

#### 2.2.2 ESLint 检查

**命令:**

```bash
npx eslint . --fix  # 自动修复
```

**检查内容:**

- Lint 错误数: 应为 0
- 已修复文件数: 记录在报告中

**期望结果:**

```
✓ 0 errors
✓ 0 warnings
Files fixed: [列表]
```

**失败标准:**

- 存在无法自动修复的错误 → ❌ FAIL

---

#### 2.2.3 Prettier 格式检查

**命令:**

```bash
npx prettier --write .  # 自动格式化
```

**检查内容:**

- 已格式化文件数: 记录在报告中
- 非阻塞警告: CLAUDE.md, architecture.md 等

**期望结果:**

```
✓ All files formatted
Files modified: [列表]
```

---

#### 2.2.4 代码覆盖率

**命令:**

```bash
npm test -- --coverage
```

**检查内容:**

- Statements: ≥ 80% (实际 ~92.76%)
- Branches: ≥ 70% (实际 ~91.26%)
- Functions: ≥ 80% (实际 ~97.95%)
- Lines: ≥ 80% (实际 ~94.46%)

**期望结果:**

```
Statements: 92.76% ✓ (≥80%)
Branches:   91.26% ✓ (≥70%)
Functions:  97.95% ✓ (≥80%)
Lines:      94.46% ✓ (≥80%)
```

**失败标准:**

- 任何指标低于阈值 → ⚠️ WARNING

---

### 2.3 集成测试

**命令:**

```bash
bash scripts/integration-test.sh
```

**前置检查:**

```bash
docker ps 2>/dev/null || orbstack ls
```

**处理逻辑:**

- Docker/OrbStack 运行中 → 执行集成测试
- Docker/OrbStack 未启动 → SKIP，继续其他检查

**检查内容:**

- 总用例数: 31
- 通过数: 应为 29 (SKIP 2 项为计划内)
- 失败数: 应为 0

**期望结果:**

```
Total: 31 | ✅ Pass: 29 | ❌ Fail: 0 | ⏭️ Skip: 2
```

**失败标准:**

- Fail > 0 → ❌ FAIL + 显示失败项
- Fail = 0, Pass = 29 → ✅ PASS

---

### 2.4 需求追溯 (RTM)

**命令:**

```bash
grep "✅" docs/qa/rtm.md | wc -l
```

**检查内容:**

- Phase 6 需求覆盖: 应为 14/14
- 全项目需求覆盖: 应为 76/76

**期望结果:**

```
Phase 6: 14/14 (100%) ✓
Total:   76/76 (100%) ✓
```

**失败标准:**

- 任何覆盖率 < 100% → ⚠️ WARNING

---

### 2.5 风险管理

**命令:**

```bash
grep -E "R-22|R-23|R-24" docs/project-management/risks.md
grep -E "H-14|H-15|H-16|H-17|H-18" docs/project-management/risks.md
```

**检查内容:**

- Phase 6 新增风险 R-22, R-23, R-24 状态
- 历史风险记录 H-14 ~ H-18 是否存在

**期望结果:**

```
R-22: ✅ 已解决
R-23: ✅ 已解决
R-24: ✅ 已解决
H-14 ~ H-18: ✅ 已记录
```

---

### 2.6 GitHub Issue & CI

#### 2.6.1 gh CLI 自动安装

**逻辑:**

```bash
which gh || (brew install gh || apt-get install gh)
```

**处理:**

- gh 已存在 → 继续
- gh 不存在 → 尝试安装 (brew for macOS, apt for Linux)
- 安装失败 → ⚠️ WARNING，继续其他检查

---

#### 2.6.2 Issue #110 验证

**命令:**

```bash
gh issue view 110 --json title,labels,state
```

**检查内容:**

- Issue 存在与否
- 标签: `bug/security`, `performance-testing`, `phase-6`, `test-gap`
- 状态: open

**期望结果:**

```
Issue #110: Helmet v8 X-XSS-Protection header disabled
Labels: bug/security, performance-testing, phase-6, test-gap
State: open
```

**失败处理:**

- 网络错误 → ⚠️ SKIP (无网络)
- Issue 不存在 → ⚠️ NOT FOUND

---

#### 2.6.3 CI 最新运行状态

**命令:**

```bash
gh run list --branch feature/performance-testing --limit 1
```

**检查内容:**

- 最新 workflow run 状态
- Workflow 名称: performance-ci.yml
- 状态: success

**期望结果:**

```
Workflow: performance-ci.yml
Status: success ✓
Latest run: 2026-04-15 12:30:45
```

---

### 2.7 手工验证（启动服务）

#### 2.7.1 Rate Limiter 功能

**启动服务:**

```bash
RATE_LIMIT_ENABLED=true npm start &
SERVER_PID=$!
sleep 2  # 等待服务启动
```

**测试逻辑:**

```bash
for i in {1..5}; do
  curl -i http://localhost:3000/api/products
  sleep 0.1
done
```

**检查内容:**

- 前 3 次请求: HTTP 200 + RateLimit-\* headers
  - RateLimit-Limit
  - RateLimit-Remaining
  - RateLimit-Reset
- 第 4-5 次请求: HTTP 429 (Too Many Requests)

**期望结果:**

```
Request 1-3: 200 OK + 3 RateLimit headers ✓
Request 4-5: 429 Too Many Requests ✓
```

**失败标准:**

- 响应码错误 → ❌ FAIL
- Headers 缺失 → ❌ FAIL

**清理:**

```bash
kill $SERVER_PID
wait $SERVER_PID 2>/dev/null
```

---

#### 2.7.2 k6 Smoke 测试

**命令:**

```bash
npm run k6:smoke
```

**解析规则:**

```regex
✓ http_req_duration p95 < 500ms
✓ error rate < 1%
```

**检查内容:**

- p95 延迟: < 500ms
- 错误率: < 1%
- 所有 checks 通过

**期望结果:**

```
✓ http_req_duration p95 < 500ms
✓ error_rate < 1%
✓ All checks passed
```

**超时:** 5 分钟

---

#### 2.7.3 generate-summary.sh 验证

**创建测试 fixture:**

```bash
cat > /tmp/test-output.json << 'EOF'
{"type":"Point","data":{"time":1713100000,"value":250},"metric":"http_req_duration"}
{"type":"Point","data":{"time":1713100001,"value":300},"metric":"http_req_duration"}
EOF
```

**运行脚本:**

```bash
bash scripts/generate-summary.sh /tmp/test-output.json
```

**检查内容:**

- 输出文件是否存在: `reports/k6-summary.md`
- 文件大小: > 100 bytes
- 包含关键信息: p95, error rate, throughput

**期望结果:**

```
✓ k6-summary.md generated (456 bytes)
✓ Contains p95, error_rate, throughput metrics
```

---

### 2.8 Git 分支和提交

**检查内容:**

- 当前分支: `feature/performance-testing`
- 最近 20 条提交历史
- Phase 6 相关提交数量

**命令:**

```bash
git branch --show-current
git log --oneline -20
git log --oneline | grep -E "phase.6|Stage.4" | wc -l
```

**期望结果:**

```
Current branch: feature/performance-testing ✓
Recent commits: [列表]
Phase 6 commits: 15 ✓
```

---

## 3. 报告格式规范

### 报告文件名

```
reports/stage4-verify-YYYYMMDD-HHMMSS.md
```

### Markdown 结构

```markdown
# Stage 4 自测报告

日期: 2026-04-15 12:30:45  
分支: feature/performance-testing  
耗时: 8m 42s

---

## 1. 代码质量检查

### 1.1 单元测试

| 项目   | 状态       | 详情  |
| ------ | ---------- | ----- |
| 通过率 | ✅ 148/148 | 55.5s |

### 1.2 ESLint

| 项目     | 状态        | 详情           |
| -------- | ----------- | -------------- |
| 检查结果 | ✅ 0 errors | fixed: 2 files |

...更多检查项...

## 2. 集成测试

...

## 总体评分

| 维度       | 得分           |
| ---------- | -------------- |
| 代码质量   | 9/10           |
| 集成测试   | 9/10           |
| 文档完整性 | 10/10          |
| 风险管理   | 10/10          |
| **总体**   | **9.25/10** ✅ |

---

**验收结论:** 通过 ✅
```

---

## 4. 错误处理规范

### 4.1 类型定义

```javascript
{
  status: 'PASS' | 'FAIL' | 'SKIP' | 'WARN',
  message: string,
  details: any,
  duration: number // ms
}
```

### 4.2 错误场景

| 场景          | 处理                            |
| ------------- | ------------------------------- |
| 命令执行失败  | 捕获 stderr，显示错误消息，继续 |
| 超时          | kill 进程，记录 TIMEOUT，继续   |
| 网络错误 (gh) | SKIP，继续                      |
| Docker 未启动 | SKIP 集成测试，继续             |
| 权限不足      | 显示错误，ask 用户提权          |

### 4.3 重试机制

- gh 命令失败: 重试 1 次
- 网络命令超时: 无重试 (直接 SKIP)
- npm 命令: 无重试 (fail-fast)

---

## 5. 计分规则

### 总分计算

```
总分 = (各维度得分 × 权重) / 总权重

权重分配:
- 代码质量: 30% (eslint, prettier, coverage)
- 集成测试: 25% (27/31 baseline)
- 需求追溯: 15% (RTM 覆盖)
- 风险管理: 10% (风险记录)
- 文档完整: 10% (docs)
- Git 流程: 10% (提交规范)
```

### 及格线

- ≥ 8.5/10: ✅ **PASS** - 可进入 Stage 5
- 7.0-8.4: ⚠️ **CONDITIONAL** - 需修复，重新验收
- < 7.0: ❌ **FAIL** - 不允许进入 Stage 5

---

## 6. 日志输出规范

### 终端彩色输出

```
[✓] Code quality checks PASS (2m 30s)
  ├─ npm test: 148/148 ✓
  ├─ ESLint: 0 errors ✓
  ├─ Prettier: 2 files formatted ✓
  └─ Coverage: 92.76% ✓

[✓] Integration tests PASS (3m 15s)
  └─ 29/31 PASS, 2 SKIP

[⚠] Rate Limiter WARN (manual verification)
  └─ Headers found: 3/3 ✓

---
📊 Overall Score: 9.25/10 ✅ PASS
📄 Report saved: reports/stage4-verify-20260415-123456.md
```

---

## 7. 配置项

所有检查项的阈值和参数（硬编码）：

```javascript
const CONFIG = {
  tests: {
    timeout: 5 * 60 * 1000, // 5 分钟
    threshold: {
      statements: 0.8,
      branches: 0.7,
      functions: 0.8,
      lines: 0.8,
    },
  },
  integration: {
    timeout: 8 * 60 * 1000, // 8 分钟
    expectedPass: 29,
    expectedTotal: 31,
  },
  k6: {
    timeout: 5 * 60 * 1000,
    p95_threshold: 500, // ms
    error_rate_threshold: 0.01, // 1%
  },
  rateLimit: {
    threshold: 3, // 3 reqs
    window: 1000, // 1 second
  },
};
```

---

**功能规格确认:** ✅ 完整，准备编码
