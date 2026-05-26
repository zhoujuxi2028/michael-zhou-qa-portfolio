# Copilot Cloud Agent CI 优化设计

## 1. 设计目标

- 为 Copilot cloud agent 提供**确定性的轻量环境预热**
- 降低 Node / Python 依赖恢复的试错成本
- 补齐该 CI 的设计文档，避免后续再从零分析

## 2. 约束

| 约束 | 说明 |
|------|------|
| 仓库类型 | QA portfolio monorepo，含多个 Node.js / Python 子项目 |
| 平台约束 | 当前只假设 `ubuntu-latest`，不依赖 larger runner |
| 成本约束 | setup 不能因为“优化”反而把所有 run 变得更慢 |
| 文档约束 | 需要同时维护架构、设计、RCA、postmortem |

## 3. 备选方案对比

| 方案 | 结论 | 原因 |
|------|------|------|
| 全仓 `npm ci` + `pip install` | 放弃 | monorepo 成本太高，会直接拉高基线 |
| larger runner / self-hosted runner | 暂不采用 | 仓库内无法保证可用性与成本边界 |
| 轻量 setup + 缓存恢复 | 采用 | 风险低，收益稳定 |

## 4. 采用设计

### 4.1 Copilot Setup Steps

新增 `.github/workflows/copilot-setup-steps.yml`：

1. `actions/checkout@v5`
2. `actions/setup-node@v4`
   - Node 20
   - 统一恢复多个 `package-lock.json` 对应的 npm cache
3. `actions/setup-python@v5`
   - Python 3.11
   - 统一恢复多个 `requirements.txt` / `pyproject.toml` 对应的 pip cache

### 4.2 为什么不做更重的预装

- 本仓库子项目数量多，技术栈分散
- 很多 Copilot 任务只需要读代码、改文档或改 workflow
- 如果在每次 session 都全量安装依赖，文档类任务会被迫承担无意义成本

## 5. 预期收益

| 场景 | 预期效果 |
|------|----------|
| 需要跑 Node.js 命令的任务 | 降低 npm 依赖恢复耗时 |
| 需要跑 Python 命令的任务 | 降低 pip 依赖恢复耗时 |
| 纯文档 / workflow 任务 | setup 保持轻量，不额外放大基线 |

## 6. 验证方案

1. `copilot-setup-steps.yml` 语法校验
2. 新增文档链接校验
3. 合并到默认分支后，观察后续 Copilot run 的 setup 与总时长
4. 与 run `#24819778702` 作为基线对比

## 7. 风险与缓解

| 风险 | 缓解 |
|------|------|
| 缓存 key 失效 | 依赖文件变更后自动重新计算 |
| setup 变重 | 严格限制为 cache restore，不做全量 install |
| 仍然超过 5 分钟 | 说明瓶颈主要在任务复杂度，需要继续优化 prompt / scope |
