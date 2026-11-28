# CI 报红验证（2026-11-28）

在临时分支注入缺陷，用 `workflow_dispatch` 触发 Vibe Testing CI，确认门禁能拦截；验证后已删除临时分支。

| 场景 | 注入缺陷 | CI Run | 结果 | 拦截步骤 / 输出 |
|------|---------|--------|------|----------------|
| 削弱断言 | v2 VT-INT-03：`toHaveText('Account locked')` → `toBeVisible()` | [46123346194](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/actions/runs/46123346194) | ❌ failure（预期） | 断言守卫：`Assertions or tests changed: VT-INT-03.spec.ts`；后续 v2 步骤 skipped |
| 变异失效 | `app/mutant` 改为与 v1 相同 | [46123349884](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/actions/runs/46123349884) | ❌ failure（预期） | 手写 `验证 mutant` 先失败；精确门禁被 skipped |
| 变异失效（单独验证精确门禁） | 同上，本地 `npm run test:mutant` | — | 退出码 1（预期） | `VT-INT-03：在 mutant 上未失败，变异未被检出` |

结论：断言被削弱、变异未被检出两类问题均会使 CI 报红；不依赖 `|| true` 或 `continue-on-error`。
