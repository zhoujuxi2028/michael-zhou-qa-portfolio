# Phase 5 — 基础设施升级 📋 Planned

> 来源: Postmortem 后对标企业性能测试平台最佳实践，原 Phase 5 (38 条) 按依赖关系拆分为 Phase 5/6/7

## 5.1 目标

为后续测试能力扩展和 CI/CD 增强打好基础，完成多环境配置、测试数据参数化、负载配置集中管理、开发者体验改进。

| 维度 | 当前状态 | 目标状态 |
|------|---------|---------|
| 环境管理 | 锁定 localhost | dev/staging/prod 配置切换 |
| 测试数据 | 5 条硬编码商品 | CSV 参数化 + SharedArray 动态加载 |
| 负载配置 | 每个脚本重复定义 stages | 集中管理可复用 profiles |
| 开发者体验 | 无 .env.example，缺 setup/clean 脚本 | 一条命令初始化 + 清理 |

## 5.2 用户故事

| ID | 用户故事 | 关联需求 |
|----|---------|---------|
| US-23 | 作为性能工程师，我想通过 `--env staging` 切换目标环境，以便在不同环境执行相同测试 | ENT-ENV |
| US-24 | 作为性能工程师，我想从 CSV 文件加载测试数据（用户/商品），以便模拟真实业务数据分布 | ENT-DATA |
| US-25 | 作为性能工程师，我想复用统一的负载配置（如 "standard-load", "peak-traffic"），以便跨脚本保持一致 | ENT-PROFILE |
| US-30 | 作为新加入的开发者，我想通过 `npm run setup` 一条命令完成环境初始化，以便快速上手项目 | ENT-DX |

## 5.3 需求列表

### 5.3.1 多环境配置（ENT-ENV）

| ID | 需求 | 优先级 | 工作量 |
|----|------|--------|--------|
| ENT-ENV-01 | 创建 `env/` 目录，含 `local.env` / `staging.env` / `production.env`，定义 BASE_URL / AUTH_ENABLED / DB 等变量 | P0 | 小 |
| ENT-ENV-02 | k6 环境加载器: `helpers/env.js` 解析环境文件，导出配置对象；k6 通过 `--env ENV=staging` 切换 | P0 | 小 |
| ENT-ENV-03 | JMeter 环境适配: 对应 `config/staging.properties` / `config/production.properties`，通过 `-q` 加载 | P1 | 小 |

### 5.3.2 测试数据参数化（ENT-DATA）

| ID | 需求 | 优先级 | 工作量 |
|----|------|--------|--------|
| ENT-DATA-01 | 创建 `data/users.csv` + `data/products.csv`，k6 用 SharedArray + papaparse 加载 | P0 | 小 |
| ENT-DATA-02 | k6 数据驱动改造: smoke/load/stress 脚本从 CSV 读取商品 ID 和用户凭证，替代硬编码 | P1 | 中 |

### 5.3.3 负载配置集中管理（ENT-PROFILE）

| ID | 需求 | 优先级 | 工作量 |
|----|------|--------|--------|
| ENT-PROFILE-01 | 创建 `profiles/` 目录，含 `smoke.json` / `load.json` / `stress.json` / `spike.json` / `peak.json`，定义 stages + thresholds | P1 | 小 |
| ENT-PROFILE-02 | k6 脚本改造: import profile 替代内联 stages 定义，实现跨脚本配置复用 | P1 | 小 |

### 5.3.4 开发者体验改进（ENT-DX）

| ID | 需求 | 优先级 | 工作量 |
|----|------|--------|--------|
| ENT-DX-01 | 创建 `.env.example` 文件，列出所有环境变量及默认值 | P1 | 小 |
| ENT-DX-02 | 新增 npm scripts: `setup` (install + lint + test)、`clean` (清理 reports/data/coverage)、`health` (preflight + test) | P1 | 小 |
| ENT-DX-03 | 新增 npm script: `dev` (NODE_ENV=development 启动，watch mode) | P2 | 小 |

### 5.3.5 单元测试（ENT-TEST）

| ID | 需求 | 优先级 | 工作量 |
|----|------|--------|--------|
| ENT-TEST-01 | env loader 单元测试: 解析 env 文件、缺失文件兜底、变量覆盖 | P0 | 小 |
| ENT-TEST-02 | CSV 加载单元测试: SharedArray 加载、空文件处理、字段校验 | P0 | 小 |
| ENT-TEST-03 | profile 解析单元测试: JSON 加载、缺失 profile 报错、stages 格式校验 | P0 | 小 |

## 5.4 Scope 确认

| 模块 | In Scope | Out of Scope |
|------|----------|--------------|
| **ENT-ENV 多环境** | env/ 配置文件 + k6 env loader + JMeter properties | 真实 staging/prod 环境部署 |
| **ENT-DATA 测试数据** | CSV 参数化 + SharedArray | 数据库 seeding、动态数据生成 API |
| **ENT-PROFILE 负载配置** | profiles/ JSON 集中管理 | GUI 配置界面 |
| **ENT-DX 开发者体验** | .env.example + npm run setup/clean/health | GUI 开发工具 |
| **ENT-TEST 单元测试** | env/CSV/profile 模块的单元测试 | 集成测试、E2E 测试 |

## 5.5 可行性评估

| 维度 | 评估 | 结论 |
|------|------|------|
| k6 SharedArray + papaparse | k6 内置 SharedArray，papaparse 为 npm 包可 bundle | ✅ 可行 |
| k6 env 文件加载 | k6 支持 `open()` 读文件 + `__ENV` 变量 | ✅ 可行 |
| profile JSON 加载 | k6 支持 `JSON.parse(open())` 读取本地 JSON，无需额外依赖 | ✅ 可行 |

## 5.6 依赖识别

| 依赖 | 说明 | 关联需求 | 状态 |
|------|------|---------|------|
| k6 SharedArray | 内置模块，无需额外安装 | ENT-DATA | ✅ 已有 |
| papaparse | CSV 解析，需 k6 bundle (webpack/esbuild) 或 k6 内置 CSV | ENT-DATA | 需评估 |

## 5.7 需求 Checklist

| # | 检查项 | 状态 |
|---|--------|------|
| 1 | 目标明确 | ✅ 基础设施升级，4 个维度 |
| 2 | 完整用户故事 | ✅ US-23/24/25/30 |
| 3 | Scope 已确认 | ✅ 5 个模块，明确 In/Out |
| 4 | 可行性评估 | ✅ 3 项评估，全部可行 |
| 5 | 依赖已识别 | ✅ 2 项依赖 |
| 6 | 需求已编号 | ✅ 5 组 13 条: ENT-ENV(3) + ENT-DATA(2) + ENT-PROFILE(2) + ENT-DX(3) + ENT-TEST(3)（ENT-TEST-04 归 Phase 6） |
| 7 | 需求描述已写入 requirements.md | ✅ 本文档 §5.1~5.6 |
