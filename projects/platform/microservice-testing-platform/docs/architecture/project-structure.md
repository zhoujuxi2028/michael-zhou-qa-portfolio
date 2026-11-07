# 目录结构与编码规范

## 1. 目录结构

```
microservice-testing-platform/
├── services/
│   ├── order-service/
│   │   ├── src/
│   │   │   ├── app.js              # Express app (不含 listen)
│   │   │   ├── server.js           # 启动入口
│   │   │   ├── routes/
│   │   │   │   └── orders.js       # 路由定义
│   │   │   ├── models/
│   │   │   │   └── order.js        # 数据模型 + DB 操作
│   │   │   ├── services/
│   │   │   │   ├── inventory-client.js  # 调用 Inventory REST
│   │   │   │   └── redis-publisher.js   # Redis 发布
│   │   │   ├── middleware/
│   │   │   │   ├── correlation-id.js    # X-Correlation-ID 中间件
│   │   │   │   ├── error-handler.js     # 统一错误处理
│   │   │   │   └── request-logger.js    # 请求日志
│   │   │   ├── utils/
│   │   │   │   ├── logger.js       # Winston 配置
│   │   │   │   └── metrics.js      # Prometheus 指标
│   │   │   └── db/
│   │   │       ├── init.js         # SQLite 初始化
│   │   │       └── seed.js         # 种子数据（仅开发/测试）
│   │   ├── package.json
│   │   ├── Dockerfile
│   │   └── .env.example
│   │
│   ├── inventory-service/
│   │   ├── src/
│   │   │   ├── app.js
│   │   │   ├── server.js
│   │   │   ├── routes/
│   │   │   │   └── inventory.js
│   │   │   ├── models/
│   │   │   │   └── inventory.js
│   │   │   ├── middleware/
│   │   │   │   ├── correlation-id.js
│   │   │   │   ├── error-handler.js
│   │   │   │   └── request-logger.js
│   │   │   ├── utils/
│   │   │   │   ├── logger.js
│   │   │   │   └── metrics.js
│   │   │   └── db/
│   │   │       ├── init.js
│   │   │       └── seed.js
│   │   ├── package.json
│   │   ├── Dockerfile
│   │   └── .env.example
│   │
│   └── payment-service/
│       ├── src/
│       │   ├── app.js
│       │   ├── server.js
│       │   ├── routes/
│       │   │   └── payments.js
│       │   ├── models/
│       │   │   └── payment.js
│       │   ├── services/
│       │   │   ├── redis-subscriber.js  # Redis 订阅
│       │   │   ├── redis-publisher.js   # Redis 发布
│       │   │   └── order-client.js      # 回调 Order REST
│       │   ├── middleware/
│       │   │   ├── correlation-id.js
│       │   │   ├── error-handler.js
│       │   │   └── request-logger.js
│       │   ├── utils/
│       │   │   ├── logger.js
│       │   │   └── metrics.js
│       │   └── db/
│       │       ├── init.js
│       │       └── seed.js
│       ├── package.json
│       ├── Dockerfile
│       └── .env.example
│
├── tests/
│   ├── unit/
│   │   ├── order-service/
│   │   ├── inventory-service/
│   │   └── payment-service/
│   ├── contract/
│   │   ├── consumer/
│   │   ├── provider/
│   │   └── pacts/               # Pact 契约文件
│   ├── integration/
│   │   ├── order-api.test.js
│   │   ├── inventory-api.test.js
│   │   └── payment-redis.test.js
│   ├── e2e/
│   │   └── order-flow.test.js
│   ├── performance/
│   │   ├── single-service.k6.js
│   │   └── full-flow.k6.js
│   └── observability/
│       ├── logging.test.js
│       ├── correlation-id.test.js
│       └── metrics.test.js
│
├── shared/
│   └── constants.js             # 共享常量（事件名、错误码）
│
├── docker-compose.yml
├── docker-compose.test.yml      # 测试专用编排
├── package.json                 # Root: scripts + devDependencies
├── jest.config.js
├── .eslintrc.js
├── .prettierrc
├── .gitignore
├── CLAUDE.md
└── docs/
    ├── requirements.md
    ├── api-spec.md
    ├── test-cases.md
    ├── test-strategy.md
    ├── architecture.md
    ├── data-model.md
    ├── project-structure.md
    ├── cicd-design.md
    ├── wbs.md
    └── test-report.md           # Phase 4 产出
```

## 2. 编码规范

### 2.1 ESLint 配置

```javascript
// 基于 eslint:recommended + prettier
{
  "env": { "node": true, "jest": true, "es2022": true },
  "extends": ["eslint:recommended", "prettier"],
  "rules": {
    "no-console": "warn",
    "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "prefer-const": "error"
  }
}
```

### 2.2 Prettier 配置

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2
}
```

### 2.3 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 文件 | kebab-case | `correlation-id.js` |
| 变量/函数 | camelCase | `createOrder()` |
| 常量 | UPPER_SNAKE | `ORDER_STATUS` |
| 路由 | kebab-case | `/api/orders/:id/status` |
| 事件 | dot.notation | `order.created` |
| DB 字段 | snake_case | `product_id` |

### 2.4 app.js 与 server.js 分离

```javascript
// app.js - 可测试的 Express 应用
const app = express();
// ... middleware, routes
module.exports = app;

// server.js - 启动入口（不被测试）
const app = require('./app');
app.listen(PORT);
```

这样 Supertest 可以直接导入 app.js 进行测试，无需启动真实 server。
