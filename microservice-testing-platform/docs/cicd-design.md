# CI/CD Pipeline 设计

## 1. Pipeline 总览

```
  Push / PR
      │
      ▼
  ┌────────┐
  │  Lint  │  ESLint + Prettier check
  └───┬────┘
      │
      ▼
  ┌────────┐
  │  Unit  │  Jest unit tests (30)
  └───┬────┘
      │
      ▼
  ┌──────────┐
  │ Contract │  Pact contract tests (15)
  └────┬─────┘
       │
       ▼
  ┌─────────────┐
  │ Integration │  Supertest + Redis container (20)
  └──────┬──────┘
         │
         ▼
  ┌───────┐
  │  E2E  │  Docker Compose full flow (10)
  └───────┘
```

## 2. GitHub Actions Workflow

### 2.1 CI Workflow (`microservice-ci.yml`)

| Job | Trigger | Runner | 依赖 |
|-----|---------|--------|------|
| lint | push, PR | ubuntu-latest | Node.js 18 |
| unit-test | push, PR | ubuntu-latest | Node.js 18 |
| contract-test | push, PR | ubuntu-latest | Node.js 18 |
| integration-test | push, PR | ubuntu-latest | Node.js 18, Docker |
| e2e-test | push, PR | ubuntu-latest | Docker Compose |

### 2.2 Job 依赖关系

```yaml
jobs:
  lint:           # 无依赖，立即执行
  unit-test:
    needs: lint
  contract-test:
    needs: lint
  integration-test:
    needs: [unit-test, contract-test]
  e2e-test:
    needs: integration-test
```

### 2.3 各 Job 步骤

**lint:**
```
1. Checkout
2. Setup Node.js 18
3. npm ci (root)
4. npm run lint
5. npm run format:check
```

**unit-test:**
```
1. Checkout
2. Setup Node.js 18
3. npm ci
4. npm run test:unit
5. Upload coverage report
```

**contract-test:**
```
1. Checkout
2. Setup Node.js 18
3. npm ci
4. npm run test:contract
```

**integration-test:**
```
1. Checkout
2. Setup Node.js 18
3. npm ci
4. Start Redis (service container)
5. npm run test:integration
```

**e2e-test:**
```
1. Checkout
2. Setup Node.js 18
3. docker compose up -d
4. Wait for services healthy
5. npm run test:e2e
6. docker compose down
```

## 3. npm Scripts（root package.json）

```json
{
  "scripts": {
    "lint": "eslint services/ tests/ --ext .js",
    "format": "prettier --write 'services/**/*.js' 'tests/**/*.js'",
    "format:check": "prettier --check 'services/**/*.js' 'tests/**/*.js'",
    "test": "jest",
    "test:unit": "jest --testPathPattern=tests/unit",
    "test:contract": "jest --testPathPattern=tests/contract",
    "test:integration": "jest --testPathPattern=tests/integration",
    "test:e2e": "jest --testPathPattern=tests/e2e",
    "test:observability": "jest --testPathPattern=tests/observability",
    "test:performance": "k6 run tests/performance/full-flow.k6.js",
    "test:all": "jest --testPathPattern='tests/(unit|contract|integration|e2e|observability)'",
    "docker:up": "docker compose up -d",
    "docker:down": "docker compose down",
    "docker:test": "docker compose up -d && npm run test:e2e && docker compose down"
  }
}
```

## 4. 分支策略

| 分支 | 触发 | 执行 |
|------|------|------|
| `feature/*` | push, PR | lint → unit → contract → integration → e2e |
| `main` | push | 全部 + 性能测试（可选） |

## 5. 路径过滤

```yaml
on:
  push:
    paths:
      - 'microservice-testing-platform/**'
  pull_request:
    paths:
      - 'microservice-testing-platform/**'
```

仅当 `microservice-testing-platform/` 下文件变更时触发，避免其他项目变更触发无关 CI。
