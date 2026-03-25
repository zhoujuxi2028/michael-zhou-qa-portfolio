# Performance Testing Platform — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dedicated performance testing platform with k6 scripts covering 4 load patterns (smoke, load, stress, spike), a target Express API, Docker Compose observability stack (Grafana + InfluxDB), and CI integration with performance gates.

**Architecture:**
Target API (Express) serves as the system under test. k6 scripts execute 4 testing patterns against it, streaming metrics to InfluxDB. Grafana dashboards visualize results. GitHub Actions CI runs smoke tests as a performance gate. Jest unit tests validate the target API and k6 helper utilities.

**Tech Stack:** k6, Express, Grafana, InfluxDB, Docker Compose, Jest, ESLint, Prettier, GitHub Actions

**Related Issue:** https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/17

---

## File Structure

```
performance-testing-platform/
├── package.json                     # Project scripts & dependencies
├── jest.config.js                   # Jest configuration
├── .eslintrc.js                     # ESLint config (node, jest, es2022)
├── .eslintignore                    # Exclude k6 scripts
├── .prettierrc                      # Prettier config
├── .gitignore                       # node_modules, coverage, .env
├── README.md                        # Project overview
├── CLAUDE.md                        # Claude Code project instructions
├── docker-compose.yml               # Target API + Grafana + InfluxDB
├── Dockerfile                       # Target API container
│
├── src/                             # Target API (system under test)
│   ├── app.js                       # Express app (no listen, testable)
│   ├── server.js                    # Startup entry point
│   ├── routes/
│   │   ├── products.js              # CRUD /api/products
│   │   ├── orders.js                # CRUD /api/orders (with delay simulation)
│   │   └── health.js                # GET /health, /ready
│   ├── middleware/
│   │   └── metrics.js               # Response time tracking middleware
│   ├── db/
│   │   └── database.js              # SQLite in-memory setup + seed
│   └── utils/
│       └── delay.js                 # Configurable artificial delay
│
├── tests/
│   ├── unit/                        # Jest unit tests for target API
│   │   ├── routes/
│   │   │   ├── products.test.js     # Product API tests
│   │   │   ├── orders.test.js       # Order API tests
│   │   │   └── health.test.js       # Health endpoint tests
│   │   ├── middleware/
│   │   │   └── metrics.test.js      # Metrics middleware tests
│   │   └── utils/
│   │       └── delay.test.js        # Delay utility tests
│   │
│   └── performance/                 # k6 performance scripts
│       ├── helpers/
│       │   └── utils.js             # Shared k6 helpers (base URL, checks)
│       ├── smoke.k6.js              # Smoke test (1-2 VUs, 30s, sanity)
│       ├── load.k6.js               # Load test (50 VUs ramp, 5m, normal)
│       ├── stress.k6.js             # Stress test (200 VUs ramp, find limits)
│       └── spike.k6.js              # Spike test (sudden 100 VUs, recovery)
│
├── grafana/
│   ├── provisioning/
│   │   ├── datasources/
│   │   │   └── influxdb.yml         # Auto-configure InfluxDB datasource
│   │   └── dashboards/
│   │       └── dashboard.yml        # Auto-load dashboard JSON
│   └── dashboards/
│       └── k6-results.json          # k6 test results dashboard
│
└── docs/                            # Standard docs/ template
    ├── architecture/
    │   └── architecture.md          # System design, data flow
    ├── test-cases/
    │   └── test-cases.md            # Test case table with IDs
    └── project-management/
        └── wbs.md                   # Work breakdown structure
```

---

## Prerequisites

```bash
# Install k6 (macOS)
brew install k6

# Verify
k6 version
```

---

### Task 1: Project Scaffolding & Configuration

