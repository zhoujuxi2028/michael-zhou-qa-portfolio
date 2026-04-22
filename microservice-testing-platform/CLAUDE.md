# CLAUDE.md - microservice-testing-platform

## 项目定位
- 电商订单微服务测试平台
- 覆盖 unit、contract、integration、E2E、observability 与 Docker 场景

## 常用命令
```bash
npm install
npm run lint
npm run test:all
npm run test:coverage
npm run docker:up
```

## 提交前检查
```bash
npm run lint
npm run format:check
npm run test:all
```

## 注意事项
- 服务端口主要使用 `3003-3005`，Redis 使用 `6379`
- E2E / Docker 场景依赖 `docker compose`
