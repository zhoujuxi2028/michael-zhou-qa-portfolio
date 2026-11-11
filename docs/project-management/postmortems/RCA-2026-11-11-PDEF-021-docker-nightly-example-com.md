# PDEF-021: Docker Nightly 因 example.com 移除 `<h1>` 连续 44 次失败 — RCA

**缺陷 ID**: PDEF-021 · **Issue**: [#859](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/859)
**严重度**: P2 Medium（只影响 nightly，不阻塞 PR Gate）
**发现日期**: 2026-11-11
**修复日期**: 2026-11-11（PR [#860](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/pull/860)，`47d1709f`）
**影响范围**: `infra/cicd-demo` / `CICD Demo / Docker Nightly`，2026-09-29 ~ 2026-11-11

---

## 1. 现象

| 项 | 内容 |
|----|------|
| 失败 run | 2026-09-29 起连续 44 次 schedule，最新 [#42943248609](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/actions/runs/42943248609) |
| 结果 | Cypress exit 6：`02-ui-tests.cy.js` 3/9 通过；API spec 8/8、Newman 均通过 |
| 报错 | `Expected to find element: h1, but never found it` |

## 2. 根因

| 层级 | 原因 |
|------|------|
| 直接原因 | example.com 全站改版：去掉 `<h1>`，只保留多语言 `<p>`，并声明 *"avoid relying on it for testing and monitoring purposes"* |
| 设计缺陷 | UI E2E 断言不受控的第三方站点 DOM |
| 流程缺口 | nightly 连续失败 44 天，没有告警，也没有建 Issue |

> **更正 PDEF-020 的结论**：当时认为是"Azure CDN 在不同地区返回不同内容"，实际是 example.com 全站改版（本地 `curl` 同样拿不到 `<h1>`）。

## 3. 修复

| 文件 | 变更 |
|------|------|
| `infra/cicd-demo/test-site/index.html` | 新增自托管静态页 |
| `infra/cicd-demo/docker-compose.yml` | 新增 `test-site`（nginx:1.27-alpine + healthcheck），cypress 依赖它 healthy 后再启动 |
| `infra/cicd-demo/cypress/e2e/02-ui-tests.cy.js` | 7 处 `cy.visit` 改为 `Cypress.env('siteUrl')` |
| `infra/cicd-demo/.gitignore` | 例外规则 `!test-site/*.html` |

**验证**：本地 9/9 通过（6 秒，原来 3 分钟以上）；反向验证去掉 `<h1>` 后得到 3 过 6 挂，与 CI 现象一致。

## 4. 排查中的附带发现

本机 Docker 客户端会往容器注入 `HTTP_PROXY=127.0.0.1:7890`，这个地址在容器内不可达（与 PDEF-009 同源），导致：

- busybox `wget` 不认 `no_proxy`，健康检查失败 → 加 `-Y off`
- Cypress 的 baseUrl 预检失败 → cypress 服务显式设置 `NO_PROXY=test-site,...`

## 5. 预防 / 后续

| # | 动作 | 状态 |
|---|------|------|
| 1 | 规范：E2E 不得断言第三方站点 DOM，改用自托管目标 | ✅ 本次落地 |
| 2 | Nightly 失败自动建 Issue 或告警 | ✅ [#861](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/861)（PR #865，`c8c58df5`；dry-run 验证 #868 建→评论→关闭） |
| 3 | `robot-framework-demo` 3 个 suite 仍依赖 example.com（TC-NAV-002 的 "More information"、`iana.org` 等文本已不存在） | ✅ [#862](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/862)（PR #865；本地 `target-web`，CI 全量 9/9） |
| 4 | `docker-tests.yml` 中 `compose wait ... \|\| true` 可能读到运行中容器的 exit 0（假绿） | ✅ [#863](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/863)（PR #865；先断言 `exited` 再读 exit code） |
