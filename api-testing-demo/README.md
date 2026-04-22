# API Testing Demo

Postman + Newman API 自动化示例，配套 `json-server` 模拟服务与环境校验脚本。

## 快速开始

```bash
cd api-testing-demo
npm install
npm run validate
npm run server
```

新开一个终端执行：

```bash
cd api-testing-demo
npm test
```

## 常用命令

```bash
npm run validate          # 校验 collection / environment 文件
npm run server            # 启动本地 json-server（3001）
npm run server:staging    # 启动 staging mock 服务（3002）
npm test                  # dev 环境完整回归
npm run test:smoke        # 冒烟测试
npm run test:staging      # staging 环境测试
npm run test:prod         # prod 环境只读验证
npm run test:data-driven  # CSV 数据驱动测试
npm run clean:all         # 清理报告与日志
```

## 目录结构

```text
api-testing-demo/
├── collections/     # Postman collections
├── environments/    # Postman environments
├── data/            # 数据驱动测试数据
├── scripts/         # 校验脚本
├── reports/         # Newman 报告输出
├── logs/            # 运行日志
├── db.json          # json-server 数据源
└── package.json
```

## 说明
- 默认 mock 服务端口：`3001`
- staging mock 服务端口：`3002`
- 根目录 Husky 会调用 `npm --prefix api-testing-demo run validate`