**Files:**
- Create: `performance-testing-platform/package.json`
- Create: `performance-testing-platform/jest.config.js`
- Create: `performance-testing-platform/.eslintrc.js`
- Create: `performance-testing-platform/.eslintignore`
- Create: `performance-testing-platform/.prettierrc`
- Create: `performance-testing-platform/.gitignore`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "performance-testing-platform",
  "version": "1.0.0",
  "description": "Performance testing platform — k6 load/stress/spike/smoke testing with Grafana + InfluxDB",
  "private": true,
  "scripts": {
    "lint": "eslint src/ tests/unit/ --ext .js",
    "lint:fix": "eslint src/ tests/unit/ --ext .js --fix",
    "format": "prettier --write 'src/**/*.js' 'tests/unit/**/*.js'",
    "format:check": "prettier --check 'src/**/*.js' 'tests/unit/**/*.js'",
    "start": "node src/server.js",
    "test": "jest",
    "test:unit": "jest --testPathPattern=tests/unit",
    "test:coverage": "jest --testPathPattern=tests/unit --coverage",
    "k6:smoke": "k6 run tests/performance/smoke.k6.js",
    "k6:load": "k6 run tests/performance/load.k6.js",
    "k6:stress": "k6 run tests/performance/stress.k6.js",
    "k6:spike": "k6 run tests/performance/spike.k6.js",
    "k6:smoke:influx": "k6 run --out influxdb=http://localhost:8086/k6 tests/performance/smoke.k6.js",
    "k6:load:influx": "k6 run --out influxdb=http://localhost:8086/k6 tests/performance/load.k6.js",
    "docker:up": "docker compose up -d",
    "docker:down": "docker compose down"
  },
  "devDependencies": {
    "eslint": "^8.56.0",
    "eslint-config-prettier": "^9.1.0",
    "jest": "^29.7.0",
    "prettier": "^3.2.0",
    "supertest": "^6.3.3"
  },
  "dependencies": {
    "better-sqlite3": "^11.0.0",
    "express": "^4.18.2"
  }
}
```

- [ ] **Step 2: Create jest.config.js**

```javascript
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/unit/**/*.test.js'],
  collectCoverageFrom: ['src/**/*.js', '!src/server.js'],
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

- [ ] **Step 3: Create .eslintrc.js**

```javascript
module.exports = {
  env: { node: true, jest: true, es2022: true },
  extends: ['eslint:recommended', 'prettier'],
  parserOptions: { ecmaVersion: 2022 },
  rules: {
    'no-console': 'warn',
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'prefer-const': 'error',
  },
};
```

- [ ] **Step 4: Create .eslintignore, .prettierrc, .gitignore**

`.eslintignore`:
```
tests/performance/
```

`.prettierrc`:
```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2
}
```

`.gitignore`:
```
node_modules/
coverage/
*.db
.env
```

- [ ] **Step 5: Run npm install**

```bash
cd performance-testing-platform
npm install
```

- [ ] **Step 6: Verify lint passes on empty project**

```bash
npx eslint src/ tests/unit/ --ext .js || echo "No files yet, OK"
```

- [ ] **Step 7: Commit**

```bash
git add performance-testing-platform/package.json performance-testing-platform/package-lock.json performance-testing-platform/jest.config.js performance-testing-platform/.eslintrc.js performance-testing-platform/.eslintignore performance-testing-platform/.prettierrc performance-testing-platform/.gitignore
git commit -m "feat(performance): scaffold project with config files"
```

---

### Task 2: Target API — Database & Utilities

**Files:**
- Create: `performance-testing-platform/src/db/database.js`
- Create: `performance-testing-platform/src/utils/delay.js`
- Test: `performance-testing-platform/tests/unit/utils/delay.test.js`
- Test: `performance-testing-platform/tests/unit/db/database.test.js`

- [ ] **Step 1: Write failing test for delay utility**

```javascript
// tests/unit/utils/delay.test.js
const { simulateDelay } = require('../../../src/utils/delay');

describe('delay utility', () => {
  test('resolves after specified ms', async () => {
    const start = Date.now();
    await simulateDelay(50);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(45);
    expect(elapsed).toBeLessThan(200);
  });

  test('resolves immediately when delay is 0', async () => {
    const start = Date.now();
    await simulateDelay(0);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(50);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest tests/unit/utils/delay.test.js -v
```
Expected: FAIL — `Cannot find module '../../../src/utils/delay'`

- [ ] **Step 3: Implement delay utility**

