# Implementation Plan — Phase 5: 基础设施升级

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Issue:** [#85](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/85)
**Branch:** `feature/performance-testing`
**Date:** 2026-04-04

**Goal:** 为后续测试能力扩展 (Phase 6) 和 CI/CD 增强 (Phase 7) 打好基础，完成多环境配置、测试数据参数化、负载配置集中管理、开发者体验改进。

**Architecture:** 新增三层配置架构 (env/ + profiles/ + data/) → k6 helpers 层加载配置 → 现有脚本 import helpers。采用双模块策略: `src/utils/` (CJS, Jest 可测) + `tests/performance/helpers/` (k6 ES module, 内联重新实现解析逻辑 + k6 原生 API)。

> **JMeter 设计决策:** Phase 5 的数据参数化和负载配置集中管理仅针对 k6，JMeter 不做对等改造——JMeter `.jmx` 原生支持 CSV Data Set Config，负载参数已在 Phase 1 通过 `config/*.properties` 外置，无需重复建设。

**Tech Stack:** k6 (open + SharedArray + \_\_ENV), Jest + Node.js, JMeter `-q` properties

---

## 1. 架构设计

### 1.1 三层配置架构

```
┌─────────────────────────────────────────────────────────────┐
│                    配置层 (Phase 5 新增)                      │
│                                                              │
│  env/              profiles/           data/                 │
│  ├─ local.env      ├─ smoke.json       ├─ users.csv          │
│  ├─ staging.env    ├─ load.json        └─ products.csv       │
│  └─ production.env ├─ stress.json                            │
│                    ├─ spike.json                              │
│                    └─ peak.json                               │
└────────┬──────────────────┬──────────────────┬───────────────┘
         │                  │                  │
         ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│              k6 Helpers (tests/performance/helpers/)          │
│  env.js ──── BASE_URL, ENV config                            │
│  data.js ─── SharedArray (users, products, randomProduct())  │
│  profile.js ─ loadProfile('smoke') → {stages, thresholds}   │
│  utils.js ── checkStatus, checkDuration (re-exports BASE_URL)│
└─────────────────────────────────────────────────────────────┘
```

### 1.2 双模块策略

k6 不是 Node.js，无法直接用 Jest 测试。采用 Phase 4 `leak-detection.js` 已验证的模式:

| 层           | 位置                                                            | 运行时         | 用途                                                                  |
| ------------ | --------------------------------------------------------------- | -------------- | --------------------------------------------------------------------- |
| Node.js 模块 | `src/utils/env-loader.js`, `csv-loader.js`, `profile-parser.js` | Jest (Node.js) | 纯解析逻辑，单元测试                                                  |
| k6 helpers   | `tests/performance/helpers/env.js`, `data.js`, `profile.js`     | k6 runtime     | 内联重新实现解析逻辑 + k6 原生 API (`open()`, `SharedArray`, `__ENV`) |

### 1.3 环境切换数据流

```
k6 run --env ENV=staging smoke.k6.js
  │
  ▼
helpers/env.js
  ├── 读取 __ENV.ENV → "staging"
  ├── open('../../../env/staging.env')
  ├── parseEnvFile() → {BASE_URL: "http://staging:3000", ...}
  └── export BASE_URL
         │
         ▼
helpers/utils.js (re-export BASE_URL from env.js)
         │
         ▼
smoke.k6.js: http.get(`${BASE_URL}/api/products`)
```

### 1.4 CSV 数据流 (无 CDN 依赖)

```
data/products.csv
  │
  ▼ open() + split() (不依赖 papaparse CDN)
  │
  ▼ SharedArray('products', fn)
  │
  ▼ randomProduct() → {id, name, price, category}
  │
  ▼ http.get(`${BASE_URL}/api/products/${p.id}`)
```

> **设计决策:** 需求中提到 papaparse via jslib CDN，但实际采用原生 `split()` 解析 CSV，避免外部 CDN 依赖。CSV 数据量小 (<1MB)，原生解析足够。

### 1.5 Profile 双模式支持

| 模式             | 适用场景                    | JSON 结构                                      | 示例         |
| ---------------- | --------------------------- | ---------------------------------------------- | ------------ |
| `vus + duration` | 恒定 VU (smoke)             | `{vus: 5, duration: "60s", thresholds: {...}}` | `smoke.json` |
| `stages`         | 渐变 VU (load/stress/spike) | `{stages: [...], thresholds: {...}}`           | `load.json`  |

---

## 2. 文件结构

### 2.1 新增文件

| File                                        | Responsibility                                        |
| ------------------------------------------- | ----------------------------------------------------- |
| `env/local.env`                             | 本地环境配置 (BASE_URL=localhost, AUTH_ENABLED=false) |
| `env/staging.env`                           | Staging 环境配置 (模拟远程地址)                       |
| `env/production.env`                        | Production 环境配置                                   |
| `data/users.csv`                            | 测试用户数据 (username, password, role)               |
| `data/products.csv`                         | 测试商品数据 (id, name, price, category)              |
| `profiles/smoke.json`                       | Smoke 负载配置 (5 VUs, 60s)                           |
| `profiles/load.json`                        | Load 负载配置 (stages: 20→50→0)                       |
| `profiles/stress.json`                      | Stress 负载配置                                       |
| `profiles/spike.json`                       | Spike 负载配置                                        |
| `profiles/peak.json`                        | Peak 负载配置                                         |
| `src/utils/env-loader.js`                   | Env 解析逻辑 (CJS, Jest 可测)                         |
| `src/utils/csv-loader.js`                   | CSV 解析逻辑 (CJS, Jest 可测)                         |
| `src/utils/profile-parser.js`               | Profile 解析逻辑 (CJS, Jest 可测)                     |
| `tests/performance/helpers/env.js`          | k6 环境加载器                                         |
| `tests/performance/helpers/data.js`         | k6 CSV 数据加载器 (SharedArray)                       |
| `tests/performance/helpers/profile.js`      | k6 Profile 加载器                                     |
| `tests/unit/helpers/env.test.js`            | env-loader 单元测试 (7 cases)                         |
| `tests/unit/helpers/data.test.js`           | csv-loader 单元测试 (8 cases)                         |
| `tests/unit/helpers/profile.test.js`        | profile-parser 单元测试 (9 cases)                     |
| `.env.example`                              | 环境变量示例文件                                      |
| `tests/jmeter/config/staging.properties`    | JMeter staging 配置                                   |
| `tests/jmeter/config/production.properties` | JMeter production 配置                                |

### 2.2 修改文件

| File                             | Changes                                        |
| -------------------------------- | ---------------------------------------------- |
| `tests/performance/smoke.k6.js`  | import profile + CSV data，替代硬编码          |
| `tests/performance/load.k6.js`   | import profile + CSV data                      |
| `tests/performance/stress.k6.js` | import profile + CSV data                      |
| `package.json`                   | 新增 `setup`, `clean`, `health`, `dev` scripts |
| `.gitignore`                     | 排除 `env/*.env` (保留 .env.example)           |

---

## 3. Task Breakdown

| Task | 内容                                                           | 文件                                                                                | 依赖       |
| ---- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------- |
| T0   | 多环境配置: env 文件 + env-loader + k6 helper + 单元测试       | `env/`, `src/utils/env-loader.js`, `helpers/env.js`, `env.test.js`                  | —          |
| T1   | 测试数据参数化: CSV 文件 + csv-loader + k6 helper + 单元测试   | `data/`, `src/utils/csv-loader.js`, `helpers/data.js`, `data.test.js`               | —          |
| T2   | 负载配置集中管理: profile JSON + parser + k6 helper + 单元测试 | `profiles/`, `src/utils/profile-parser.js`, `helpers/profile.js`, `profile.test.js` | —          |
| T3   | k6 脚本改造: smoke/load/stress 使用 CSV + profile              | `smoke.k6.js`, `load.k6.js`, `stress.k6.js`                                         | T0, T1, T2 |
| T4   | JMeter 环境适配: staging/production properties                 | `config/staging.properties`, `config/production.properties`                         | —          |
| T5   | 开发者体验: .env.example + npm scripts                         | `.env.example`, `package.json`                                                      | —          |
| T6   | 文档更新                                                       | architecture.md, qa/test-cases/index.md                                             | T0~T5      |

---

## 4. Detailed Design

### Task 0: 多环境配置 (ENT-ENV)

**Files:**

- Create: `env/local.env`, `env/staging.env`, `env/production.env`
- Create: `src/utils/env-loader.js`
- Create: `tests/performance/helpers/env.js`
- Create: `tests/unit/helpers/env.test.js`

#### 4.0.1 env 文件格式

```bash
# env/local.env
BASE_URL=http://localhost:3000
AUTH_ENABLED=false
PORT=3000
```

#### 4.0.2 env-loader.js (CJS — Jest 可测)

```javascript
function parseEnvFile(content) {
  if (!content) return {};
  return content
    .split('\n')
    .filter((line) => line.trim() && !line.startsWith('#'))
    .reduce((acc, line) => {
      const idx = line.indexOf('=');
      if (idx > 0) acc[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
      return acc;
    }, {});
}

const DEFAULTS = { BASE_URL: 'http://localhost:3000', AUTH_ENABLED: 'false', PORT: '3000' };

module.exports = { parseEnvFile, DEFAULTS };
```

#### 4.0.3 k6 helpers/env.js

```javascript
// k6 runtime — 使用 open() + __ENV
const envName = __ENV.ENV || 'local';
let content;
try {
  content = open(`../../../env/${envName}.env`);
} catch {
  content = null;
}
// parseEnvFile 内联实现 (同 env-loader.js 逻辑)
const ENV = content ? parseEnvFile(content) : DEFAULTS;
export const BASE_URL = __ENV.BASE_URL || ENV.BASE_URL || DEFAULTS.BASE_URL;
```

- [x] **Step 1: Write failing test for env-loader**

Create `tests/unit/helpers/env.test.js` (7 cases: UT-ENV-01~07):

- UT-ENV-01: Parses valid env file with multiple variables
- UT-ENV-02: Skips comment lines starting with #
- UT-ENV-03: Skips blank and whitespace-only lines
- UT-ENV-04: Returns empty object for null/undefined input
- UT-ENV-05: Handles values containing = (split on first = only)
- UT-ENV-06: Trims whitespace around keys and values
- UT-ENV-07: Returns DEFAULTS when env file not found

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/helpers/env.test.js`
Expected: FAIL — `Cannot find module '../../../src/utils/env-loader'`

- [x] **Step 3: Implement env-loader.js + env files + k6 helper**

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/helpers/env.test.js`
Expected: 7 PASS

- [x] **Step 5: Commit**

```bash
git add src/utils/env-loader.js env/ tests/unit/helpers/env.test.js tests/performance/helpers/env.js
git commit -m "feat(perf): add env-loader and multi-environment config (#85)"
```

---

### Task 1: 测试数据参数化 (ENT-DATA)

**Files:**

- Create: `data/users.csv`, `data/products.csv`
- Create: `src/utils/csv-loader.js`
- Create: `tests/performance/helpers/data.js`
- Create: `tests/unit/helpers/data.test.js`

#### 4.1.1 CSV 文件格式

```csv
# data/products.csv
id,name,price,category
1,Wireless Mouse,29.99,Electronics
2,Mechanical Keyboard,89.99,Electronics
...
```

#### 4.1.2 csv-loader.js (CJS — Jest 可测)

```javascript
function parseCSV(content) {
  if (content == null) throw new Error('CSV content is required');
  if (!content.trim()) return [];
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim());
    return headers.reduce((obj, h, i) => {
      obj[h] = values[i] || '';
      return obj;
    }, {});
  });
}

function validateColumns(rows, requiredColumns) {
  if (!rows.length) return;
  const missing = requiredColumns.filter((c) => !(c in rows[0]));
  if (missing.length) throw new Error(`Missing columns: ${missing.join(', ')}`);
}

module.exports = { parseCSV, validateColumns };
```

#### 4.1.3 k6 helpers/data.js

```javascript
import { SharedArray } from 'k6/data';
// parseCSV 内联实现 (同 csv-loader.js 逻辑)
const users = new SharedArray('users', () => parseCSV(open('../../../data/users.csv')));
const products = new SharedArray('products', () => parseCSV(open('../../../data/products.csv')));
export function randomUser() {
  return users[Math.floor(Math.random() * users.length)];
}
export function randomProduct() {
  return products[Math.floor(Math.random() * products.length)];
}
```

- [x] **Step 1: Write failing test for csv-loader**

Create `tests/unit/helpers/data.test.js` (8 cases: UT-DATA-01~08)

- [x] **Step 2: Implement csv-loader.js + CSV files + k6 helper**

- [x] **Step 3: Run tests, verify 8 PASS**

- [x] **Step 4: Commit**

```bash
git add src/utils/csv-loader.js data/ tests/unit/helpers/data.test.js tests/performance/helpers/data.js
git commit -m "feat(perf): add CSV parameterization with SharedArray (#85)"
```

---

### Task 2: 负载配置集中管理 (ENT-PROFILE)

**Files:**

- Create: `profiles/smoke.json`, `load.json`, `stress.json`, `spike.json`, `peak.json`
- Create: `src/utils/profile-parser.js`
- Create: `tests/performance/helpers/profile.js`
- Create: `tests/unit/helpers/profile.test.js`

#### 4.2.1 profile JSON 格式

```json
// profiles/smoke.json — vus + duration 模式
{"vus": 5, "duration": "60s", "thresholds": {"http_req_duration": ["p(95)<500"], "http_req_failed": ["rate<0.01"]}}

// profiles/load.json — stages 模式
{"stages": [{"duration": "1m", "target": 20}, {"duration": "3m", "target": 50}, {"duration": "1m", "target": 0}], "thresholds": {...}}
```

#### 4.2.2 profile-parser.js (CJS — Jest 可测)

```javascript
function validateProfile(profile) {
  const hasStages = Array.isArray(profile.stages) && profile.stages.length > 0;
  const hasVus = profile.vus != null && profile.duration != null;
  if (!hasStages && !hasVus) throw new Error('Profile must have stages or vus+duration');
  if (hasStages) {
    profile.stages.forEach((s, i) => {
      if (!s.duration || s.target == null) throw new Error(`Stage ${i} missing duration or target`);
    });
  }
  if (!profile.thresholds) throw new Error('Profile must have thresholds');
  return profile;
}

function loadProfile(jsonString) {
  const profile = JSON.parse(jsonString);
  return validateProfile(profile);
}

module.exports = { loadProfile, validateProfile };
```

- [x] **Step 1: Write failing test for profile-parser**

Create `tests/unit/helpers/profile.test.js` (9 cases: UT-PROF-01~09)

- [x] **Step 2: Implement profile-parser.js + profile JSONs + k6 helper**

- [x] **Step 3: Run tests, verify 9 PASS**

- [x] **Step 4: Commit**

```bash
git add src/utils/profile-parser.js profiles/ tests/unit/helpers/profile.test.js tests/performance/helpers/profile.js
git commit -m "feat(perf): add load profile centralization (#85)"
```

---

### Task 3: k6 脚本改造

**Files:**

- Modify: `tests/performance/smoke.k6.js`, `load.k6.js`, `stress.k6.js`

改造内容:

- `import { randomProduct } from './helpers/data.js'` 替代硬编码 `Math.ceil(Math.random() * 5)`
- `export const options = loadProfile('smoke')` 替代内联 stages 定义

- [x] **Step 1: Refactor smoke/load/stress to use CSV data + profiles**

- [x] **Step 2: Verify k6 inspect passes for each script**

Run: `k6 inspect tests/performance/smoke.k6.js`

- [x] **Step 3: Commit**

```bash
git add tests/performance/smoke.k6.js tests/performance/load.k6.js tests/performance/stress.k6.js
git commit -m "refactor(perf): smoke/load/stress use CSV data + profiles (#85)"
```

---

### Task 4: JMeter 环境适配

**Files:**

- Create: `tests/jmeter/config/staging.properties`, `tests/jmeter/config/production.properties`

```properties
# config/staging.properties
host=staging.example.com
port=3000
protocol=http
```

JMeter 原生支持 `-q <file>` 加载额外 properties，Phase 1 已验证。

- [x] **Step 1: Create staging/production properties**

- [x] **Step 2: Commit**

```bash
git add tests/jmeter/config/staging.properties tests/jmeter/config/production.properties
git commit -m "feat(perf): add JMeter staging/production properties (#85)"
```

---

### Task 5: 开发者体验 (ENT-DX)

**Files:**

- Create: `.env.example`
- Modify: `package.json`

#### 4.5.1 .env.example

```bash
PORT=3000
NODE_ENV=development
AUTH_ENABLED=false
BASE_URL=http://localhost:3000
ENV=local
INFLUXDB_URL=http://localhost:8086
```

#### 4.5.2 npm scripts

| Script   | Command                                                | 用途             |
| -------- | ------------------------------------------------------ | ---------------- |
| `setup`  | `npm install && npm run lint && npm run test:unit`     | 一条命令初始化   |
| `clean`  | `rm -rf reports results coverage data/perf.db*`        | 清理产物         |
| `health` | `bash scripts/preflight-check.sh && npm run test:unit` | Preflight + 测试 |
| `dev`    | `NODE_ENV=development node --watch src/server.js`      | Watch 模式开发   |

- [x] **Step 1: Create .env.example + add npm scripts**

- [x] **Step 2: Verify `npm run setup` passes**

- [x] **Step 3: Commit**

```bash
git add .env.example package.json
git commit -m "feat(dx): add .env.example + setup/clean/health/dev scripts (#85)"
```

---

### Task 6: 文档更新

**Files:**

- Modify: `docs/architecture/architecture.md`
- Modify: `docs/qa/test-cases/index.md`

- [x] **Step 1: Update architecture.md**

新增 §6 Phase 5 基础设施层 (三层配置架构、双模块策略、环境切换数据流、CSV 数据流)

- [x] **Step 2: Update qa/test-cases/index.md**

新增 Phase 5 单元测试用例 (UT-ENV-01~07, UT-DATA-01~08, UT-PROF-01~09)

- [x] **Step 3: Commit**

```bash
git add docs/architecture/architecture.md docs/qa/test-cases/index.md
git commit -m "docs(perf): add Phase 5 architecture + test cases for design review (#85)"
```

---

## 5. Test Case Design

| ID            | 类型        | 描述                                                                                  | 验证方法       |
| ------------- | ----------- | ------------------------------------------------------------------------------------- | -------------- |
| UT-ENV-01~07  | Unit        | env-loader: 解析 env 文件、注释跳过、空行处理、值含等号、默认值                       | Jest           |
| UT-DATA-01~08 | Unit        | csv-loader: 解析 CSV、空文件、null 输入、列校验、products/users 格式                  | Jest           |
| UT-PROF-01~09 | Unit        | profile-parser: JSON 解析、无效 JSON、缺 stages/vus、空 stages、缺 thresholds、双模式 | Jest           |
| INT-ENV-01    | Integration | `k6 run --env ENV=staging smoke.k6.js` 正确加载 staging BASE_URL                      | k6 inspect     |
| INT-DATA-01   | Integration | smoke.k6.js 从 CSV 随机选取商品 ID                                                    | k6 run (smoke) |

**合计:** 24 单元测试 + 2 集成验证

---

## 6. Risk & Mitigation

| #   | Risk                           | Impact                           | Mitigation                                                       |
| --- | ------------------------------ | -------------------------------- | ---------------------------------------------------------------- |
| 1   | k6 `open()` 路径相对于脚本文件 | 不同目录运行 k6 找不到 env/CSV   | helpers 中使用固定相对路径 `../../../env/`，单元测试覆盖路径解析 |
| 2   | env 文件含敏感信息             | 误提交到 Git                     | `.gitignore` 排除 `env/*.env`，仅保留 `.env.example`             |
| 3   | CSV 数据文件体积过大           | SharedArray 加载影响 k6 启动速度 | 测试数据保持轻量 (<1MB)                                          |
| 4   | papaparse CDN 不可用           | k6 脚本无法解析 CSV              | 采用原生 `split()` 解析，不依赖外部 CDN                          |

---

## 7. Prerequisites

| #   | 依赖           | 验证命令                        | 已就绪     |
| --- | -------------- | ------------------------------- | ---------- |
| 1   | Node.js ≥ 18   | `node -v`                       | ✅ v25.8.1 |
| 2   | k6 ≥ 1.0       | `k6 version`                    | ✅ v1.7.0  |
| 3   | Phase 1~4 完成 | 现有 k6 脚本 + helpers/utils.js | ✅ 已有    |
