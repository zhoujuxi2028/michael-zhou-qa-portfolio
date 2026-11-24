# 仓库优化 Backlog（Optimization Backlog）

> **范围:** 仓库级优化工作项（CI / 代码 / 文档 / 卫生）  
> **编号:** `OPT-NNN` 全局递增，后续审计续号，永不复用；真正失效类同步登记 [defect-register](defect-tracking/defect-register.md)（`PDEF-NNN`）  
> **状态:** `Planned` → `In progress` → `Done` / `Issue`（已转 GitHub Issue）/ `Won't fix`

## 审计批次

| 批次 ID | 日期 | 方法 | 发现 | 本轮处理 |
|---------|------|------|------|----------|
| AUDIT-2026-11-24 | 2026-11-24 | 3 路只读审计（CI workflows / 子项目代码 / 文档与卫生） | 约 70 项 | Batch A + D；其余转 Issue |

批次分组：**A** 自动化失效 · **B** CI 加固/提速 · **C** 仓库卫生 · **D** 文档一致性 · **I** 大改动（仅开 Issue）

## Batch A — 自动化失效（PR: `fix/automation-stale-paths`）

| OPT | PDEF | 问题 | 证据 | 修复 | 状态 |
|-----|------|------|------|------|------|
| OPT-001 | PDEF-023 | Dependabot 20/22 个 `directory:` 指向目录迁移前旧路径 | #847（2026-11-08）迁入 `projects/<cat>/` 后，子项目 Dependabot PR 停在 2026-11-03 | 全部改为新路径 | In progress |
| OPT-002 | PDEF-023 | 新项目无 Dependabot 条目 | sql / ivi / diag / av 均无 pip 条目 | 新增 4 个 pip 条目 | In progress |
| OPT-003 | PDEF-024 | CODEOWNERS 路径全部过期，且缺新项目 | `/iwsva-cypress-e2e/` 等根路径不存在 | 改为新结构 + 补全 | In progress |
| OPT-004 | PDEF-025 | `k8s-ci.yml` build-status 不因 unit-tests 失败/取消而失败 | 仅判断 `code-quality.result == failure` | 任一 needs 非 success 即失败 | In progress |
| OPT-005 | PDEF-026 | `setup-node-project` 的 `npm ci \|\| npm install` 掩盖 lockfile 漂移 | `action.yml` L32 | 去掉 fallback | In progress |

## Batch D — 文档一致性（PR: `docs/consistency-sync`）

| OPT | 问题 | 证据 | 修复 | 状态 |
|-----|------|------|------|------|
| OPT-006 | label-strategy / workaround-tracking 路径错误 | `CLAUDE.md` / `README.md` 写 `docs/guides/`，实际 `docs/process/` | 修正路径 | Planned |
| OPT-007 | sql-testing-demo CLAUDE.md 列为 "—" | 文件实际存在 | 填写链接 | Planned |
| OPT-008 | `docs/` 下 8 个相对链接断链 | grafana-sqlite plan ×2、learning/phase2 ×4、label-strategy、req-template | 修正或删除 | Planned |
| OPT-009 | 测试数不一致 | sid-iam 168 vs 138；security / perf unit / diag / av / iwsva 声称值与代码计数不符 | collect-only 实测后统一 | Planned |
| OPT-010 | 端口表缺 80 / 4444 / 4566；README 副本不全 | compose 文件映射 DVWA / Selenium Grid / LocalStack | 补全并排序，README 改链接 | Planned |
| OPT-011 | README 表格断裂、重复段、分类不一 | L144 空行；L220 重复 "GitHub Actions"；sql 分类 系统测试 vs 数据库测试 | 修正 | Planned |
| OPT-012 | CLAUDE.md Python venv/pytest 段重复 3 处 | "Virtual Environment" / "Python Projects" / "Python 项目" | 合并 | Planned |
| OPT-013 | AGENTS.md 项目数过期 | "~12" vs 实际 17 | 更新 | Planned |

## Batch I — 大改动（仅开 Issue）

| OPT | 主题 | 要点 | 状态 |
|-----|------|------|------|
| OPT-014 | Node 18/20 → 22 LTS | 13 处 Node 18（perf / soak / microservice / composite 默认值）；cicd-demo `.nvmrc` 20；需先核对 `engines` | Planned |
| OPT-015 | Python 工具链统一 | 统一 ruff + ruff format；拆 requirements-dev；`>=` 改 `==`（security / sql / robot）；4 个项目补 pyproject | Planned |
| OPT-016 | Actions SHA pin | 第三方 action（trivy / sbom / EnricoMi / kind / zap / bats）固定 SHA；Dependabot github-actions 已存在 | Planned |
| OPT-017 | 硬编码等待改条件等待 | iwsva Page Objects `cy.wait(ms)`；selenium / k8s chaos / sid-iam `time.sleep`；cicd-demo `commands.js` | Planned |
| OPT-018 | Batch B 汇总 Issue | 子项 OPT-020 ~ OPT-034 | Planned |
| OPT-019 | Batch C 汇总 Issue | 子项 OPT-035 ~ OPT-052 | Planned |

