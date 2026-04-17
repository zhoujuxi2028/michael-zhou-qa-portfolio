# k6 脚本改动设计

## Helper 函数迁移

**现状**: 3 个 helper 在 `src/helpers.js`
- `funnel(requests)` — 链式请求，错误则 break
- `checkStatus(response, expected)` — 断言响应状态
- `thinkTime(ms)` — 思考延迟

**迁移**: 已在 Phase 7 完全集成到 3 个脚本中，无需单独 helper 文件

| 脚本 | funnel | checkStatus | thinkTime |
|------|--------|-------------|-----------|
| `stress.js` | ✅ 集成 | ✅ 集成 | ✅ 集成 |
| `capacity.js` | ✅ 集成 | ✅ 集成 | ✅ 集成 |
| `soak.js` | ✅ 集成 | ✅ 集成 | ✅ 集成 |

---

## Breakpoint Test 实现

**目的**: 发现系统最大承载能力（与 capacity 对标）

**过程**:
1. 起始 VU=10，每分钟增加 10 VU
2. 持续至 error rate > 5% 或 p95 > 2s
3. 记录 breakpoint VU 和 degradation profile

**两种模式**:

| 模式 | 定义 | k6 threshold | 预期结果 |
|------|------|-------------|----------|
| **Graceful** | p95 缓升，无突跳 | p95 ≤ 1500ms | PASS |
| **Catastrophic** | p95 陡升，error 爆炸 | p95 > 2000ms 或 error > 5% | FAIL（记录降级点） |

**验收**: breakpoint VU ≥ 50（最小业界标准）

---

## 熔断恢复测试

**场景**: 故意引发高负载 → 观察自动恢复 → 验证恢复标准

**恢复定义**（PERF-CHAOS-FR-002）:
```
连续 10 秒内：
  - error_rate < 1%
  - p95_latency < 500ms
→ 判定为"已恢复"
```

**验收标准**:
- 恢复时间 ≤ 60s（从故障注入到满足定义）
- 恢复后持续 2 分钟无再次故障

**test 伪代码**:
```js
// soak.js 内置
1. 0-100s: 正常负载 (VU=50)
2. 100s: 故障注入 (error spike 或延迟翻倍)
3. 100-160s: 监测恢复（每秒采样）
4. 160-280s: 验证稳定性
```

---

## 改动清单

| 文件 | 改动 | 行数 |
|------|------|------|
| `src/scripts/stress.js` | 集成 funnel/checkStatus/thinkTime，移除 require helpers | ~80 |
| `src/scripts/capacity.js` | 同上，添加 breakpoint 检测逻辑 | ~100 |
| `src/scripts/soak.js` | 同上，添加熔断恢复验证，采集 event loop lag | ~150 |
| `src/helpers.js` | 🗑️ 删除（仅保留供旧集成测试引用的 shim） | - |

---

## 文件位置

- 脚本: `src/scripts/stress.js`, `capacity.js`, `soak.js`
- 实现验收: `tests/integration/k6-*.test.js` (3 files)
