# Copilot Cloud Agent CI 架构说明

> **适用范围**: `Running Copilot cloud agent` 动态 workflow  
> **基准样本**: run `#24819778702` / job `#72641769254`  
> **目标**: 降低可避免的初始化成本，并把耗时分析沉淀为可维护文档

## 1. 当前执行链路

```text
GitHub 动态 workflow
  → GitHub-hosted runner (ubuntu-latest)
    → Copilot setup / MCP bootstrap
      → Processing Request
        → 仓库分析 / 编辑 / 验证 / 提交
          → Cleanup
```

## 2. 基准耗时拆解

| 阶段 | 时间 | 占比 | 结论 |
|------|------|------|------|
| Set up job + Prepare Copilot + Start MCP Servers | ~7s | ~1.2% | 基础设施开销很小 |
| Clean Up | ~2s | ~0.3% | 非瓶颈 |
| Processing Request | ~571s | ~97.6% | 主要耗时来源 |
| 总计 | 585s | 100% | 当前 run 明显超过 5 分钟 |

## 3. 架构结论

1. **本次慢点不在 runner 启动**  
   run `#24819778702` 的大部分时间都消耗在 `Processing Request`，不是 GitHub Actions 冷启动。

2. **瓶颈来自仓库级上下文发现与任务执行**  
   当前仓库是多项目 QA monorepo，Node.js / Python / K8S / 安全文档混合，Copilot 每次都需要重新判断工具链与依赖入口。

3. **缺少 Copilot 专用的环境预热与架构说明**  
   在本次修改前，仓库没有 `.github/workflows/copilot-setup-steps.yml`，也没有专门描述该 CI 的优化边界、非目标与设计约束。

## 4. 优化原则

| 原则 | 说明 |
|------|------|
| 轻量预热 | 只做高收益、低成本的环境准备 |
| 禁止全仓重装依赖 | monorepo 全量 `npm ci` / `pip install` 会抬高所有任务基线 |
| 缓存优先 | 优先恢复 Node / pip 缓存，而不是预装所有项目 |
| 文档先行 | 把耗时拆解、边界条件、设计取舍写成 SSOT |

## 5. 本次落地

| 工件 | 作用 |
|------|------|
| `.github/workflows/copilot-setup-steps.yml` | 为 Copilot cloud agent 提供轻量级 Node / Python 预热与缓存恢复 |
| `docs/process/copilot-cloud-agent-ci-architecture.md` | 记录当前架构、耗时分布与优化原则 |
| `do../design/specs/2026-04-23-copilot-cloud-agent-ci-optimization-design.md` | 记录优化设计与非目标 |
| `docs/reports/RCA-copilot-cloud-agent-runtime.md` | RCA |
| `docs/project-management/postmortems/postmortem-2026-Q2-copilot-cloud-agent-runtime.md` | Postmortem |

## 6. 非目标

- 不承诺把所有 Copilot 任务都压到 5 分钟以内
- 不在 setup 阶段全量安装所有子项目依赖
- 不假设仓库已具备 larger runner / self-hosted runner 条件

## 7. 后续观察指标

| 指标 | 目标 |
|------|------|
| setup 阶段额外开销 | 控制在 1 分钟以内 |
| Processing Request 方差 | 随后续 run 观察是否下降 |
| 依赖安装重试次数 | 目标下降 |
| 任务总耗时 | 优先压缩需要安装依赖的任务 |

## 8. Pre-merge 基线与 post-merge 跟踪状态

> 当前状态：`.github/workflows/copilot-setup-steps.yml` **尚未合并到 `main`**，因此 Copilot cloud agent 真实使用该 setup 的 3~5 次线上样本 **暂时不可得**。

### 8.1 当前 pre-merge 基线（最近 5 次已完成 run）

| Run | Branch | 总时长 |
|-----|--------|--------|
| `#24821524188` | `copilot/organize-postmortems-and-index` | `93s` |
| `#24821289605` | `copilot/optimize-ci-process-time` | `478s` |
| `#24820724910` | `copilot/organize-postmortems-and-index` | `413s` |
| `#24819778702` | `copilot/improve-test-coverage-branch` | `585s` |
| `#24816736415` | `copilot/design-performance-testing-architecture` | `588s` |

### 8.2 跟踪说明

1. 上表仅作为 **合并前基线**，不能代表 `copilot-setup-steps` 的实际收益
2. 合并到 `main` 后，应连续观察 **3~5 次** `Running Copilot cloud agent` run
3. 重点记录：
   - 总时长
   - `Processing Request` 时长
   - 是否出现额外 setup 开销
4. 若合并后样本仍长期 >5 分钟，则说明瓶颈主要仍在任务范围与 prompt 复杂度，而不在 bootstrap
