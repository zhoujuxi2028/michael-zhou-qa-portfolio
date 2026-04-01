# CLAUDE.md - 性能测试平台 (Performance Testing Platform)

## 项目说明

**分类: 性能测试** | k6 + JMeter 双引擎负载测试 + Express Cluster (多核) + Grafana + InfluxDB 可观测

> **Cluster 模式:** `npm start` (多核) | `npm run start:single` (单进程)

## 测试对象

电商 API 漏斗模型: `GET /api/products` (60%) + `GET /api/products/:id` (30%) + `POST /api/orders` (10%)

> `/health` 是运维心跳，不在性能测试范围。

## 快速命令

```bash
npm install && npm start &   # 启动目标 API — Cluster 模式 (port 3000)
npm run start:single &       # 启动目标 API — 单进程模式
npm test                     # 单元测试 (23 tests)
npm run k6:smoke             # k6 smoke test
npm run jmeter:smoke         # JMeter smoke test
npm run lint                 # ESLint
```

> **服务管理:** `scripts/server.sh` 统一管理服务生命周期 (start/stop/restart) + 系统指标采集 (collect)，自动检测端口占用：已运行则跳过，被其他进程占用则报错。

> 完整命令列表见 [README.md](README.md#npm-脚本)

## CI 工作流

`performance-ci.yml` — lint → unit-test → k6 smoke gate + JMeter smoke gate (双引擎并行门禁)

触发: push/PR to `main` 或 `feature/performance-testing`

## SLA 定义

| 指标 | 阈值 | 含义 |
|------|------|------|
| p95 | < 500ms | 95% 请求延迟在可接受范围 |
| error rate | < 1% | 几乎无错误 |

## 约定规范

- **TDD**: 先写失败测试，再写实现
- **JMeter 参数外置**: `.jmx` 保持最小化，参数放 `config/*.properties`
- **覆盖率目标**: statements ≥ 80%, branches ≥ 70%, functions ≥ 80%, lines ≥ 80%

## Phase 规划

| Phase | 内容 | 状态 |
|-------|------|------|
| 1 | k6 + JMeter 双引擎 (smoke/load/stress/spike) | ✅ Done |
| 2 | 系统指标采集 + 容量测试 + 瓶颈定位 (#54) | 🔄 In progress |
| 3 | Soak Test / Custom Metrics / AlertManager | Planned |