```javascript
// src/utils/delay.js
const simulateDelay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = { simulateDelay };
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest tests/unit/utils/delay.test.js -v
```
Expected: 2 tests PASS

- [ ] **Step 5: Write failing test for database module**

```javascript
// tests/unit/db/database.test.js
const { getDatabase, resetDatabase } = require('../../../src/db/database');

afterEach(() => resetDatabase());

describe('database', () => {
  test('getDatabase returns a database instance', () => {
    const db = getDatabase();
    expect(db).toBeDefined();
    expect(typeof db.prepare).toBe('function');
  });

  test('getDatabase seeds 5 products', () => {
    const db = getDatabase();
    const count = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
    expect(count).toBe(5);
  });

  test('resetDatabase clears the singleton', () => {
    getDatabase();
    resetDatabase();
    const db = getDatabase();
    const count = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
    expect(count).toBe(5);
  });
});
```

- [ ] **Step 6: Run database test to verify it fails**

```bash
npx jest tests/unit/db/database.test.js -v
```
Expected: FAIL — `Cannot find module '../../../src/db/database'`

- [ ] **Step 7: Implement database module**

```javascript
// src/db/database.js
const Database = require('better-sqlite3');

let db;

function getDatabase() {
  if (!db) {
    db = new Database(':memory:');
    db.pragma('journal_mode = WAL');
    initSchema();
    seedData();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      total REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );
  `);
}

function seedData() {
  const insert = db.prepare('INSERT INTO products (name, price, stock) VALUES (?, ?, ?)');
  const products = [
    ['Laptop', 999.99, 100000],
    ['Phone', 699.99, 100000],
    ['Tablet', 449.99, 100000],
    ['Headphones', 149.99, 100000],
    ['Keyboard', 89.99, 100000],
  ];
  const tx = db.transaction(() => products.forEach((p) => insert.run(...p)));
  tx();
}

function resetDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { getDatabase, resetDatabase };
```

- [ ] **Step 8: Run database test to verify it passes**

```bash
npx jest tests/unit/db/database.test.js -v
```
Expected: 3 tests PASS

- [ ] **Step 9: Commit**

```bash
git add performance-testing-platform/src/utils/ performance-testing-platform/src/db/ performance-testing-platform/tests/unit/utils/ performance-testing-platform/tests/unit/db/
git commit -m "feat(performance): add database module and delay utility with tests"
```

---

### Task 3: Target API — Routes & Middleware

**Files:**
- Create: `performance-testing-platform/src/routes/health.js`
- Create: `performance-testing-platform/src/routes/products.js`
- Create: `performance-testing-platform/src/routes/orders.js`
- Create: `performance-testing-platform/src/middleware/metrics.js`
- Create: `performance-testing-platform/src/app.js`
- Create: `performance-testing-platform/src/server.js`
- Test: `performance-testing-platform/tests/unit/routes/health.test.js`
- Test: `performance-testing-platform/tests/unit/routes/products.test.js`
- Test: `performance-testing-platform/tests/unit/routes/orders.test.js`
- Test: `performance-testing-platform/tests/unit/middleware/metrics.test.js`

- [ ] **Step 1: Write failing test for health route**

```javascript
// tests/unit/routes/health.test.js
const request = require('supertest');
const app = require('../../../src/app');

