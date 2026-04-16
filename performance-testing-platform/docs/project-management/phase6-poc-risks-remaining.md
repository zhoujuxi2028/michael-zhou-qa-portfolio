# Phase 6 剩余风险评估 (Post-PoC)

**当前置信度:** 85% | **剩余风险:** 15%

---

## 🔴 高风险 (影响 Stage 3 进度)

### R1: 9 个脚本迁移的兼容性

**风险:** 脚本 A 迁移成功 ≠ 脚本 B、C、D... 也成功

**具体场景:**

- `load.k6.js` 迁移后 p95 从 2ms 变成 5ms（慢 2.5 倍）
- `soak.k6.js` 的自定义 metrics 迁移后从 11 orders/30s 变成 8 orders（变慢）
- `auth-login.k6.js` 迁移后出现 TypeError (randomProduct() 返回 undefined)

**为什么风险高:**

- 只做了 smoke 回归，没测 load/stress/capacity/soak
- 每个脚本初始化逻辑不同（例如 auth scripts 需要 AUTH_ENABLED）
- 9 个脚本同时改，任何一个失败都要回滚

**缓解方案:**

- 逐脚本迁移 + 对标 before/after 对比（p95 < 10% 差异）
- 为每个脚本写 regression check

**工作量:** Task 2 需要 4-6h（不是原计划的 2h）

---

### R2: Cluster 模式下的 Rate Limiter 风险

**风险:** PoC 只测了 `npm run start:single`，Cluster 模式未验证

**具体数字:**

- 单进程: RATE_LIMIT_MAX=100 → 100 req/s
- Cluster 4 workers: 100 × 4 = 400 req/s 总吞吐（per-worker MemoryStore）

**问题:**

- k6 rate-limit.k6.js 测试在 single 模式通过，Cluster 模式会 fail
- 生产用 Cluster，测试用 single → 不匹配
- CI 运行时自动用 Cluster，rate-limit 测试可能误判

**缓解方案:**

- rate-limit.k6.js 必须同时测 cluster + single
- 或在 rate-limit 中强制 single 模式启动

**工作量:** Task 4 需要额外 1h

---

### R3: Rate Limiter 单元测试 (6 cases)

**风险:** PoC 只做了 k6 集成测试，Jest 单元测试未写

**未覆盖:**

- UT-RL-01: 正常请求 200
- UT-RL-02: 超限返回 429 + error message
- UT-RL-03: 窗口过后恢复 200
- UT-RL-04: RATE_LIMIT_ENABLED=false 时完全禁用
- UT-RL-05: 自定义 windowMs/max 环境变量覆盖默认值
- UT-RL-06: 返回标准 RateLimit headers

**问题:**

- k6 测试不能替代 Jest（不同的框架、不同的 context）
- CI/CD 依赖 Jest 单元测试绿灯
- 中间件集成可能有 bug（例如 headers 计算错误）

**缓解方案:** Task 3 新增 Jest 测试代码生成

**工作量:** Task 3 额外 2h

---

## 🟡 中风险 (延迟交付但可控)

### R4: Breakpoint Test 的具体实现

**风险:** 设计文档有骨架，实现细节不清

**未验证:**

- `ramping-arrival-rate` executor 的递增速度是否合适（30s 递增 100 req/s）
- `abortOnFail` threshold (error_rate > 50%) 是否能正确触发
- 崩溃类型判定逻辑 (graceful vs catastrophic) 的代码实现

**影响:**

- breakpoint.k6.js 可能 run 不到崩溃点（timeout 10min）
- 或者设置不当导致误判崩溃

**缓解方案:** Task 5 实现时需要与设计文档对标

**工作量:** Task 5 实现 + 测试 3-4h

---

### R5: CI/CD 集成缺失

**风险:** generate-summary.sh 写好了，但没有在 CI 中调用

**未定义:**

- `performance-ci.yml` 中何时调用 generate-summary.sh
- 报告如何展示在 GitHub Actions 或 Artifact
- 失败时是否应该让 CI fail

**影响:**

- PR 中看不到执行摘要
- 性能回归无法自动检测

**缓解方案:** 需要更新 CI 工作流

**工作量:** 额外 1-2h

---

### R6: Cluster 模式下 healthCheck 的 abort 行为

**风险:** healthCheck.js 在 setup() 中 fail 会导致整个测试 abort