## Batch B — CI 加固/提速（归属 OPT-018）

| OPT | 问题 | 位置 |
|-----|------|------|
| OPT-020 | 5 个 job 无 `timeout-minutes` | `security-tests.yml` |
| OPT-021 | 无 `timeout-minutes` | `api-testing-ci.yml`、`k8s-ci.yml` build-status、`setup-labels.yml` |
| OPT-022 | `paths:` 未含 `.github/actions/**`，composite 变更不触发 | api / k8s / microservice / playwright / perf / soak |
| OPT-023 | PR `paths:` 未含 workflow 自身 | `k8s-ci.yml`、`security-scan.yml` |
| OPT-024 | 过期分支触发 `feature/performance-testing` | `performance-ci.yml` |
| OPT-025 | Playwright 浏览器无缓存 | `playwright-ci.yml` |
| OPT-026 | Docker 构建无层缓存 | `security-scan.yml`、`docker-tests.yml` |
| OPT-027 | setup 三步重复 5 次，未用 composite（需先加 `node-version-file` 输入） | `cicd-demo-pr.yml`、`cicd-demo-deploy.yml` |
| OPT-028 | setup-python 块重复约 12 次，未用 composite | sql / ai / diag / av / ivi / robot |
| OPT-029 | `rebot ... \|\| true` 掩盖合并失败 | `robot-framework-ci.yml` |
| OPT-030 | summary 下载 `continue-on-error` 静默空表 | `security-tests.yml` |
| OPT-031 | `npm audit` 重复执行且二次掩盖 | `security-scan.yml` |
| OPT-032 | 权限过宽 | `docker-tests.yml`（`pull-requests: write`）、`setup-labels.yml` |
| OPT-033 | 22/35 个 `upload-artifact` 无 `retention-days` | 多个 workflow |
| OPT-034 | composite 用 `setup-node@v6`，workflow 用 `@v7`；selenium-demo 无 CI | `setup-node-project/action.yml`、`.github/workflows/` |

## Batch C — 仓库卫生（归属 OPT-019）

| OPT | 问题 | 位置 |
|-----|------|------|
| OPT-035 | Newman 报告 / 日志已提交（约 5 MB） | `api-testing-demo/{reports,logs,newman}/` |
| OPT-036 | Obsidian 个人文件误提交 | `.obsidian/*.json`、`未命名.canvas`、`2026-11-19.md`（commit `8a9fac73`） |
| OPT-037 | 运行产物已提交 | k8s `reports/hpa-stress/`、security `reports/zap_*.html`、`docs/qa/reports/logs-stage4/*.log` |
| OPT-038 | `.gitignore` 缺口 + 过期路径 | 缺 `.obsidian/`、`*.canvas`、`.env`、`htmlcov/`、`allure-results/` 等；`security-testing-demo/.claude/` 旧路径 |
| OPT-039 | `pytest.ini` 与 `[tool.pytest.ini_options]` 并存，后者被忽略 | k8s、sid-iam、selenium |
| OPT-040 | 18 个废弃 Cypress 文件 | `iwsva-cypress-e2e/archive/` |
| OPT-041 | 双 `conftest.py` | `av-testing-demo/` 根 + `tests/` |
| OPT-042 | dev 草稿测试已提交 | `selenium-demo/tests/dev/` |
| OPT-043 | 空 `.worktrees/` 残留 | 仓库根 |
| OPT-044 | `mapfile` 不兼容 macOS bash 3.2 | `scripts/check-markdown-links.sh` |
| OPT-045 | `proj:` labels 11 个 vs 17 个项目 | `setup-labels.yml` |
| OPT-046 | 标准 `docs/` 模板未对齐 | api / playwright / selenium / sid-iam / iwsva / cicd / k8s / robot / ai / llm-agent |
| OPT-047 | 缺 CLAUDE.md 与 `docs/` | `av-testing-demo` |
| OPT-048 | 运行时 `pytest.skip` 过多，可能空跑绿灯 | `k8s-auto-testing-platform/tests/` |
| OPT-049 | 永不执行的 skip 测试 + 非 strict xfail | `security-testing-demo/tests/test_auth.py` |
| OPT-050 | 无测试 | `llm-agent-tutorial` |
| OPT-051 | iwsva "77 tests" 为文档用例数，非自动化数（随 OPT-009 一并处理） | `iwsva-cypress-e2e/README.md` |
| OPT-052 | ruff 已配置但未声明依赖 | `security-testing-demo` |

## 变更日志

| 日期 | 变更 |
|------|------|
| 2026-11-24 | 创建；登记 AUDIT-2026-11-24 共 52 项（OPT-001 ~ OPT-052）；Batch A 开工 |
