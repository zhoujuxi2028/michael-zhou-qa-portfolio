# Phase 6 测试用例 — 测试能力扩展 (#86)

## Rate Limiter 单元测试 (`tests/unit/middleware/rateLimiter.test.js`)

| 用例 ID | 测试 | 预期 |
|---------|------|------|
| UT-RL-01 | 正常请求 (未超限) | 200, 响应正常 |
| UT-RL-02 | 超过 max 请求数后 | 429, `{ error: "Too many requests..." }` |
| UT-RL-03 | 窗口过后恢复 | 200, 计数重置 |
| UT-RL-04 | RATE_LIMIT_ENABLED=false | 中间件不加载，无 429 |
| UT-RL-05 | 自定义 windowMs + max | 环境变量覆盖默认值 |
| UT-RL-06 | 返回标准 RateLimit headers | `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` |

## k6 限流测试 (`tests/performance/rate-limit.k6.js`)

| 用例 ID | 场景 | VUs | 预期 |
|---------|------|-----|------|
| K6-RL-01 | 正常流量 (低于限额) | 5 | 全部 200, 0 个 429 |
| K6-RL-02 | 超限 burst | 200 | 部分 429, error message 正确 |
| K6-RL-03 | 窗口恢复 | 5 | burst 后等待窗口过期，恢复 200 |
| K6-RL-04 | 熔断恢复 | 500→0→10 | 持续超载 → 停止 → 测量恢复时间 |

## Breakpoint 测试 (`tests/performance/breakpoint.k6.js`)

| 用例 ID | 场景 | 预期 |
|---------|------|------|
| K6-BP-01 | 递增到崩溃 | 输出崩溃点 RPS + 当时 p95/error rate |
| K6-BP-02 | 崩溃类型分类 | handleSummary 输出 graceful/catastrophic |
| K6-BP-03 | maxDuration 安全阀 | 10min 内未崩溃则正常结束 |

## k6 Helpers 迁移验证

| 用例 ID | 验证项 | 命令 | 预期 |
|---------|--------|------|------|
| K6-MIG-01 | load.k6.js 使用 funnel helper | `npm run k6:smoke` | p95/error 与迁移前一致 (偏差 <10%) |
| K6-MIG-02 | stress.k6.js 使用 funnel helper | 检查 import 语句 | 无内联漏斗代码 |
| K6-MIG-03 | auth 脚本统一 checkStatus | `grep 'check(' tests/performance/auth-*.k6.js` | 无直接 check() 调用 |
| K6-MIG-04 | 全脚本 thinkTime 统一 | `grep 'sleep(' tests/performance/*.k6.js` | 仅在 thinkTime.js 中有 sleep() |

## 执行摘要报告

| 用例 ID | 验证项 | 命令 | 预期 |
|---------|--------|------|------|
| K6-RPT-01 | 生成 Markdown 摘要 | `npm run generate-summary` | reports/k6-summary.md 存在 |
| K6-RPT-02 | SLA 判定正确 | 检查输出 | p95 < 500ms → ✅, error < 1% → ✅ |
| K6-RPT-03 | Top 5 慢接口 | 检查输出 | 按 p95 排序，含 endpoint 名 |
| K6-RPT-04 | 无 JSON 输入时报错 | 不传参数 | 输出 usage 提示，exit 1 |
