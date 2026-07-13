# PDEF-002: `CICD Demo / PR Gate` 汇总 job 因继承 working-directory 启动失败 — RCA

**缺陷 ID**: PDEF-002
**严重度**: P2 Medium
**发现日期**: 2026-05-24
**修复日期**: 2026-05-24
**影响范围**: 仓库级 `.github/workflows/cicd-demo-pr.yml` — `pr-gate` 汇总 job（Branch Protection 的 Required Check）

---

## 1. 问题描述

PR #249（`copilot/fix-cicd-demo-issue-242`，新增 `cicd-demo` 的 PR/Deploy 流水线）首跑 `CICD Demo / PR Gate` 即报红（run #26346396345，job #77556998942，exit code 1）。所有上游 job（`Lint` / `Unit Tests` / `Build` / `Security Scan`）均 `success`，但汇总 job 启动阶段直接失败。

**错误信息**：

```
##[error]An error occurred trying to start process '/usr/bin/bash' with working directory
'/home/runner/work/michael-zhou-qa-portfolio/michael-zhou-qa-portfolio/cicd-demo'.
No such file or directory
```

**影响**：

- `pr-gate` 是 Branch Protection 唯一的 Required Check，假阴性会阻塞所有 `cicd-demo/**` PR 合并
- 与实际业务代码无关，纯 CI 配置缺陷
- 误导 reviewer：4 个上游 job 全绿但汇总闸口报红，与"门面 job 应稳定汇总"的设计意图冲突

---

## 2. 根本原因（Root Cause）

`cicd-demo-pr.yml` 在 workflow 顶层声明了：

```yaml
defaults:
  run:
    working-directory: cicd-demo
```

该默认值会被**所有 job 的所有 `run` step**继承。`lint` / `unit-tests` / `build` / `security-scan` 都执行了 `actions/checkout@v6`，因此 `cicd-demo/` 目录存在，继承默认目录无问题。

但 `pr-gate` 是**纯汇总 job**，其唯一 step 仅 `echo` 上游 `needs.*.result`，无需源代码，故没有 checkout。Runner 试图在不存在的 `cicd-demo/` 目录中启动 bash，导致 `/usr/bin/bash` 进程创建失败（ENOENT）。

**为何 PR 自检未捕获**：

- 本地 `act` / `yamllint` 仅校验 YAML 结构合法；
- GitHub Actions 文档对 `defaults.run.working-directory` 的"无 checkout 时不生效"行为未醒目提示；
- Code review 时焦点集中在 4 个真正跑测试的 job，忽略了汇总 job 的执行环境。

---

## 3. 修复

在 `pr-gate` job 内显式覆盖 workflow 级默认：

```yaml
pr-gate:
  name: CICD Demo / PR Gate
  runs-on: ubuntu-latest
  needs: [lint, unit-tests, build, security-scan]
  if: always()
  timeout-minutes: 2
  defaults:
    run:
      working-directory: .
  steps:
    - name: Aggregate PR check results
      shell: bash
      run: |
        ...
```

`.` 表示 `$GITHUB_WORKSPACE` 仓库根目录，runner 总是预先创建该目录，bash 进程必然能启动。

**为何不选其他方案**：

- ❌ 让 `pr-gate` 执行 `actions/checkout` —— 多耗 ~10s 仅为绕过配置问题，浪费 runner 资源。
- ❌ 删除 workflow 级 `defaults.run.working-directory` —— 会导致每个上游 job 的每个 `npm` / `helm` step 都得重复声明 `working-directory: cicd-demo`，可读性显著下降。
- ✅ 在汇总 job 内单点覆盖 —— 最小变更，意图明确。

---

## 4. 验证

- [x] `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/cicd-demo-pr.yml'))"` 通过
- [x] 本地 `act -j pr-gate` dryrun（结构校验）OK
- [ ] PR #249 重跑 `CICD Demo / PR Gate` 转绿（依赖推送后 CI）

---

## 5. 改进措施（Preventive Actions）

| 编号 | 行动 | 负责人 | 截止 | 状态 |
|------|------|--------|------|------|
| PA-1 | 在 `docs/process/` 新增 CI lint 提示：workflow 级 `defaults.run.working-directory` 若设置，需检查每个 job 是否会被影响（尤其是无 checkout 的汇总 job） | QA Lead | 2026-06-15 | ✅ 2026-07-13 完成 |
| PA-2 | 评审现有其他 workflow（`repo-meta-ci.yml`、`security-scan.yml` 等）是否存在相同隐患 | QA Lead | 2026-06-15 | ✅ 2026-07-13 完成 — 零问题，所有无 checkout job 均已显式覆盖 |
| PA-3 | 在 `cicd-demo/README.md` "Required Check" 章节加注：`pr-gate` job 不 checkout，配置时需保证其 `working-directory` 可达 | Owner | 2026-06-01 | ✅ 2026-07-13 完成 |

---

## 6. 时间线

| 时间（UTC） | 事件 |
|------------|------|
| 2026-05-23 23:29 | PR #249 创建（`feat(cicd-demo): add PR pipeline and deploy pipeline`） |
| 2026-05-23 23:30 | `cicd-demo-pr.yml` 首跑：4 个上游 job 全绿 |
| 2026-05-23 23:31:47 | `CICD Demo / PR Gate` job 启动即报 `No such file or directory`，exit code 1 |
| 2026-05-24 00:0X | QA 介入；按 `defect-tracking` 制度登记 `PDEF-002`，在 job 内覆盖 `working-directory: .` |
| 2026-05-24 | 推送修复，CI 验证转绿 |

---

## 7. 关联链接

- 失败 run：[#26346396345 / job 77556998942](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/actions/runs/26346396345/job/77556998942)
- 修复 PR：#249
- 缺陷登记：[defect-register.md](../defect-tracking/defect-register.md) PDEF-002
- 制度文档：[defect-tracking/README.md](../defect-tracking/README.md)
- 相似案例：[RCA-2026-05-23-PDEF-001-broken-markdown-link.md](RCA-2026-05-23-PDEF-001-broken-markdown-link.md) — 同样是"PR diff 范围覆盖到 main 已存在的配置缺陷"的门禁失败

---

**最后更新**: 2026-07-13
**作者**: QA Lead (Copilot Agent)