describe('GET /health', () => {
  test('returns 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('GET /ready', () => {
  test('returns 200 with ready true', async () => {
    const res = await request(app).get('/ready');
    expect(res.status).toBe(200);
    expect(res.body.ready).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest tests/unit/routes/health.test.js -v
```
Expected: FAIL — `Cannot find module '../../../src/app'`

- [ ] **Step 3: Implement metrics middleware**

```javascript
// src/middleware/metrics.js
const metrics = { requestCount: 0, totalDuration: 0 };

function metricsMiddleware(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    metrics.requestCount++;
    metrics.totalDuration += Date.now() - start;
  });
  next();
}

function getMetrics() {
  return {
    requestCount: metrics.requestCount,
    avgDuration: metrics.requestCount > 0 ? metrics.totalDuration / metrics.requestCount : 0,
  };
}

function resetMetrics() {
  metrics.requestCount = 0;
  metrics.totalDuration = 0;
}

module.exports = { metricsMiddleware, getMetrics, resetMetrics };
```

- [ ] **Step 4: Implement health route**

```javascript
// src/routes/health.js
const { Router } = require('express');
const { getMetrics } = require('../middleware/metrics');

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.get('/ready', (_req, res) => {
  res.json({ ready: true });
});

router.get('/metrics', (_req, res) => {
  res.json(getMetrics());
});

module.exports = router;
```

- [ ] **Step 5: Implement products route**

```javascript
// src/routes/products.js
const { Router } = require('express');
const { getDatabase } = require('../db/database');

const router = Router();

router.get('/api/products', (req, res) => {
  const db = getDatabase();
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const products = db.prepare('SELECT * FROM products LIMIT ? OFFSET ?').all(limit, offset);
  const total = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
  res.json({ data: products, page, limit, total });
});

router.get('/api/products/:id', (req, res) => {
  const db = getDatabase();
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

router.post('/api/products', (req, res) => {
  const db = getDatabase();
  const { name, price, stock } = req.body;
  if (!name || price == null) return res.status(400).json({ error: 'name and price required' });
  const result = db.prepare('INSERT INTO products (name, price, stock) VALUES (?, ?, ?)').run(name, price, stock || 0);
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(product);
});

module.exports = router;
```

- [ ] **Step 6: Implement orders route (with configurable delay)**

```javascript
// src/routes/orders.js
const { Router } = require('express');
const { getDatabase } = require('../db/database');
const { simulateDelay } = require('../utils/delay');

const router = Router();
const ORDER_DELAY_MS = parseInt(process.env.ORDER_DELAY_MS) || 50;

router.get('/api/orders', (req, res) => {
  const db = getDatabase();
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset);
  const total = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
  res.json({ data: orders, page, limit, total });
});

router.post('/api/orders', async (req, res) => {
  const db = getDatabase();
  const { product_id, quantity } = req.body;
  if (!product_id || !quantity) return res.status(400).json({ error: 'product_id and quantity required' });

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  if (product.stock < quantity) return res.status(409).json({ error: 'Insufficient stock' });

  await simulateDelay(ORDER_DELAY_MS);

  const total = product.price * quantity;
  const tx = db.transaction(() => {
    db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(quantity, product_id);
    return db.prepare('INSERT INTO orders (product_id, quantity, total, status) VALUES (?, ?, ?, ?)').run(product_id, quantity, total, 'confirmed');
  });
  const result = tx();
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(order);
});

module.exports = router;
```

- [ ] **Step 7: Implement app.js and server.js**

```javascript
// src/app.js
const express = require('express');
const { metricsMiddleware } = require('./middleware/metrics');
const healthRoutes = require('./routes/health');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');

const app = express();
app.use(express.json());
app.use(metricsMiddleware);
app.use(healthRoutes);
app.use(productRoutes);
app.use(orderRoutes);

module.exports = app;
```

```javascript
// src/server.js
const app = require('./app');
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Performance test target API running on port ${PORT}`);
});
```

- [ ] **Step 8: Write products tests (RED — will pass once app.js exists)**

> Note: Steps 8-10 write all remaining test files before Step 7 created app.js,
> so they would fail if written before Step 7. Since app.js is needed for health
> tests to pass (Step 1-2 RED-GREEN), we batch the remaining tests here.
> All tests run together in Step 12 as the GREEN verification.

- [ ] **Step 9: Write products tests**

```javascript
// tests/unit/routes/products.test.js
const request = require('supertest');
const app = require('../../../src/app');
const { resetDatabase } = require('../../../src/db/database');

afterEach(() => resetDatabase());

describe('GET /api/products', () => {
  test('returns paginated product list', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(5);
    expect(res.body.total).toBe(5);
  });

  test('supports pagination params', async () => {
    const res = await request(app).get('/api/products?page=1&limit=2');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });
});

describe('GET /api/products/:id', () => {
  test('returns product by id', async () => {
    const res = await request(app).get('/api/products/1');
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Laptop');
  });

  test('returns 404 for missing product', async () => {
    const res = await request(app).get('/api/products/999');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/products', () => {
  test('creates a new product', async () => {
    const res = await request(app).post('/api/products').send({ name: 'Monitor', price: 299.99, stock: 30 });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Monitor');
  });

  test('returns 400 when name missing', async () => {
    const res = await request(app).post('/api/products').send({ price: 100 });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 10: Write orders tests**

```javascript
// tests/unit/routes/orders.test.js
const request = require('supertest');
const app = require('../../../src/app');
const { resetDatabase } = require('../../../src/db/database');

afterEach(() => resetDatabase());

describe('GET /api/orders', () => {
  test('returns empty order list initially', async () => {
    const res = await request(app).get('/api/orders');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });
});

describe('POST /api/orders', () => {
  test('creates order and decrements stock', async () => {
    const res = await request(app).post('/api/orders').send({ product_id: 1, quantity: 2 });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('confirmed');
    expect(res.body.total).toBe(1999.98);
  });

  test('returns 404 for invalid product', async () => {
    const res = await request(app).post('/api/orders').send({ product_id: 999, quantity: 1 });
    expect(res.status).toBe(404);
  });

  test('returns 409 when insufficient stock', async () => {
    const res = await request(app).post('/api/orders').send({ product_id: 1, quantity: 200000 });
    expect(res.status).toBe(409);
  });

  test('returns 400 when fields missing', async () => {
    const res = await request(app).post('/api/orders').send({});
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 11: Write metrics middleware test**

```javascript
// tests/unit/middleware/metrics.test.js
const request = require('supertest');
const app = require('../../../src/app');
const { resetMetrics } = require('../../../src/middleware/metrics');
const { resetDatabase } = require('../../../src/db/database');

beforeEach(() => resetMetrics());
afterEach(() => resetDatabase());

describe('metrics middleware', () => {
  test('tracks request count', async () => {
    await request(app).get('/health');
    await request(app).get('/health');
    const res = await request(app).get('/metrics');
    expect(res.body.requestCount).toBe(3);
  });

  test('tracks average duration', async () => {
    await request(app).get('/health');
    const res = await request(app).get('/metrics');
    expect(res.body.avgDuration).toBeGreaterThanOrEqual(0);
  });
});
```

```bash
npx jest tests/unit/middleware/metrics.test.js -v
```
Expected: 2 tests PASS

- [ ] **Step 12: Run all unit tests together**

```bash
npx jest tests/unit/ -v --coverage
```
Expected: 19 tests PASS (delay:2, database:3, health:2, products:6, orders:4, metrics:2), coverage >= 80%

- [ ] **Step 13: Run lint**

```bash
npx eslint src/ tests/unit/ --ext .js
npx prettier --check 'src/**/*.js' 'tests/unit/**/*.js'
```
Expected: No errors

- [ ] **Step 14: Commit**

```bash
git add performance-testing-platform/src/ performance-testing-platform/tests/unit/
git commit -m "feat(performance): add target API with routes, middleware, and 19 unit tests"
```

---

### Task 4: k6 Performance Test Scripts

**Files:**
- Create: `performance-testing-platform/tests/performance/helpers/utils.js`
- Create: `performance-testing-platform/tests/performance/smoke.k6.js`
- Create: `performance-testing-platform/tests/performance/load.k6.js`
- Create: `performance-testing-platform/tests/performance/stress.k6.js`
- Create: `performance-testing-platform/tests/performance/spike.k6.js`

**Prerequisite:** `brew install k6`

- [ ] **Step 1: Create k6 shared helpers**

```javascript
// tests/performance/helpers/utils.js
import { check } from 'k6';

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export function checkStatus(res, expectedStatus, name) {
  check(res, {
    [`${name} status ${expectedStatus}`]: (r) => r.status === expectedStatus,
  });
}

export function checkDuration(res, maxMs, name) {
  check(res, {
    [`${name} duration < ${maxMs}ms`]: (r) => r.timings.duration < maxMs,
  });
}
```

- [ ] **Step 2: Create smoke test (sanity check)**

```javascript
// tests/performance/smoke.k6.js
import http from 'k6/http';
import { sleep } from 'k6';
import { BASE_URL, checkStatus, checkDuration } from './helpers/utils.js';

export const options = {
  vus: 2,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  // Health check
  const health = http.get(`${BASE_URL}/health`);
  checkStatus(health, 200, 'health');
  checkDuration(health, 200, 'health');

  // List products
  const products = http.get(`${BASE_URL}/api/products`);
  checkStatus(products, 200, 'products');

  // Get single product
  const product = http.get(`${BASE_URL}/api/products/1`);
  checkStatus(product, 200, 'product');

  sleep(1);
}
```

- [ ] **Step 3: Create load test (normal traffic)**

```javascript
// tests/performance/load.k6.js
import http from 'k6/http';
import { sleep } from 'k6';
import { BASE_URL, checkStatus } from './helpers/utils.js';

export const options = {
  stages: [
    { duration: '1m', target: 20 },   // ramp up
    { duration: '3m', target: 50 },   // stay at 50
    { duration: '1m', target: 0 },    // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    http_reqs: ['rate>10'],
  },
};

export default function () {
  const products = http.get(`${BASE_URL}/api/products?page=1&limit=5`);
  checkStatus(products, 200, 'list products');

  const productId = Math.ceil(Math.random() * 5);
  const detail = http.get(`${BASE_URL}/api/products/${productId}`);
  checkStatus(detail, 200, 'product detail');

  const order = http.post(
    `${BASE_URL}/api/orders`,
    JSON.stringify({ product_id: productId, quantity: 1 }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  checkStatus(order, 201, 'create order');

  sleep(0.5);
}
```

- [ ] **Step 4: Create stress test (find limits)**

```javascript
// tests/performance/stress.k6.js
import http from 'k6/http';
import { sleep } from 'k6';
import { BASE_URL, checkStatus } from './helpers/utils.js';

export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '30s', target: 100 },
    { duration: '30s', target: 150 },
    { duration: '30s', target: 200 },
    { duration: '1m', target: 200 },   // hold at peak
    { duration: '30s', target: 0 },    // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.05'],
  },
};

export default function () {
  const products = http.get(`${BASE_URL}/api/products`);
  checkStatus(products, 200, 'products');

  const productId = Math.ceil(Math.random() * 5);
  http.post(
    `${BASE_URL}/api/orders`,
    JSON.stringify({ product_id: productId, quantity: 1 }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  sleep(0.3);
}
```

- [ ] **Step 5: Create spike test (sudden burst)**

```javascript
// tests/performance/spike.k6.js
import http from 'k6/http';
import { sleep } from 'k6';
import { BASE_URL, checkStatus } from './helpers/utils.js';

export const options = {
  stages: [
    { duration: '10s', target: 5 },    // baseline
    { duration: '5s', target: 100 },   // spike!
    { duration: '30s', target: 100 },  // hold spike
    { duration: '10s', target: 5 },    // recover
    { duration: '30s', target: 5 },    // verify recovery
    { duration: '5s', target: 0 },     // done
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.10'],
  },
};

export default function () {
  const health = http.get(`${BASE_URL}/health`);
  checkStatus(health, 200, 'health');

  const products = http.get(`${BASE_URL}/api/products`);
  checkStatus(products, 200, 'products');

  sleep(0.2);
}
```

- [ ] **Step 6: Verify smoke test runs locally**

```bash
cd performance-testing-platform

# Start API in background
node src/server.js &
sleep 2

# Run smoke test
k6 run tests/performance/smoke.k6.js

# Stop API
kill %1
```
Expected: smoke test passes, p(95) < 500ms, error rate < 1%

- [ ] **Step 7: Commit**

```bash
git add performance-testing-platform/tests/performance/
git commit -m "feat(performance): add k6 scripts — smoke, load, stress, spike with thresholds"
```

---

### Task 5: Docker Compose + Grafana Dashboard

**Files:**
- Create: `performance-testing-platform/Dockerfile`
- Create: `performance-testing-platform/docker-compose.yml`
- Create: `performance-testing-platform/grafana/provisioning/datasources/influxdb.yml`
- Create: `performance-testing-platform/grafana/provisioning/dashboards/dashboard.yml`
- Create: `performance-testing-platform/grafana/dashboards/k6-results.json`

- [ ] **Step 1: Create Dockerfile for target API**

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY src/ ./src/
EXPOSE 3000
CMD ["node", "src/server.js"]
```

- [ ] **Step 2: Create docker-compose.yml**

```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - '3000:3000'
    environment:
      - PORT=3000
      - ORDER_DELAY_MS=50

  influxdb:
    image: influxdb:1.8
    ports:
      - '8086:8086'
    environment:
      - INFLUXDB_DB=k6

  grafana:
    image: grafana/grafana:10.2.0
    ports:
      - '3001:3000'
    environment:
      - GF_AUTH_ANONYMOUS_ENABLED=true
      - GF_AUTH_ANONYMOUS_ORG_ROLE=Admin
    volumes:
      - ./grafana/provisioning:/etc/grafana/provisioning
      - ./grafana/dashboards:/var/lib/grafana/dashboards
    depends_on:
      - influxdb
```

- [ ] **Step 3: Create Grafana provisioning files**

```yaml
# grafana/provisioning/datasources/influxdb.yml
apiVersion: 1
datasources:
  - name: InfluxDB
    type: influxdb
    access: proxy
    url: http://influxdb:8086
    database: k6
    isDefault: true
```

```yaml
# grafana/provisioning/dashboards/dashboard.yml
apiVersion: 1
providers:
  - name: default
    folder: ''
    type: file
    options:
      path: /var/lib/grafana/dashboards
```

- [ ] **Step 4: Create k6 results Grafana dashboard JSON**

Download the standard k6 + InfluxDB dashboard (Grafana community dashboard ID 2587) and customize:

```bash
curl -o grafana/dashboards/k6-results.json 'https://grafana.com/api/dashboards/2587/revisions/3/download'
```

Then verify the JSON contains panels for: Virtual Users, Request Rate, Response Time p95, Error Rate, HTTP Request Duration Distribution, Checks Pass Rate. Adjust datasource UID to match `influxdb.yml` if needed.

- [ ] **Step 5: Verify Docker Compose starts**

```bash
docker compose up -d
docker compose ps     # All 3 services running
curl http://localhost:3000/health   # API healthy
curl http://localhost:3001/api/health  # Grafana healthy
docker compose down
```

- [ ] **Step 6: Run k6 smoke test with InfluxDB output**

```bash
docker compose up -d
sleep 5
k6 run --out influxdb=http://localhost:8086/k6 tests/performance/smoke.k6.js
# Open http://localhost:3001 → k6 Results dashboard
docker compose down
```

- [ ] **Step 7: Commit**

```bash
git add performance-testing-platform/Dockerfile performance-testing-platform/docker-compose.yml performance-testing-platform/grafana/
git commit -m "feat(performance): add Docker Compose with Grafana + InfluxDB observability"
```

---

### Task 6: CI/CD Integration

**Files:**
- Create: `.github/workflows/performance-ci.yml`

- [ ] **Step 1: Create CI workflow**

```yaml
# .github/workflows/performance-ci.yml
name: Performance Testing CI

on:
  push:
    branches: [main, feature/performance-testing]
    paths:
      - 'performance-testing-platform/**'
      - '.github/workflows/performance-ci.yml'
  pull_request:
    branches: [main]
    paths:
      - 'performance-testing-platform/**'
      - '.github/workflows/performance-ci.yml'
  workflow_dispatch:

defaults:
  run:
    working-directory: performance-testing-platform

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: npm
          cache-dependency-path: performance-testing-platform/package-lock.json
      - run: npm ci
      - run: npx eslint src/ tests/unit/ --ext .js
      - run: npx prettier --check 'src/**/*.js' 'tests/unit/**/*.js'

  unit-test:
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: npm
          cache-dependency-path: performance-testing-platform/package-lock.json
      - run: npm ci
      - run: npx jest tests/unit/ --coverage --coverageReporters=text --coverageReporters=lcov
      - name: Upload coverage
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: performance-testing-platform/coverage/

  smoke-test:
    runs-on: ubuntu-latest
    needs: unit-test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: npm
          cache-dependency-path: performance-testing-platform/package-lock.json
      - uses: grafana/setup-k6-action@v1
      - run: npm ci
      - name: Start target API
        run: node src/server.js &
      - name: Wait for API
        run: |
          for i in $(seq 1 10); do
            curl -sf http://localhost:3000/health && break
            sleep 1
          done
      - name: Run k6 smoke test (performance gate)
        run: k6 run tests/performance/smoke.k6.js
      - name: Stop API
        if: always()
        run: kill $(lsof -ti:3000) 2>/dev/null || true
```

- [ ] **Step 2: Verify CI workflow YAML is valid**

```bash
cd "$(git rev-parse --show-toplevel)"
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/performance-ci.yml'))" && echo "YAML valid"
```

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/performance-ci.yml
git commit -m "ci(performance): add CI pipeline — lint, unit tests, k6 smoke gate"
```

---

### Task 7: Documentation & Project Registration

**Files:**
- Create: `performance-testing-platform/README.md`
- Create: `performance-testing-platform/CLAUDE.md`
- Create: `performance-testing-platform/docs/architecture/architecture.md`
- Create: `performance-testing-platform/docs/test-cases/test-cases.md`
- Create: `performance-testing-platform/docs/project-management/wbs.md`
- Modify: Root `CLAUDE.md` — add project entry
- Modify: Root `README.md` — add project to table

- [ ] **Step 1: Create README.md**

Include: Category (性能测试), architecture diagram, test layers table (19 unit + 4 k6 scripts), quick start, documentation links.

- [ ] **Step 2: Create CLAUDE.md**

Follow existing pattern: project description, quick start, architecture, test structure, CI workflows, conventions.

- [ ] **Step 3: Create docs/ files**

- `docs/architecture/architecture.md` — System design, data flow (API → k6 → InfluxDB → Grafana)
- `docs/test-cases/test-cases.md` — Test case IDs: UT-P-01~15 (unit), PT-SMOKE-01~04 (smoke), PT-LOAD-01~03 (load), PT-STRESS-01~03 (stress), PT-SPIKE-01~03 (spike)
- `docs/project-management/wbs.md` — Phase 1 (complete) + Phase 2 (future: soak test, custom metrics, alerting)

- [ ] **Step 4: Update root CLAUDE.md**

Add to Projects table:
```
| 性能测试 | `performance-testing-platform/` | Performance testing (19 unit + 4 k6 scripts) | k6, Express, Grafana, InfluxDB |
```

Add to Project CLAUDE.md Files table:
```
| Performance Testing | `performance-testing-platform/CLAUDE.md` |
```

Add to Quick Commands section and GitHub Actions table.

- [ ] **Step 5: Update root README.md**

Add project to Projects table and CI/CD Workflows table.

- [ ] **Step 6: Commit**

```bash
git add performance-testing-platform/README.md performance-testing-platform/CLAUDE.md performance-testing-platform/docs/ CLAUDE.md README.md
git commit -m "docs(performance): add README, CLAUDE.md, docs/, and register in root project files"
```

---

## Test Summary

| Type | Count | Tool |
|------|-------|------|
| Unit tests | 19 | Jest (delay:2, database:3, health:2, products:6, orders:4, metrics:2) |
| k6 scripts | 4 | k6 (smoke, load, stress, spike) |
| **Total** | **23** | |

## Thresholds Summary

| Script | p95 Latency | Error Rate | VUs | Duration |
|--------|-------------|------------|-----|----------|
| Smoke | < 500ms | < 1% | 2 | 30s |
| Load | < 500ms (p95), < 1s (p99) | < 1% | 50 | 5m |
| Stress | < 1000ms | < 5% | 200 | 3.5m |
| Spike | < 2000ms | < 10% | 100 | 1.5m |
