# RCA — Copilot Cloud Agent CI 耗时过长

> **事件类型**: CI 性能问题  
> **影响范围**: `Running Copilot cloud agent`  
> **关联 run/job**: run `#24819778702` / job `#72641769254`  
> **发生时间**: 2026-04-23 06:08 UTC

---

## 1. 现象

用户指出 run `#24819778702` 的总耗时超过 5 分钟，不合理。

基准数据：

| 指标 | 数值 |
|------|------|
| run 总时长 | 585s |
| job 开始 | 06:08:00 UTC |
| job 结束 | 06:17:40 UTC |
| `Processing Request` 持续时间 | 06:08:07 → 06:17:38（约 571s） |

---

## 2. 直接原因

本次 run 的主要耗时几乎全部集中在 `Processing Request`。

也就是说，**慢点不在 GitHub runner 启动，而在 Copilot 对仓库进行分析、决策、执行与验证的阶段**。

---

## 3. 根本原因

### Root Cause

仓库缺少针对 Copilot cloud agent 的**轻量级预热机制**与**专门的 CI 架构/设计文档**，导致 agent 在多技术栈 monorepo 中需要重复完成以下工作：

1. 判断可用工具链（Node / Python）
2. 识别依赖入口（多个 `package-lock.json`、`requirements.txt`、`pyproject.toml`）
3. 推断哪些目录与当前任务相关

这类“每次 session 都重复发生”的上下文发现成本，被放进了 `Processing Request` 阶段。

---

## 4. 证据

### 4.1 单次 run 拆解

| 阶段 | 时间 |
|------|------|
| Set up / Prepare / MCP start | ~7s |
| Processing Request | ~571s |
| Cleanup | ~2s |

### 4.2 最近样本

近期 `Running Copilot cloud agent` run 总时长样本：

- `413s`
- `585s`
- `588s`
- `486s`
- `730s`
- `1454s`

说明该问题不是单次偶发，而是**任务复杂度 + 缺少仓库级 bootstrap** 共同导致的稳定长尾。

---

## 5. 为什么这是设计缺陷

这不是单纯的“模型慢”。

仓库层面本来就可以提供：

- `copilot-setup-steps.yml`
- 明确的架构文档
- 明确的优化设计文档

在缺少这些工件时，agent 每次都要重新做一遍相似的环境识别，属于**仓库侧设计缺口**。

---

## 6. 修复策略

1. 新增 `.github/workflows/copilot-setup-steps.yml`
2. 只做轻量缓存恢复，不做全仓依赖安装
3. 新增架构文档与设计文档
4. 对本次事件补充 RCA / postmortem，形成长期记忆

---

## 7. 预期效果

- 需要安装依赖的 Copilot 任务：减少试错与缓存冷启动成本
- 文档 / workflow 类任务：不被全仓预装拖慢
- 后续排障：可直接基于现成文档分析，而不是重新摸排

---

## 8. 结论

**最终结论**：

- 当前 >5 分钟的问题，主瓶颈在 `Processing Request`
- runner 冷启动不是主要矛盾
- 仓库缺少 Copilot 专用 bootstrap 与设计文档，构成真实设计缺陷
- 本次修复以“轻量 setup + 文档补齐”为主，避免用重型预装制造新的性能问题
