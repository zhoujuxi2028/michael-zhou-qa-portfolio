# Performance Testing Platform — Risk Assessment（风险清单）

**Branch:** `feature/performance-testing` | **Phase:** 5 — 企业级性能测试模板增强

---

## 风险矩阵

| ID | 类型 | 风险描述 | 影响 | 概率 | 等级 | 关联需求 | 缓解措施 |
|----|------|---------|------|------|------|---------|---------|
| R-01 | 环境 | macOS 系统代理拦截 localhost 请求，导致 JMeter/k6 连接失败 | 高 | 中 | 🔴 | 全局 | `JVM_ARGS` 已内置于 npm scripts；代理白名单已加 `localhost,127.0.0.0/8` |
| R-02 | 环境 | OrbStack/Docker 资源不足，Grafana + InfluxDB 容器启动失败 | 中 | 低 | 🟡 | ENT-DASHBOARD | docker-compose 已配置资源限制；preflight check 验证可用内存 > 2GB |
| R-03 | 技术 | k6 `setup()` HTTP 请求污染全局 metrics，导致 threshold 误判 | 高 | 高 | 🔴 | ENT-CONSISTENCY | Phase 4 已修复：`tags: { test_phase: 'setup' }` + threshold 过滤 `{test_phase:!setup}` |
| R-04 | 技术 | CI baseline artifact 过期（GitHub 默认 90 天），长期趋势数据丢失 | 中 | 中 | 🟡 | ENT-BASELINE | trend.json 追加式存储，不依赖单次 artifact；artifact retention 设为 90 天 |
| R-05 | 技术 | k6 helpers 提取后，现有脚本 import 路径变更导致批量失败 | 中 | 中 | 🟡 | ENT-CONSISTENCY | TDD 先写 helper 单元测试；逐脚本迁移，每次迁移后跑 smoke 验证 |
| R-06 | 技术 | Breakpoint test 将系统压至崩溃，可能导致 DB 文件损坏 | 高 | 中 | 🔴 | ENT-BREAKPOINT | 测试前 `npm run restart:clean`；perf.db 使用 WAL 模式；崩溃后自动重建 DB |
| R-07 | 依赖 | papaparse bundle 兼容 k6：k6 非标准 Node.js，需 webpack/esbuild 打包 | 中 | 中 | 🟡 | ENT-DATA | 评估 k6 内置 CSV 解析 (`open()` + split) 作为 fallback，避免引入打包工具链 |
| R-08 | 依赖 | express-rate-limit 版本与现有 Express 版本不兼容 | 低 | 低 | 🟢 | ENT-RESILIENCE | express-rate-limit v7+ 要求 Express v4.17+；当前项目已满足 |
| R-09 | 环境 | CI cron 触发时无目标服务运行（Portfolio 无持久基础设施） | 高 | 高 | 🔴 | ENT-SCHEDULE | 降级为 P3 示范性 workflow；cron job 内置 `npm start` + 测试 + `npm stop` 自包含流程 |
| R-10 | 技术 | CI `continue-on-error` 遗留导致假绿灯，掩盖真实测试失败 | 高 | 低 | 🟡 | ENT-COVERAGE | Issue #76 已清理；checklist 阶段 4 要求移除所有 workaround 后复验 |
| R-11 | 技术 | Grafana heatmap 面板在 InfluxDB 2.x 需 Flux 查询，与现有 InfluxQL 不一致 | 中 | 中 | 🟡 | ENT-DASHBOARD | 确认 InfluxDB 版本；优先使用 InfluxQL 兼容模式；heatmap 降级为直方图备选 |
| R-12 | 环境 | 本机硬件不支持高并发压测（大数据量 / 万级 VUs） | 高 | 高 | 🔴 | ENT-BREAKPOINT | 已排除大数据量测试；breakpoint 上限设为 10,000 VUs，超出则标记为硬件瓶颈而非应用瓶颈 |

## 风险等级说明

| 等级 | 定义 | 处理策略 |
|------|------|---------|
| 🔴 高 | 影响高 × 概率中/高 | 必须在开发前缓解，阻塞开发 |
| 🟡 中 | 影响中 × 概率中，或影响高 × 概率低 | 需有缓解方案，开发中监控 |
| 🟢 低 | 影响低 × 概率低 | 接受风险，记录即可 |

## 历史风险（已解决）

| ID | 风险 | 解决方式 | 解决日期 |
|----|------|---------|---------|
| H-01 | JMeter 502 Bad Gateway（Java 全局代理） | `JVM_ARGS` 绕过代理 + macOS 白名单 | 2026-04-02 |
| H-02 | k6 setup() metric 污染 | tag 隔离 + threshold 过滤（Issue #69） | 2026-04-03 |
| H-03 | Newman 断言失败被 `continue-on-error` 掩盖 | 移除 workaround + 添加断言计数验证（Issue #72, #76） | 2026-04-03 |
| H-04 | Shell `$(cmd)` 捕获值被 warning 污染 | 输出清洗 + `2>/dev/null` 隔离（Issue #78） | 2026-04-03 |
