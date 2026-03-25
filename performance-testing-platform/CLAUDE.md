# CLAUDE.md - 性能测试平台 (Performance Testing Platform)

## 目录

- [项目说明](#项目说明)
- [快速开始](#快速开始)
- [项目结构](#项目结构)

---

## 项目说明

**分类: 性能测试**

专项性能测试平台：k6 负载测试 (smoke/load/stress/spike) + Express 目标 API + Grafana + InfluxDB 可观测。

**所属**: Michael Zhou QA Portfolio (`michael-zhou-qa-portfolio`)

## 快速开始

```bash
cd performance-testing-platform
brew install k6              # 首次需安装
npm install
npm start &                  # 启动目标 API (port 3000)
npm run k6:smoke             # 运行 smoke test
```

## 项目结构

```
performance-testing-platform/
├── src/                     # 目标 API (Express + SQLite)
│   ├── routes/              # products, orders, health
│   ├── middleware/           # metrics tracking
│   ├── db/                  # SQLite in-memory
│   └── utils/               # delay simulation
├── tests/
│   ├── unit/                # Jest 单元测试 (19 tests)
│   └── performance/         # k6 脚本 (smoke, load, stress, spike)
├── grafana/                 # Dashboard + provisioning
├── docker-compose.yml       # API + Grafana + InfluxDB
└── docs/                    # 标准文档结构
```

<!-- TODO: 开发完成后补充完整内容（测试层级表、CI 工作流、约定规范等） -->
