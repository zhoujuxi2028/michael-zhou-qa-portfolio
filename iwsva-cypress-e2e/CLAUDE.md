# CLAUDE.md - iwsva-cypress-e2e

## 项目定位
- IWSVA Web 管理界面的 Cypress E2E 示例
- 以 kernel version 校验为核心场景

## 常用命令
```bash
npm install
cp cypress.env.json.example cypress.env.json
npm test
npm run test:all
npm run cypress:open
```

## 提交前检查
```bash
npm test
```

## 注意事项
- `cypress.env.json` 含环境凭据，只保留本地，不提交
- 默认目标为 IWSVA HTTPS 页面，证书与连通性需先确认
