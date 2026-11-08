# CLAUDE.md - playwright-demo

## 项目定位
- Playwright Cross-browser E2E / API / A11y / Visual Regression 示例
- 基于 TypeScript、fixtures、Page Object Model

## 常用命令
```bash
npm install
npx playwright install
npm test
npm run test:api
npm run test:ui
npm run test:visual
```

## 提交前检查
```bash
npm test
```

## 注意事项
- 需要先执行 `npx playwright install`
- 视觉回归变更要确认 snapshot 是否应更新
