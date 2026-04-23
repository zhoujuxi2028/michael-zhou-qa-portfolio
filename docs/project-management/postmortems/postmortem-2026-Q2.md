# Postmortem — 2026 Q2 Open Issue 专项分析

> 时间范围: 2026-04-21 | 分析对象: 4 个 open issue (#71, #75, #77, #87) | 级别: Portfolio 级别 RCA

---

## 目录

- [1. Issue 总表](#1-issue-总表)
- [2. 逐项 RCA](#2-逐项-rca)
  - [#87 ZAP Scan Baseline Report（噪音 issue 反复创建）](#87-zap-scan-baseline-report)
  - [#77 接口定义缺行号引用](#77-接口定义缺行号引用)
  - [#75 CI 无可复用模板](#75-ci-无可复用模板)
  - [#71 第三方 action 缺季度巡检机制](#71-第三方-action-缺季度巡检机制)
- [3. 横向根因分析](#3-横向根因分析)
- [4. 修复措施总表](#4-修复措施总表)
- [5. 防御措施更新](#5-防御措施更新)
- [6. 遗留风险](#6-遗留风险)

---

## 1. Issue 总表

| Issue | 标题 | 来源 | 优先级 | 修复状态 |
|-------|------|------|--------|---------|
| [#87](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/87) | ZAP Scan Baseline Report（噪音 issue） | github-actions[bot] 自动创建 | P1 | ✅ 已修复 |
| [#77](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/77) | 接口定义缺源码行号引用 | Postmortem P1-3 (#12 #13 #50) 改进项 | P1 | ✅ 已完成（待关闭） |
| [#75](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/75) | CI 缺可复用 workflow 模板 | Postmortem P2-5 (#38 #41) 改进项 | P2 | ✅ 已完成（待关闭） |
| [#71](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/71) | 第三方 action 缺季度巡检机制 | Postmortem P3-8 (#35 #37 #39) 改进项 | P3 | ✅ 已实施 |

---

## 2. 逐项 RCA

### #87 ZAP Scan Baseline Report

#### 时间线

| 时间 | 事件 |
|------|------|
| 2026-04-05 | ZAP baseline scan（schedule 触发）扫描 DVWA，创建 issue #87，列出 18 个告警 |
| 2026-04-12 | 后续扫描运行，"Missing Anti-clickjacking Header" 被标记为 RESOLVED，issue #87 收到 comment |
| 2026-04-19 | 再次扫描，同一告警重新出现为 NEW，issue #87 再次收到 comment |

#### 现象

- ZAP 持续对 DVWA（Damn Vulnerable Web Application）扫描并创建/更新 GitHub issue
- "Missing Anti-clickjacking Header" [10020] 在 resolved 和 new 之间反复振荡
- issue #87 成为长期噪音，无法关闭

#### 根因分析

**直接根因：**
1. `allow_issue_writing: ${{ github.event_name != 'workflow_dispatch' }}` — 该配置在 push/PR/schedule 触发时启用 issue 写入
2. `.zap/rules.tsv` 中所有规则设为 `WARN`，且缺少 10054, 90004, 10036, 10094, 90005, 10112 等规则 ID — ZAP 对这些告警均采用默认行为（报告并创建 issue）

**根本根因：**
- DVWA 是**刻意设计的漏洞靶机**，其安全缺陷是预期行为，不应触发 CI issue 创建
- Q1 postmortem #37 的教训是：`allow_issue_writing: false`；但后续代码变更改为了条件表达式，重新开启了 schedule/push/PR 场景下的 issue 写入
- 历史教训（#37）未被完整保留 → 配置回归

**振荡原因：**
- DVWA docker 镜像在不同版本/启动时机下，X-Frame-Options 响应头可能存在或缺失
- 每次 ZAP 扫描结果不同 → issue comment 在 resolved/new 之间跳动

#### 修复措施

1. **`allow_issue_writing: false`** 写回 `security-tests.yml`（永久关闭 issue 写入，扫描报告走 artifact）
2. **`.zap/rules.tsv` 全面更新**：
   - 所有现有 WARN → IGNORE
   - 补充缺失规则 ID（10054, 10036, 10094, 90004, 90005, 10112）为 IGNORE
   - 每条注释说明「expected in DVWA」原因
3. 扫描结果通过 `upload-artifact` 获取，不创建 GitHub issue

#### 验证方法

下次 ZAP baseline scan 执行后：
- issue #87 不应收到新 comment
- workflow artifacts 中应有完整的 ZAP HTML 报告
- 所有已知 DVWA 告警不应出现在 ZAP 输出中（IGNORE 级别不被报告）

---

### #77 接口定义缺行号引用

#### 现象

`performance-testing-platform/docs/architecture/architecture.md` 的接口定义章节（第 4 节）仅有文件路径（如 `src/routes/orders.js`），无具体行号。设计文档与源码对照困难，导致 Q1 三次接口理解错误（#12 #13 #50）。

#### 根因分析

- 设计文档编写时未建立「接口定义需附行号」的规范
- 缺乏 code review checklist 要求 reviewer 验证接口定义与源码的一致性

#### 修复状态

已完成。`architecture.md` 现已包含格式如 `src/routes/health.js:6-18`、`src/routes/orders.js:9-54`、`src/db/database.js:26-52` 等行号引用（见 issue #77 comment：2026-04-03 20:49）。

**关键更新点：**
- `4.1 健康检查 — src/routes/health.js:6-18`
- `4.2 商品 API — src/routes/products.js:6-34`
- `4.3 订单 API — src/routes/orders.js:9-54`（明确标注 `product_id` 为 snake_case，避免 #50 类错误）
- `4.4 认证 API — src/routes/auth.js:17-107`
- `4.5 数据库 Schema — src/db/database.js:26-52`

---

### #75 CI 无可复用 workflow 模板

#### 现象

多个 workflow 存在共同的配置问题（#38 缺 workflow_dispatch / #41 假 deployment environment），原因是每次新建 workflow 都从零编写，无标准模板约束。

#### 根因分析

- 无 CI workflow 编写规范模板
- 开发者各自编写，导致同类错误反复出现

#### 修复状态

已完成。`.github/workflow-template.yml` 已创建（见 issue #75 comment：2026-04-03 20:49），包含：
- 强制包含 `workflow_dispatch:`
- 禁止 `continue-on-error: true`（注释说明）
- 禁止 `environment:` 除非有真实部署
- 使用 `actions/upload-artifact@v7+` 上传构件

---

### #71 第三方 action 缺季度巡检机制

#### 现象

Q1 期间三次 CI 故障（#35 trivy Node 20 / #37 ZAP 权限变更 / #39 k6 action 弃用）均由第三方 action 上游变更引发。每次都是被动发现（CI 报红后才修复），无主动预防机制。

#### 根因分析

- 无定期检查第三方 action 版本和上游变更的机制
- `known-issue/external` label 只记录问题，无跟踪上游修复状态的流程
- 无 action 升级操作规范（导致 ISS-009 全量扫描问题）

#### 修复措施

创建 `docs/guides/third-party-action-audit.md`，包含：
1. **当前 action 清单**（14 个 action，版本、用途、已知问题、状态）
2. **季度巡检 Checklist**（版本检查、已知问题跟踪、权限模型检查、Node.js 兼容性）
3. **升级操作规范**（全量扫描 → changelog → 全 trigger 路径验证 → 故意失败验证）
4. **历次巡检记录表**（追踪每季度巡检结果）
5. **历史已知问题详录**（#35, #37, #39 完整记录）

---

## 3. 横向根因分析

### 共同模式：已建立的规范没有被持续执行

| Issue | Q1 已有教训 | Q2 问题复现原因 |
|-------|------------|----------------|
| #87 | #37: `allow_issue_writing: false` | 后续代码变更改为条件表达式，教训未持久化 |
| #77 | — | Q1 期间同类问题（#12 #13 #50）触发改进计划，但延迟执行 |
| #75 | #38 #41: workflow 配置问题 | 改进计划列为 open issue，未及时实施 |
| #71 | #35 #37 #39: 第三方依赖问题 | 有 label 追踪但无定期检查流程 |

### 根因分类

```
问题类型                        数量    代表 Issue
─────────────────────────────────────────────────
配置回归（修复后被覆盖）            1      #87
改进计划延迟执行（open 超过 3 周）   3      #71 #75 #77
缺乏主动预防机制                   1      #71
```

### 严重程度评级

| Issue | 业务影响 | CI 影响 | 噪音程度 |
|-------|---------|---------|---------|
| #87 | 低（扫描对象是靶机） | 无（仅创建 issue） | **高**（每次扫描更新 issue） |
| #77 | 高（接口理解错误已导致 3 个 defect） | 中（设计质量问题） | 低 |
| #75 | 中（缺模板导致配置问题） | 中（影响所有新 workflow） | 低 |
| #71 | 中（被动响应第三方变更） | 高（直接导致 CI 报红） | 低 |

---

## 4. 修复措施总表

| Issue | 修复类型 | 变更文件 | 状态 |
|-------|---------|---------|------|
| #87 | 配置修复 | `security-testing-demo/.zap/rules.tsv` | ✅ 已提交 |
| #87 | Workflow 修复 | `.github/workflows/security-tests.yml` | ✅ 已提交 |
| #71 | 新建文档 | `docs/guides/third-party-action-audit.md` | ✅ 已提交 |
| #75 | 验证已完成 | `.github/workflow-template.yml`（已存在） | ✅ 已验证 |
| #77 | 验证已完成 | `performance-testing-platform/docs/architecture/architecture.md`（已有行号） | ✅ 已验证 |

---

## 5. 防御措施更新

在现有 CLAUDE.md Pitfall 表中补充：

| 规则 | 来源 |
|------|------|
| ZAP 扫描靶机时，`allow_issue_writing: false` + rules.tsv IGNORE 预期告警 | #87 |
| 配置修复后，在 CLAUDE.md/文档中固化，防止回归 | #87 配置回归模式 |
| 改进计划 issue open 超 2 周未处理，下次 sprint 优先级提升 | #71 #75 #77 延迟模式 |
| 第三方 action 季度巡检：见 `docs/guides/third-party-action-audit.md` | #71 |

---

## 6. 遗留风险

| 风险 | 描述 | 缓解措施 |
|------|------|---------|
| trivy-action 内部 Node 20 警告 | `aquasecurity/trivy-action@v0.35.0` 内部依赖 `actions/cache@v4.2.4`（Node 20），GitHub 最终会强制停用 | 每季度巡检时复查上游 trivy-action 是否发布修复版本（见 `docs/guides/third-party-action-audit.md` #35 章节） |
| 本专题改进项需持续防回归 | #71 #75 #77 对应修复已落地，但后续新增 workflow / 文档若不复用规范，仍可能回退 | 在季度 action 审计、workflow 评审、设计文档 review 中持续复核 |
