# Performance Testing Platform — Risk Assessment（风险清单）

**Branch:** `feature/performance-testing` | **Phase:** 5~7 — 企业级性能测试模板增强

---

## 风险矩阵

| ID | 类型 | 风险描述 | 影响 | 概率 | 等级 | 关联需求 | 缓解措施 |
|----|------|---------|------|------|------|---------|---------|
| R-01 | 环境 | macOS 系统代理拦截 localhost 请求，导致 JMeter/k6 连接失败 | 高 | 中 | 🔴 | 全局 | `JVM_ARGS` 已内置于 npm scripts；代理白名单已加 `localhost,127.0.0.0/8` |
| R-02 | 环境 | OrbStack/Docker 资源不足，Grafana + InfluxDB 容器启动失败 | 中 | 低 | 🟡 | ENT-DASHBOARD | docker-compose 已配置资源限制；preflight check 验证可用内存 > 2GB |
| ~~R-03~~ | ~~技术~~ | ~~k6 `setup()` HTTP 请求污染全局 metrics~~ | — | — | ✅ | ENT-CONSISTENCY | **已解决**: Phase 4 修复 `tags: { test_phase: 'setup' }` + threshold 过滤 (见 H-02) |
| R-04 | 技术 | CI baseline artifact 过期（GitHub 默认 90 天），长期趋势数据丢失 | 中 | 中 | 🟡 | ENT-BASELINE | trend.json 追加式存储，不依赖单次 artifact；artifact retention 设为 90 天 |
| ~~R-05~~ | ~~技术~~ | ~~k6 helpers 提取后 import 路径变更导致批量失败~~ | — | — | ✅ | ENT-CONSISTENCY | **已解决**: Phase 5 helpers 重构完成，smoke/load/stress 全部验证通过 |
| R-06 | 技术 | Breakpoint test 将系统压至崩溃，可能导致 DB 文件损坏 | 高 | 中 | 🔴 | ENT-BREAKPOINT | 测试前 `npm run restart:clean`；perf.db 使用 WAL 模式；崩溃后自动重建 DB |
| R-07 | ~~依赖~~ | ~~papaparse bundle 兼容 k6~~ | — | — | ✅ | ENT-DATA | **已解决**: 改用 `open()+split()` 内置 CSV 解析，完全去除 papaparse CDN 依赖 |
| R-08 | 依赖 | express-rate-limit 版本与现有 Express 版本不兼容 | 低 | 低 | 🟢 | ENT-RESILIENCE | express-rate-limit v7+ 要求 Express v4.17+；当前项目已满足 |
| R-09 | 环境 | CI cron 触发时无目标服务运行（Portfolio 无持久基础设施） | 高 | 高 | 🔴 | ENT-SCHEDULE | 降级为 P3 示范性 workflow；cron job 内置 `npm start` + 测试 + `npm stop` 自包含流程 |
| ~~R-10~~ | ~~技术~~ | ~~CI `continue-on-error` 遗留导致假绿灯~~ | — | — | ✅ | ENT-COVERAGE | **已解决**: Phase 5 CI 报红验证通过 (Run #24001840882)，无 continue-on-error |
| R-11 | 技术 | Grafana heatmap 面板在 InfluxDB 2.x 需 Flux 查询，与现有 InfluxQL 不一致 | 中 | 中 | 🟡 | ENT-DASHBOARD | 确认 InfluxDB 版本；优先使用 InfluxQL 兼容模式；heatmap 降级为直方图备选 |
| R-12 | 环境 | 本机硬件不支持高并发压测（大数据量 / 万级 VUs） | 高 | 高 | 🔴 | ENT-BREAKPOINT | 已排除大数据量测试；breakpoint 上限设为 10,000 VUs，超出则标记为硬件瓶颈而非应用瓶颈 |
| ~~R-13~~ | ~~技术~~ | ~~helpers 重构导致现有 k6 脚本回归~~ | — | — | ✅ | ENT-CONSISTENCY | **已解决**: Phase 5 迁移后 smoke 100% checks pass，CI 绿灯 |
| ~~R-14~~ | ~~技术~~ | ~~express-rate-limit MemoryStore 在 Cluster 模式下 per-worker 隔离~~ | — | — | ✅ | ~~ENT-RESILIENCE~~ | **已解决 (Mini-PoC Cluster诊断)**: Cluster 模式测试通过 (5×200 + 15×429)，per-worker MemoryStore 隔离符合预期。文档已补充：生产需 Redis；测试/演示用 single 模式或接受 per-worker 限制 |
| R-15 | 技术 | breakpoint test 持续递增导致系统崩溃后进程残留 | 中 | 中 | 🟡 | ENT-BREAKPOINT | maxDuration 10min 安全阀 + abortOnFail (error>50%) + preflight 清理孤立进程 |
| R-16 | 技术 | generate-summary.sh 依赖 k6 JSON output 格式，k6 升级后可能 break | 低 | 中 | 🟢 | ENT-REPORT | jq 字段存在性检查，缺失字段输出 warning 而非 crash |
| **R-17** | **技术** | **9 个 k6 脚本迁移（load/stress/capacity/soak/auth）后兼容性风险** | **高** | **高** | **🔴** | **ENT-CONSISTENCY** | **PoC 只验证了 smoke，需逐脚本对标 before/after 回归测试；p95 差异 < 10% 时方可合入** |
| **R-18** | **技术** | **Rate Limiter Jest 单元测试缺失（6 cases: 正常请求/超限/恢复/开关/环变/headers）** | **高** | **高** | **🔴** | **ENT-RESILIENCE** | **Task 3 强制实现 UT-RL-01~06，必须通过 Jest 才能进 CI** |
| **R-19** | **集成** | **generate-summary.sh 脚本完成，但 performance-ci.yml 未集成** | **中** | **中** | **🟡** | **ENT-REPORT** | **Task 6 完成后更新 CI workflow；明确何时调用报告脚本 + 如何展示结果** |
| **R-20** | **技术** | **healthCheck 在 setup() 中 fail 导致 Cluster 模式下半启动状态** | **中** | **中** | **🟡** | **ENT-CONSISTENCY** | **healthCheck.js 添加 retry 逻辑（3 次尝试，间隔 1s）避免瞬时故障误判** |
| **R-21** | **技术** | **Breakpoint test ramping-arrival-rate 递增策略/abort threshold 实现细节未验证** | **中** | **中** | **🟡** | **ENT-BREAKPOINT** | **Task 5 实现时需与设计文档对标；abort (error>50%) 应能正确触发；maxDuration 10min 安全阀** |

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
| H-05 | k6 `open()` 路径解析不一致（函数内 vs 模块级） | 函数调用用 `../../`，模块级用 `../../../`；k6 smoke 自测验证 100% pass | 2026-04-05 |
| H-06 | papaparse CDN 依赖导致离线环境 k6 脚本失败 | 改用 `open()+split()` 内置解析，彻底移除 CDN 依赖 (R-07) | 2026-04-05 |
| H-07 | CSV products.csv ID 超出数据库种子范围导致 404 | 对齐 CSV ID (1~5) 与数据库种子数据 | 2026-04-05 |
| H-08 | k6 helpers 重构后 import 路径批量失败 (R-05) | Phase 5 TDD + 逐脚本迁移 + smoke 验证通过 | 2026-04-05 |
| H-09 | CI `continue-on-error` 假绿灯 (R-10) | Phase 5 CI 报红验证通过 (Run #24001840882) | 2026-04-05 |
| H-10 | helpers 迁移导致 k6 脚本回归 (R-13) | Phase 5 迁移后 smoke 100% pass + CI 绿灯 | 2026-04-05 |
| H-11 | express-rate-limit Cluster 模式 500 错误 (R-14) | 诊断发现无 500 错误，429 响应正常；per-worker MemoryStore 隔离符合预期 (Mini-PoC) | 2026-04-14 |
