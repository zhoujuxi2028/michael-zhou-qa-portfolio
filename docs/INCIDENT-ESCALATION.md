# 事故升级矩阵（Incident Escalation Matrix）

> **版本**: v1.0  
> **生效日期**: 2026-05-25  
> **权威性**: 本文是 P0-P3 升级路径的唯一来源（SSOT）  
> **关联**: [SLA.md](SLA.md) | [project-management/defect-tracking/README.md](project-management/defect-tracking/README.md)

---

## 1. 严重度定义

| 级别 | 中文名 | 定义 | 典型示例 |
|------|--------|------|----------|
| **P0** | 紧急 / Critical | 生产或主分支完全阻断，无临时绕过方案 | main branch CI 全红，无法合并任何 PR |
| **P1** | 高 / High | 核心功能受损，有临时绕过方案但体验严重降级 | PR Gate 部分失败，关键 stage 无法运行 |
| **P2** | 中 / Medium | 非核心功能受损或质量风险，不阻塞主流程 | 文档链接断链，CI 覆盖率下降 |
| **P3** | 低 / Low | 轻微问题或改进建议，不影响功能 | 命名不规范，注释缺失 |

---

## 2. 升级矩阵

### P0 — 紧急事故（立即启动）

```
发现 P0
    ↓ 立即（< 15 min）
第一响应人确认并宣布事故
    ↓ < 1h
负责人介入，开始修复
    ↓ 未在 2h 内有明确进展
升级至项目负责人
    ↓ 未在 4h 内解决
升级至 Portfolio 负责人 + 外部支持
```

| 时间节点 | 升级对象 | 通知渠道 | 操作 |
|----------|----------|----------|------|
| T+0 | 第一响应人（值班） | 即时通讯 | 宣布事故，创建跟踪 Issue |
| T+1h | 负责人 | 即时通讯 + 邮件 | 提供初步 RCA 方向 |
| T+2h（无进展） | 项目负责人 | 电话 + 即时通讯 | 请求额外资源 |
| T+4h（未解决） | Portfolio 负责人 | 邮件 + 电话 | 决定是否回滚或外部支持 |

### P1 — 高优先级

| 时间节点 | 升级对象 | 通知渠道 |
|----------|----------|----------|
| T+0 | 第一响应人 | 即时通讯 |
| T+4h（无修复方案） | 负责人 | 即时通讯 |
| T+1个工作日（未解决） | 项目负责人 | 邮件 |
| T+3个工作日（未解决） | Portfolio 负责人 | 邮件 |

### P2 — 中优先级

| 时间节点 | 升级对象 | 通知渠道 |
|----------|----------|----------|
| T+0 | 发现人记录至 defect-register | — |
| T+48h（未认领） | 负责人 | 即时通讯提醒 |
| T+1 Sprint（未解决） | Waiver 流程介入 | 参考 waiver-policy |

### P3 — 低优先级

| 处理方式 | 说明 |
|----------|------|
| 记录至 defect-register | 按 backlog 排期 |
| 无自动升级 | 季度末 review 时处理未关闭项 |

---

## 3. 事故响应角色

| 角色 | 职责 | 备注 |
|------|------|------|
| **第一响应人（First Responder）** | 发现/接报事故，初步评估，创建跟踪 Issue，通知相关方 | 值班轮换或发现人承担 |
| **事故负责人（Incident Owner）** | 协调修复资源，持续更新状态，主导 RCA | 通常为模块负责人 |
| **技术负责人（Tech Lead）** | 提供技术判断，审批回滚决策 | P0/P1 必须介入 |
| **Portfolio 负责人** | P0 超时未解决时的最终决策人 | 评估影响范围和对外沟通 |

---

## 4. 事故宣布与关闭流程

### 4.1 宣布事故（Declare Incident）

触发条件：
- P0：立即宣布
- P1：评估后 30 min 内决定是否宣布
- P2/P3：记录 defect-register，不宣布事故

宣布步骤：
```
1. 创建 GitHub Issue（标题格式：[INCIDENT] P{N} - {简短描述}）
2. 标记 Label：priority: critical / priority: high
3. 在即时通讯频道发送通知（附 Issue 链接）
4. 开始事故时间线记录（在 Issue comment 中持续更新）
```

### 4.2 关闭事故（Close Incident）

关闭前必须确认：
- [ ] 根本原因已识别
- [ ] 修复方案已合并（or Workaround 已记录）
- [ ] CI/CD 全绿
- [ ] 受影响的用户/功能已恢复
- [ ] Postmortem / RCA 已触发（P0/P1 必须）

关闭步骤：
```
1. 在 Issue 中发布 "✅ 事故已关闭" 通知
2. 关闭 GitHub Issue
3. 更新 defect-register（状态 → Closed）
4. 在即时通讯中通知关闭
5. 安排 Postmortem（P0/P1：关闭后 24h 内）
```

---

## 5. 沟通渠道

| 场景 | 渠道 | 说明 |
|------|------|------|
| 日常缺陷跟踪 | GitHub Issues | 所有缺陷必须有 Issue |
| P0/P1 紧急通知 | 即时通讯（Slack/Teams） | @mention 相关人员 |
| 状态更新 | GitHub Issue Comment | 每 30 min 更新一次（P0 期间） |
| 正式报告 | 邮件 + postmortem 文档 | 关闭后发出 |
| 外部沟通 | Portfolio 负责人决定 | P0 可能需要通知外部依赖方 |

---

## 6. On-Call 轮班

> 本项目目前为个人 Portfolio，On-Call 职责由项目维护者承担。  
> 扩展为团队项目时，按以下模版建立轮班表：

| 角色 | 轮班周期 | 备份 |
|------|----------|------|
| 第一响应人 | 每周轮换 | 上周值班人 |
| 技术负责人 | 每月轮换 | — |

---

## 7. 版本历史

| 版本 | 日期 | 变更内容 |
|------|------|----------|
| v1.0 | 2026-05-25 | 初始版本，建立 P0-P3 升级矩阵和事故宣布/关闭流程 |

---

## 相关文件

- [SLA.md](SLA.md) — P0-P3 响应时间 SLA
- [QUALITY-METRICS.md](QUALITY-METRICS.md) — 事故响应达标率追踪
- [project-management/defect-tracking/README.md](project-management/defect-tracking/README.md) — 缺陷跟踪制度
- [project-management/postmortems/](project-management/postmortems/) — 历史事故 Postmortem
