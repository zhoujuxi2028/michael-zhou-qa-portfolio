# CLAUDE.md - performance-testing-platform

## 项目定位

- k6 + JMeter 双引擎性能测试平台
- 包含 Express 目标 API、Grafana / InfluxDB 可观测、容量与限流场景

## 常用命令

```bash
npm install
npm run lint
npm test
npm run k6:smoke
npm run jmeter:smoke
bash scripts/integration-test.sh
```

## 提交前检查

```bash
npm run lint
npm run format:check
npm run test:coverage
npm run k6:smoke
```

## 注意事项

- API 默认端口 `3000`，Grafana `3010`，InfluxDB `8086`
- 集成测试有锁：`/tmp/integration-test.lock`；若异常残留可执行 `rm -rf /tmp/integration-test.lock`
- 锁机制与排障说明见 `README.md`
- JMeter 正式运行前优先执行 `npm run jmeter:dryrun`
- CI 相关改动不要用 `|| true` 或 `continue-on-error` 掩盖失败，详细规则见 `../docs/dev-process-checklist.md`
