# CLAUDE.md - api-testing-demo

## 项目定位
- Postman / Newman API 自动化示例
- 使用 `json-server` 提供本地 mock API

## 常用命令
```bash
npm install
npm run validate
npm run server
npm test
npm run test:smoke
```

## 提交前检查
```bash
npm run validate
npm test
```

## 注意事项
- 本地端口：`3001`；staging mock：`3002`
- `reports/`、`logs/` 属于产物目录，避免把新生成文件提交到仓库
