# CI 反馈时长实测报告（Performance Testing CI）

> 关联：#879 · 测量日期：2026-11-16 · 复现脚本：[`scripts/ci-feedback-time.sh`](../../../../../../../scripts/ci-feedback-time.sh)

## 1. 结论

| 指标 | 结果 |
|------|------|
| 优化前（#197 接入 BATS 后） | 中位数 **534s**（n=4） |
| 优化后（#208） | 中位数 **206s**（n=9） |
| 提效 | **−61%**（同口径中位数对比） |
| 覆盖变化 | stage4 BATS 25 → 21（fast 14 + integration 7）；删除的 4 条（npm test / eslint / prettier / coverage）已由 Unit Tests / Code Quality job 覆盖，**门禁检查项未减少** |

## 2. 口径

| 要素 | 定义 |
|------|------|
| 指标 | 端到端反馈时长 = run `createdAt → updatedAt`（含排队） |
| 样本 | `performance-ci.yml`，`main` 分支、`push` 事件、`success` |
| 统计量 | 中位数 + P25/P75（CI 有排队离群值，不用均值） |
| 窗口 | 按 PR 合并到 main 的时间切分（UTC），左闭右开 |

> 只取 main push：PR run 混入分支差异与排队，口径不干净。
> commit/PR 标题中的「8m42s → ~3m」是单次 run 的关键路径（不含排队），本报告以多次 run 中位数为准。

## 3. 分段数据

| 窗口（UTC） | 事件 | n | 中位数 | P25–P75 |
|-------------|------|---|--------|---------|
| 04-20 → 04-24 07:23 | 基线（无 BATS） | 15 | 176s | 163–218s |
| 04-24 07:23 → 04-25 06:45 | #197 接入 BATS 门禁 | 4 | **534s** | 524–543s |
| 04-25 06:45 → 04-26 11:53 | #208 BATS 重构 + Jest 并行 | 9 | **206s** | 202–209s |
| 04-26 11:53 → 04-30 | #219 gate 汇总 + lint 并行 | 12 | 176s | 169–178s |
| 10-17 → 11-17 | 现状（后续新增 job） | 9 | 425s | 424–431s |

```bash
bash scripts/ci-feedback-time.sh performance-ci.yml 2026-04-24T07:23 2026-04-25T06:45 main push
bash scripts/ci-feedback-time.sh performance-ci.yml 2026-04-25T06:45 2026-04-26T11:53 main push
```

## 4. 根因与优化（#208）

`Shell Tests (BATS)` 单 job 6m03s 成为关键路径瓶颈（[run 24924077996](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/actions/runs/24924077996)）：

| 根因 | 优化 |
|------|------|
| BATS 重复执行 unit-tests / Code Quality 已跑的 `npm test` / eslint / prettier / coverage | 删除重复用例 |
| selftest 脚本被 6 个 `@test` 各调用一次（~50s × 6） | `setup_file()` 只跑一次，共享输出 |
| `--runInBand` 覆盖 `maxWorkers: 50%`，Jest 强制单线程 | 移除，启用并行 |
| 快慢用例混在一个套件 | 拆分为 `fast`（静态断言）+ `integration` 两个 job 并行 |

## 5. 局限（如实声明）

| 项 | 说明 |
|----|------|
| 优化前样本小 | n=4（退化窗口仅持续约 23h），结论方向可靠，精确值有误差 |
| 退化由自身引入 | 534s 是接入 BATS 门禁后的代价；对比无 BATS 基线（176s），#208 后为 +17%，但多了一层 shell 门禁 |
| #219 预期未完全兑现 | commit 预期 −29%，实测 −15%（206s → 176s） |
| 现状 425s | 之后新增 baseline-compare / trend-collect / shell-integration 等 job；不影响 4 月优化结论 |
| 范围 | 个人项目内自证优化，非跨团队生产数据；实现由 AI 辅助编码，方案与验收由本人完成 |
