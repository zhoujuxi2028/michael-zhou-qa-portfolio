# Git Hooks 指南

> 对应 Gap 分析: G-17（文档补全）
>
> 本仓库使用 [Husky](https://typicode.github.io/husky/) 管理 git hooks，配合 CI workflow `commit-guard.yml` 作为兜底。本指南说明每个 hook 的行为、绕过方式、排错手册。

## 目录

- [安装 / 激活](#安装--激活)
- [Hook 清单](#hook-清单)
- [commit-msg](#commit-msg)
- [pre-commit](#pre-commit)
- [pre-push](#pre-push)
- [应急绕过环境变量](#应急绕过环境变量)
- [CI 兜底](#ci-兜底)
- [排错 FAQ](#排错-faq)
- [后续演进路径](#后续演进路径)

---

## 安装 / 激活

```bash
# 仓库根目录
npm install          # 触发 husky prepare 脚本（安装 .husky/_/）
```

验证：`ls .git/hooks/` 应可见 husky 注入的钩子转发脚本。

---

## Hook 清单

| Hook | 触发时机 | 职责 | Gap 覆盖 |
|------|---------|------|---------|
| `commit-msg` | `git commit` 完成消息编辑后 | Conventional Commits 校验（委派给 @commitlint/cli，规则见 `commitlint.config.js`） | G-06, G-07, G-12 |
| `pre-commit` | `git commit` 开始前 | Secret scan（内置）+ lint-staged 委派（规则见 root `package.json` + 各项目嵌套配置） | G-01, G-02, G-05, G-08, G-11 |
| `pre-push` | `git push` 前 | 受保护分支拦截 + performance-testing-platform 质量门控 | G-09, G-10 |

---

## commit-msg

**执行器**: [@commitlint/cli](https://github.com/conventional-changelog/commitlint) v20，规则定义在 `commitlint.config.js`。Hook 内部调用 `npx --no-install commitlint --edit "$1"`。

**规则汇总**（`extends: @commitlint/config-conventional` + 项目自定义）：

| 项 | 规则 | 级别 |
|---|------|-----|
| Subject 格式 | `<type>(<scope>)?!?: <desc>` | error（2） |
| type 枚举 | `feat\|fix\|docs\|style\|refactor\|test\|chore\|ci\|perf\|build\|revert` | error（2） |
| type 大小写 | 必须小写（`type-case`） | error（2） |
| Subject 长度 | ≤ 72 字符（`header-max-length`） | error（2） |
| Subject 末尾 | 禁止 `.`（`subject-full-stop`） | error（2） |
| Body 空行 | `body-leading-blank` | error（2） |
| Body 行宽 | ≤ 100 字符（`body-max-line-length`） | warning（1） |
| Footer 空行 | `footer-leading-blank` | warning（1） |
| Merge / fixup! / squash! | 自动 ignore | — |

**示例**：

```
feat(perf): add soak test profile

支持 10h 长跑场景, RPS=500。

Refs: #123
Co-authored-by: Alice <alice@example.com>
```

**故障降级**：若 `node_modules` 缺失（贡献者未 `npm install`），hook 自动退回内建正则，避免完全卡死工作流。

---

## pre-commit

架构：**Secret scan（内置）** → **lint-staged 委派**。

### 1. Secret scan (G-01)

扫描新增行（`+` 开头的 diff），使用内置正则库：

- AWS Access Key ID / Secret Key
- GitHub PAT (`ghp_ / gho_ / ghu_ / ghs_ / ghr_`)
- PEM 私钥头 `-----BEGIN ... PRIVATE KEY-----`
- Slack tokens (`xox[baprs]-...`)
- Google API key (`AIza...`)
- JWT 三段式
- 通用 `SECRET/TOKEN/PASSWORD/API_KEY/PRIVATE_KEY = "..."` 赋值（排除 `${...}` 模板和 `process.env` 引用）

**排除**：`package-lock.json`、`*.min.js`、`*.map`

**误报处理**：在仓库根建 `.secretsallow`（按需创建，当前未提交模板），每行一个 `grep -E` 正则：

```
# .secretsallow
AKIAIOSFODNN7EXAMPLE        # 公开测试向量
AIzaSy[A-Za-z0-9_-]{33}DEMO  # 演示项目固定值
```

### 2. lint-staged 委派 (G-08)

执行器：[lint-staged](https://github.com/lint-staged/lint-staged) v16。Hook 内部调用 `npx --no-install lint-staged --concurrent false`。

**配置层级**（按文件路径就近匹配）：

| 配置位置 | 范围 | 规则 |
|---------|-----|------|
| root `package.json` | `*.py` | `ruff check && ruff format --check`（探测 venv → PATH → `python3 -m ruff`） |
| root `package.json` | `microservice-testing-platform/**/*.js` | `eslint`（项目 `node_modules` 存在时触发） |
| root `package.json` | `playwright-demo/**/*.{js,ts}` | `eslint`（项目 `node_modules` 存在时触发） |
| `performance-testing-platform/package.json` | `src/**/*.js`, `tests/**/*.js`, `scripts/**/*.js` | `eslint --fix` + `prettier --write` |
| `api-testing-demo/package.json` | 项目内 lint-staged 配置 | 见该项目 `package.json` |

**注**：lint-staged 对每个 staged 文件选择**最近**的配置，因此无需在 root 重复定义项目内已覆盖的规则。

**故障降级**：`node_modules` 缺失时 hook 输出提示但不阻断——CI `commit-guard.yml` 兜底。

---

## pre-push

### A. 受保护分支拦截 (G-10)

直推以下分支一律阻断：

- `refs/heads/main`
- `refs/heads/master`
- `refs/heads/release/*`

应急绕过：`ALLOW_DIRECT_PUSH=1 git push origin main`（仅限管理员）。

### B. performance-testing-platform 质量门控

当本次 push 包含 `performance-testing-platform/` 变更时执行：

| 步骤 | 命令 | 失败后果 |
|------|------|----------|
| 1. Lint | `npm run lint` | 阻断 |
| 2. 格式 | `npm run format:check` | 阻断 |
| 3. 单元测试 | `npm run test:unit` | 阻断 |
| 4. 覆盖率 | `npm run test:coverage`（stmt ≥ 79%，branch ≥ 70%，func ≥ 80%，line ≥ 80%） | 阻断 |
| 5. 集成测试 | `bash scripts/integration-test.sh` | 阻断；Docker 不可用时仅警告 |

---

## 应急绕过环境变量

| 变量 | 效果 | Hook | 使用前提 |
|------|------|------|----------|
| `COMMIT_MSG_SKIP=1` | 跳过 commit-msg 全部校验 | commit-msg | 需在 PR review 中说明原因 |
| `SKIP_SECRET_SCAN=1` | 跳过 secret 扫描 | pre-commit | 管理员审批 |
| `SKIP_LINT_STAGED=1` | 跳过 lint-staged 委派（全部 lint） | pre-commit | 管理员审批；CI 仍会校验 |
| `ALLOW_DIRECT_PUSH=1` | 允许直推受保护分支 | pre-push | 仅限管理员紧急修复 |
| `--no-verify` | Git 原生跳过所有 hook | 全部 | **禁止常规使用**；CI `commit-guard.yml` 仍会拦截 |

---

## CI 兜底

[`.github/workflows/commit-guard.yml`](../../.github/workflows/commit-guard.yml) 在 PR 上强制运行三个 job：

| Job | 对应 Gap | 作用 |
|-----|---------|------|
| `conventional-commits` | G-13 | 扫描 PR 内所有非 merge commit 的 subject |
| `secret-scan` | G-14 | 扫描 PR diff 的新增行（与 pre-commit 同一组正则） |
| `hook-syntax` | — | `sh -n` 校验三个 hook 文件 |

这些 job 不可绕过——即使贡献者用 `git commit --no-verify` 绕过本地 hook，PR 仍会在 CI 红灯。

---

## 排错 FAQ

| 问题 | 原因 | 解决 |
|------|-----|------|
| `pre-commit` 提示 `未找到 ruff` | 根 venv 未建或未安装 ruff | `python3 -m venv venv && ./venv/bin/pip install ruff` |
| `ESLint 失败 (api-testing-demo)` | 项目 node_modules 未安装 | `(cd api-testing-demo && npm install)` |
| `pre-push` 在 push 到 main 时被拦截 | G-10 受保护分支保护 | 改走 PR；或管理员用 `ALLOW_DIRECT_PUSH=1` |
| `Secret scan` 把公开测试向量当密钥 | 正则命中示例字符串 | 在 `.secretsallow` 添加对应正则 |
| commit-msg 拦截 `Merge branch 'x'` | 不会发生 | merge commit 已在 hook 开头 whitelist |
| 新分支首次 push 时 pre-push 报错 `LOCAL_SHA^1 不存在` | 单 commit 新分支 | 已 fallback 到仅检查 `LOCAL_SHA` |

---

## 后续演进路径

以下为 **可选** 增强项：

| 演进项 | 当前实现 | 备注 | Gap 编号 |
|-------|---------|------|---------|
| lint-staged | ✅ 已接入 `lint-staged@16` + root `package.json` 配置 | 完成 | G-08 |
| commitlint | ✅ 已接入 `@commitlint/cli@20` + `@commitlint/config-conventional@20` | 完成；规则见 `commitlint.config.js` | G-12 |
| gitleaks | 内建正则（pre-commit + CI） | 可选引入 `gitleaks` 二进制或 `gitleaks-action`，以获得 Trufflehog/Gitleaks 等更丰富的 entropy 检测；当前内建正则覆盖主流 8 类密钥 | G-01 增强 |
| IDE 集成 | `commitlint.config.js` 已可被 VSCode `commitlint` 插件识别 | 无需额外配置 | — |