**场景:**

- 如果 API 在 setup() 阶段返回非 200（例如 startup lag）
- healthCheck 会 `fail()`，整个 k6 脚本 abort
- 在 Cluster 模式下可能导致半启动状态

**缓解方案:** healthCheck 添加 retry 逻辑（3 次尝试）

**工作量:** Task 1 额外 30min

---

## 🟢 低风险 (可在 Task 中解决)

### R7: 文档同步

- CLAUDE.md / README 更新 rate-limit 命令
- 新增环境变量文档
- **工作量:** 30 min

### R8: 数据依赖 (randomProduct)

- funnel 依赖 data/products.csv 有足够记录
- PoC 测试中 products 够用，但生产环境未验证
- **缓解:** 添加 sanity check 验证 CSV 有效性

### R9: ENV 变量向后兼容性

- RATE_LIMIT_ENABLED=false (default) 保证不影响现有流程
- PoC 验证了，但应在 CI 中再验证一次
- **工作量:** 10 min

---

## 📊 风险矩阵

| ID  | 风险                            | 等级 | 概率 | 影响 | 缓解工作量 |
| --- | ------------------------------- | ---- | ---- | ---- | ---------- |
| R1  | 9 脚本迁移兼容性                | 🔴   | 60%  | 高   | 4-6h       |
| R2  | Cluster 模式 Rate Limiter       | 🔴   | 70%  | 高   | 1h         |
| R3  | Jest 单元测试缺失               | 🔴   | 100% | 高   | 2h         |
| R4  | Breakpoint 实现细节             | 🟡   | 40%  | 中   | 3-4h       |
| R5  | CI/CD 集成                      | 🟡   | 50%  | 中   | 1-2h       |
| R6  | healthCheck 在 Cluster 的 abort | 🟡   | 30%  | 中   | 30 min     |
| R7  | 文档同步                        | 🟢   | 100% | 低   | 30 min     |
| R8  | 数据有效性                      | 🟢   | 20%  | 低   | 30 min     |
| R9  | ENV 向后兼容性                  | 🟢   | 10%  | 低   | 10 min     |

**总计缓解工作量:** 11.5 - 15.5h (而非原 Stage 3 的 8-10h 估算)

---

## 置信度更新

### PoC 后置信度分析

| 维度           | PoC 前  | PoC 后  | 变化     |
| -------------- | ------- | ------- | -------- |
| 技术可行性     | 80%     | 90%     | +10%     |
| 设计完整性     | 75%     | 85%     | +10%     |
| 实现复杂度     | 60%     | 70%     | +10%     |
| 集成风险       | 50%     | 65%     | +15%     |
| **综合置信度** | **72%** | **85%** | **+13%** |

### 剩余 15% 风险分布

```
R1 (脚本迁移):  5%  — 高风险，高概率
R2 (Cluster):   3%  — 高风险，高概率
R3 (Jest):      3%  — 高风险，必然发生
R4 (Breakpoint):2%  — 中风险，中概率
R5 (CI/CD):     1%  — 中风险，高概率
R6 (abort):     0.5% — 中风险，低概率
R7-R9 (低风险):0.5% — 低风险
```

---

## 建议

### 方案 A: 继续进入 Stage 3（接受 15% 风险）

**优点:**

- 快速验证完整实现
- PoC 验证已减少 13% 风险
- 风险在可控范围

**缺点:**

- 实际工作量可能超估（11.5-15.5h vs 8-10h）
- R1/R2 可能导致返工

**适用:** 时间充足、容忍返工

---

### 方案 B: 进入 Stage 3 前做 Mini-PoC（再花 2-3h）

**额外验证:**

1. **load.k6.js 迁移** (30min) - 代表性脚本回归测试
2. **Cluster 模式 Rate Limiter** (1h) - 真实环境测试
3. **Jest rate limiter 骨架** (1h) - 验证测试框架兼容性

**结果:** 置信度 → 90%+，风险 → 10%

**适用:** 时间允许、追求高质量

---

### 推荐：方案 B + A 混合

1. **先做 R1/R2/R3 的 mini-PoC** (2.5h)
2. **基于结果调整 Task 估算**
3. **进入 Stage 3 Development**

**最终工作量:** 原 8-10h + PoC 2.5h + 实际偏差 → 12-15h (更可信的估算)

---

你的选择？
