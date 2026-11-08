# Microservice Testing Platform

**Category: 平台测试 (Platform Testing)**

E-commerce order microservice testing platform demonstrating multi-layer testing: unit, contract, integration, E2E, performance, and observability.

## Architecture

```
services/
├── order-service/      Express :3003, SQLite, Redis Pub
├── inventory-service/  Express :3004, SQLite
└── payment-service/    Express :3005, SQLite, Redis Sub
```

## Test Layers (101 tests)

| Layer | Tests | Tool |
|-------|:-----:|------|
| Unit | 46 | Jest |
| Contract | 15 | JSON Schema (ajv) |
| Integration | 20 | Supertest |
| E2E | 10 | Supertest (cross-service) |
| Performance | 5 scripts | k6 |
| Observability | 10 | Jest |

## Quick Start

```bash
npm install
npm run test:all           # All 101 tests
npm run docker:up          # Start all services + Redis
```

## Documentation

| Doc | Path |
|-----|------|
| Architecture | [docs/architecture/](docs/architecture/) |
| Test Cases | [docs/test-cases/](docs/test-cases/) |
| Project Management | [docs/project-management/](docs/project-management/) |

Part of [Michael Zhou's QA Portfolio](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio).
