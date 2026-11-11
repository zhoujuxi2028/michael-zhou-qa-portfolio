# PDEF-022 修复计划：CodeQL workflow 无效 + actionlint 防线

> Defect: PDEF-022 · Issue: [#869](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/869) · 分支: `fix/pdef-022-codeql-workflow`

## 1. 目标

CodeQL 真正运行并上传分析结果；同类 workflow 语义错误以后在 PR 阶段就能被拦下。

## 2. 任务拆分

| # | 任务 | 文件 |
|---|------|------|
| T1 | 删除 `paths-ignore`，排除规则改写进 `paths`（用 `!` 取反） | `.github/workflows/codeql-analysis.yml` |
| T2 | `concurrency` 从 workflow 级移到 job 级（job 级可以使用 `matrix`） | 同上 |
| T3 | 增加 actionlint 步骤（pinned `rhysd/actionlint:1.7.12`，暂不启用 shellcheck） | `.github/workflows/repo-meta-ci.yml` |
| T4 | 登记表、RCA、文档同步 | `defect-register.md`、`postmortems/`、README / CLAUDE.md（如有需要） |

| 决策 | 理由 |
|------|------|
| `paths` 取反，不用 `paths-ignore` | GitHub 不允许两者同时使用；原 `*.map` / `package-lock.json` 本来就不在 `paths` 范围内，直接删除 |
| actionlint 用 Docker 镜像并固定版本 | 不通过 curl 管道下载脚本，结果可复现 |
| 暂不启用 shellcheck 集成 | 避免一次性引入大量与本缺陷无关的告警，另行评估 |

## 3. 验证

| 层级 | 方式 | 通过标准 |
|------|------|----------|
| 静态 | 本地运行 actionlint 检查全部 workflow | 0 error |
| 防线（反向验证） | 临时恢复旧版 CodeQL 文件，运行 actionlint | 报错 |
| CI | 本 PR 触发 CodeQL（`paths` 包含 workflow 文件自身） | 2 个 matrix job 成功 |
| CI | `repo-meta-ci` | 绿 |
| 平台 | code scanning analyses 查询 `tool_name=CodeQL` | > 0 |

## 4. 不在本次范围

- CodeQL 失败告警（#861 的机制只覆盖 Docker Nightly）：后续评估推广
- 首次扫描出的告警按严重度另行分诊
