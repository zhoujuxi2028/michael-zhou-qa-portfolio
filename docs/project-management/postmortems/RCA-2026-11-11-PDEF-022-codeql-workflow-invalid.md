# PDEF-022: CodeQL workflow 自创建起无效，1244 次运行从未成功 — RCA

**缺陷 ID**: PDEF-022 · **Issue**: [#869](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/869) · **PR**: [#870](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/pull/870)
**严重度**: P1 High（安全扫描完全缺失，不阻塞 PR）
**发现日期**: 2026-11-11（排查 PR #865 合并后 main 上的红灯时发现）
**影响范围**: `codeql-analysis.yml`，2026-05-25 ~ 2026-11-11

---

## 1. 现象

| 项 | 内容 |
|----|------|
| 运行记录 | 总计 1244 次，failure 1244 次，success 0 次；每次 0 个 job |
| code scanning | `tool_name=CodeQL` 的分析结果数为 0，只有 Trivy 的结果 |
| 文档宣称 | README / CLAUDE.md："CodeQL 代码语义漏洞扫描 (XSS, SQLi, path traversal)" |

## 2. 根因

| # | 错误（actionlint 1.7.12） | 引入 |
|---|---------------------------|------|
| 1 | workflow 级 `concurrency.group` 引用 `matrix.language`，workflow 级别只能用 `github` / `inputs` / `vars` 上下文 | 2026-05-25 #135（创建时就有） |
| 2 | `push` / `pull_request` 同时使用 `paths` 和 `paths-ignore` | 2026-07-17 #442（PDEF-013 修复时引入） |

GitHub 在启动阶段拒绝无效的 workflow：运行记录显示为 failure，但没有任何 job 和日志，在 PR 上看起来就像普通的红灯。

### 为什么 5 个多月没人发现

| 缺口 | 说明 |
|------|------|
| 检查只验证语法 | `repo-meta-ci` 用 `yaml.safe_load`，两个错误在 YAML 语法上都是合法的 |
| 不是必须通过的检查 | CodeQL 不在 branch protection 的 required checks 中，PR 照样能合并 |
| 修复时没有验证 | PDEF-013（#442）修改该文件时，没有确认修改后能真正跑起来 |
| 没有告警 | 和 PDEF-021 一样，红灯长期存在而无人跟进 |

## 3. 修复

| 文件 | 变更 |
|------|------|
| `codeql-analysis.yml` | 排除规则改为在 `paths` 中用 `!` 取反，删除 `paths-ignore`；`concurrency` 移到 job 级 |
| `repo-meta-ci.yml` | 新增 actionlint 步骤（`rhysd/actionlint:1.7.12`，暂不启用 shellcheck / pyflakes） |

**验证**：actionlint 检查全部 20 个 workflow 为 0 错误；把旧版 CodeQL 文件放回后，actionlint 步骤以 exit 1 失败；PR #870 上 CodeQL 能正常创建并运行 job。

## 4. 预防 / 后续

| # | 动作 | 状态 |
|---|------|------|
| 1 | `repo-meta-ci` 增加 actionlint 语义检查 | ✅ 本次落地 |
| 2 | 修改 workflow 的 PR 必须看到该 workflow 真正运行过（不只是 lint 通过） | ✅ 写入本 RCA，Stage 4 检查项 |
| 3 | 把 CodeQL 加入 branch protection 的 required checks | ⏳ 待维护者评估 |
| 4 | 把 #861 的失败告警机制推广到 CodeQL 等其他 workflow | ⏳ 待评估 |
| 5 | 首次 CodeQL 扫描出的告警按严重度分诊 | ⏳ 待扫描完成 |
