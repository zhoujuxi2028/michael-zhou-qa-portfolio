# Phase 7 实现路线图

## 设计文档清单

| 文件 | 内容 | 完成 |
|------|------|------|
| `01-baseline-schema.md` | baseline.json + trend.json + 回归检测 | ✅ |
| `02-grafana-design.md` | Grafana 3 个面板 + 3 个告警规则 | ✅ |
| `03-k6-refactor-design.md` | k6 helper 迁移 + breakpoint + 熔断恢复 | ✅ |
| `04-ci-flow-design.md` | baseline artifact + 对比 + 趋势收集 + 覆盖率 | ✅ |
| `05-implementation-roadmap.md` | 本文 — 任务映射 + 优先级 | ✅ |

---

## Stage 3 任务分解

### P0（必做）

| # | 任务 | 来源 | 工作量 | 验收 |
|----|------|------|--------|------|
| 1 | baseline.json 导出 (k6 → CI artifact) | 01 | 2h | `npm run k6:smoke` 输出 baseline.json |
| 2 | baseline-compare 逻辑 (>50% fail) | 01 + 04 | 1h | 单元测试 100% pass |
| 3 | trend.json 追加机制 (max 30 rows) | 01 + 04 | 1h | 集成测试验证 append + truncate |
| 4 | k6 helper 迁移 (funnel/checkStatus/thinkTime) | 03 | 2h | 3 脚本通过 k6 validate |
| 5 | k6 breakpoint test (capacity extension) | 03 | 3h | capacity.js 检测 breakpoint VU ≥ 50 |
| 6 | k6 熔断恢复验证 (soak.js) | 03 | 2h | soak.js 通过恢复标准验收 |
| 7 | Grafana dashboard JSON (3 panels + 3 alerts) | 02 | 2h | dashboard.json 可导入 Grafana UI |
| 8 | CI workflow baseline-compare job | 04 | 1h | PR 评论显示 baseline-diff.json |
| 9 | CI workflow trend-collect job | 04 | 1h | 趋势图自动更新 |
| 10 | 覆盖率门禁 (nyc ≥80%) | 04 | 1h | CI 显示覆盖率报告，warning 不阻塞 |

**小计**: 16h / ~2 days

---

### P1（可选，portfolio 增强）

| # | 任务 | 来源 | 工作量 |
|----|------|------|--------|
| 11 | Grafana alerting 集成 (webhook 实现) | 02 | 2h |
| 12 | 趋势数据可视化 (前端 dashboard) | 01 | 3h |
| 13 | 性能基线 CI comment 美化 (markdown table) | 04 | 1h |

**小计**: 6h / ~1 day

---

### P2（演示/文档）

| # | 任务 | 来源 | 工作量 |
|----|------|------|--------|
| 14 | 测试用例文档更新 (Phase 7 用例计数) | - | 0.5h |
| 15 | README/CLAUDE.md Phase 7 命令更新 | - | 0.5h |

---

### P3（演示性，非功能）

| # | 任务 | 来源 | 工作量 |
|----|------|------|--------|
| 16 | PERF-SCHED-FR (可选工作流 demo) | 需求 | 2h |

---

## 执行顺序

**Day 1 (P0 Priority)**:
```
1. baseline 导出 + CI job → trend.json 自动化 ✅
2. k6 helper 迁移 + breakpoint/熔断 ✅
3. Grafana dashboard JSON ✅
```

**Day 2 (CI/Coverage)**:
```
4. baseline-compare workflow ✅
5. 覆盖率门禁 + 报告 ✅
6. 文档同步 (test-cases/CLAUDE.md) ✅
```

**Optional (P1+)**:
```
7. Grafana alerting webhook
8. 趋势可视化前端
```

---

## 风险和缓解

| 风险 | 缓解 |
|------|------|
| breakpoint 难以稳定复现 | 使用固定 VU 增量（10/min），多次运行取平均 |
| 熔断恢复定义过严 | 10s 是可调参，可改为 20-30s 如果测试环境波动大 |
| trend.json 长期累积 | 自动截断为最近 30 行，每周 review |
| Grafana dashboard 导入失败 | 提供 SQL 查询和 JSON 备份方案 |

---

## 预期成果

✅ 完整的性能基线检测 + 趋势分析 (P0+P1)
✅ Grafana 可视化 + 告警 (P0+P1)
✅ k6 脚本质量提升 (P0)
✅ CI 流程自动化 (P0)
✅ 覆盖率可见性 (P0)
