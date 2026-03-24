# Performance Testing Platform

**Category: 性能测试 (Performance Testing)**

Dedicated performance testing platform demonstrating k6 load testing with 4 patterns (smoke, load, stress, spike), Express target API, and Grafana + InfluxDB observability.

## Architecture

```
k6 Scripts ──→ Target API (Express + SQLite)
    │
    └──→ InfluxDB ──→ Grafana Dashboard
```

## Test Summary

| Type | Count | Tool |
|------|-------|------|
| Unit Tests | TBD | Jest |
| k6 Scripts | 4 | k6 (smoke, load, stress, spike) |

## Quick Start

```bash
cd performance-testing-platform
brew install k6              # First time only
npm install
npm start &                  # Start target API
npm run k6:smoke             # Run smoke test
```

### With Grafana Dashboard

```bash
docker compose up -d         # API + Grafana + InfluxDB
npm run k6:load:influx       # Run with InfluxDB output
# Open http://localhost:3001  → k6 Results dashboard
```

## Documentation

| Doc | Path |
|-----|------|
| Architecture | [docs/architecture/](docs/architecture/) |
| Test Cases | [docs/test-cases/](docs/test-cases/) |
| Project Management | [docs/project-management/](docs/project-management/) |
| Requirements | [docs/project-management/requirements.md](docs/project-management/requirements.md) |

Part of [Michael Zhou's QA Portfolio](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio).

<!-- TODO: finalize after development complete -->
