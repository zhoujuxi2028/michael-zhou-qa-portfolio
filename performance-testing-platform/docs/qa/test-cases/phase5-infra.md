# Phase 5 测试用例 — 基础设施 Helper (#85)

## 测试策略

Phase 5 新增 3 个 helper 模块（env loader、CSV loader、profile parser），采用双模块策略：
- **Node.js 模块** (`src/utils/`) — 纯解析逻辑，Jest 单元测试覆盖
- **k6 helpers** (`tests/performance/helpers/`) — 内联重新实现，通过 k6 smoke run 手动验证

## Env Loader (`tests/unit/helpers/env.test.js`)

| ID | 测试用例 | 预期结果 |
|----|---------|---------|
| UT-ENV-01 | 解析含 BASE_URL, AUTH_ENABLED, PORT 的 env 文件 | 返回 3 个 key-value 对 |
| UT-ENV-02 | 跳过 `#` 开头的注释行 | 注释不出现在结果中 |
| UT-ENV-03 | 跳过空行和纯空白行 | 空行不产生 key |
| UT-ENV-04 | 输入 null/undefined 返回空对象 | `{}` |
| UT-ENV-05 | 值中包含 `=` (如 `DB_URL=postgres://host?opt=1`) | 仅按第一个 `=` 分割 |
| UT-ENV-06 | key/value 前后有空白 | 自动 trim |
| UT-ENV-07 | `getEnvConfig()` 文件不存在时返回 DEFAULTS | 包含默认 BASE_URL, AUTH_ENABLED, PORT |

## CSV Loader (`tests/unit/helpers/data.test.js`)

| ID | 测试用例 | 预期结果 |
|----|---------|---------|
| UT-DATA-01 | 解析含 header 行的 CSV 为对象数组 | `[{col1: val1, col2: val2}, ...]` |
| UT-DATA-02 | 空字符串输入 | 返回 `[]` |
| UT-DATA-03 | null/undefined 输入 | 抛出描述性错误 |
| UT-DATA-04 | 仅 header 行无数据行 | 返回 `[]` |
| UT-DATA-05 | `validateColumns` 全部必需列存在 | 不抛错 |
| UT-DATA-06 | `validateColumns` 缺少必需列 | 抛出含缺失列名的错误 |
| UT-DATA-07 | 解析 products.csv 格式 (id, name, price, category) | 正确解析 4 列 |
| UT-DATA-08 | 解析 users.csv 格式 (username, password, role) | 正确解析 3 列 |

## Profile Parser (`tests/unit/helpers/profile.test.js`)

| ID | 测试用例 | 预期结果 |
|----|---------|---------|
| UT-PROF-01 | 解析含 stages + thresholds 的有效 profile | 返回完整 profile 对象 |
| UT-PROF-02 | 无效 JSON 字符串 | 抛出 "Invalid profile JSON" 错误 |
| UT-PROF-03 | 缺少 stages 且缺少 vus | 抛出错误 |
| UT-PROF-04 | stages 为空数组 `[]` | 抛出 "must not be empty" 错误 |
| UT-PROF-05 | stage 缺少 duration 或 target | 抛出含 stage index 的错误 |
| UT-PROF-06 | 缺少 thresholds 对象 | 抛出错误 |
| UT-PROF-07 | 返回完整 options 对象 (stages + thresholds) | 可直接赋值给 `export const options` |
| UT-PROF-08 | 保留可选字段 (如 `setupTimeout`) | 不丢失额外字段 |
| UT-PROF-09 | `vus + duration` 模式 (无 stages) | 返回 `{vus, duration, thresholds}`，不报错 |

## k6 集成验证 (手动)

| ID | 验证项 | 命令 | 预期 |
|----|--------|------|------|
| K6-INT-01 | env loader 默认 | `k6 run tests/performance/smoke.k6.js` | localhost 正常运行 |
| K6-INT-02 | env loader staging | `k6 run --env ENV=staging tests/performance/smoke.k6.js` | 加载 staging.env 的 BASE_URL |
| K6-INT-03 | CSV 数据加载 | `k6 run tests/performance/load.k6.js` | 商品 ID 从 CSV 随机选取 |
| K6-INT-04 | Profile 加载 | `k6 run tests/performance/smoke.k6.js` | stages/thresholds 匹配 smoke.json |
| K6-INT-05 | CSV 缺失报错 | 移走 products.csv 后运行 | 明确的初始化错误 |
