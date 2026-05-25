# k6 smoke baseline 手工移植设计

## 问题说明

`feature/fix-k6-smoke-baseline` 不是可直接合并到 `main` 的线性分支。  
该分支基于旧基线，直接合并会把当前 `main` 上已经存在的后续更新一起回退。

本次目标不是“合并旧分支”，而是**从旧分支中提炼出当前 `main` 仍缺失的有效修改，并安全代入 `main`**。

## 目标与非目标

| 类型 | 内容 |
|---|---|
| 目标 | 识别 `feature/fix-k6-smoke-baseline` 中仍未进入 `main` 的有效修改 |
| 目标 | 以当前 `main` 为底稿，按文件级 / 代码块级手工移植 |
| 目标 | 完成移植后的完整 Stage 4 验证，并在通过后合并回 `main` |
| 非目标 | 直接 merge 整个旧分支 |
| 非目标 | 直接 replay 旧分支全部提交历史 |
| 非目标 | 顺手重构与当前目标无关的脚本、文档、CI 配置 |

## 方案对比

| 方案 | 做法 | 优点 | 风险 | 结论 |
|---|---|---|---|---|
| A | 按文件级筛选后手工移植 | 最安全，能保留净新增价值 | 需要逐项比对 | **推荐** |
| B | 旧提交直接 cherry-pick | 保留提交来源信息 | 容易产生空 cherry-pick 和旧上下文冲突 | 不推荐 |
| C | 整分支直接合并 | 操作最少 | 高概率把 `main` 回退到旧状态 | 禁用 |

## 执行范围

| 项目 | 处理方式 |
|---|---|
| 候选代码文件 | 逐文件比较，提炼行为层面的净新增 |
| 候选测试文件 | 只保留能验证净新增行为的测试断言 |
| 候选文档文件 | 仅在行为变更需要同步说明时更新 |
| 旧 CI / 旧文档状态 | 默认丢弃 |

## 执行流程

1. 以当前 `main` 为基线，新建恢复分支。
2. 比较 `feature/fix-k6-smoke-baseline` 与当前 `main`。
3. 生成三类清单：
   - **保留**
   - **丢弃**
   - **待确认**
4. 仅把“保留”项手工代入恢复分支。
5. 运行完整验证链。
6. 通过后创建 PR 合并回 `main`。

## 文件级决策规则

| 规则 | 判定 |
|---|---|
| 修改能增强当前 `main` 行为，且不会回退现状 | 保留 |
| 修改只反映旧基线状态、旧文档快照、旧 CI 结构 | 丢弃 |
| 修改与当前实现冲突，且无法立即证明孰优 | 待确认 |
| 修改已被后续提交等效吸收 | 丢弃 |

## 风险控制

| 风险 | 控制措施 |
|---|---|
| 把旧分支状态带回 `main` | 不做整分支 merge，不做整提交 replay |
| 文档 / CI 被回退 | 所有编辑都以当前 `main` 文件为底稿 |
| 重复引入已存在逻辑 | 先比较再移植，不直接复制整文件 |
| 行为变化缺少验证 | 移植后必须跑完整 Stage 4 验证 |

## 验证策略

| 类型 | 命令 |
|---|---|
| lint | `cd performance-testing-platform && npm run lint` |
| format | `cd performance-testing-platform && npm run format:check` |
| coverage | `cd performance-testing-platform && npm run test:coverage` |
| integration | `cd performance-testing-platform && npm run test:integration` |
| shell tests | `cd performance-testing-platform && PATH="/usr/local/bin:$PATH" ./node_modules/.bin/bats tests/unit/scripts/stage4-selftest-fast.bats` |
| shell tests | `cd performance-testing-platform && PATH="/usr/local/bin:$PATH" ./node_modules/.bin/bats tests/unit/scripts/stage4-selftest-integration.bats` |
| jmeter | `cd performance-testing-platform && npm run jmeter:dryrun` |
| smoke | `cd performance-testing-platform && npm run k6:smoke` |

## 成功标准

| 标准 | 说明 |
|---|---|
| diff 干净 | 最终 PR 只包含净新增有效修改 |
| 无回退 | 不回退当前 `main` 的现有实现 |
| 本地验证通过 | 完整 Stage 4 验证链全部通过 |
| PR 可合并 | 审查无阻塞问题，CI 绿灯 |

