# 性能测试平台 (Performance Testing Platform)

**分类: 性能测试 (Performance Testing)**

专项性能测试平台，展示 k6 负载测试能力：smoke / load / stress / spike 四种模式，Express 目标 API，Grafana + InfluxDB 可观测。

## 目录

- [架构](#架构)
- [测试概览](#测试概览)
- [快速开始](#快速开始)
- [文档](#文档)

---

## 架构

```
k6 脚本 ──→ 目标 API (Express + SQLite)
    │
    └──→ InfluxDB ──→ Grafana Dashboard
```

## 测试概览

| 类型 | 数量 | 工具 |
|------|------|------|
| 单元测试 | 19 | Jest |
| k6 脚本 | 4 | k6 (smoke, load, stress, spike) |

## 快速开始

```bash
cd performance-testing-platform
brew install k6              # 首次需安装
npm install
npm start &                  # 启动目标 API
npm run k6:smoke             # 运行 smoke test
```

### Grafana 可视化

```bash
docker compose up -d         # API + Grafana + InfluxDB
npm run k6:load:influx       # 运行 load test，输出到 InfluxDB
# 打开 http://localhost:3001  → k6 Results dashboard
```

## 文档

| 文档 | 路径 |
|------|------|
| 架构设计 | [docs/architecture/](docs/architecture/) |
| 测试用例 | [docs/test-cases/](docs/test-cases/) |
| 项目管理 | [docs/project-management/](docs/project-management/) |
| 需求文档 | [docs/project-management/requirements.md](docs/project-management/requirements.md) |

属于 [Michael Zhou's QA Portfolio](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio)。

<!-- TODO: 开发完成后补充最终内容 -->
