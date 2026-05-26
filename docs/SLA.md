# 服务级别协议（Service Level Agreement）

> **版本**: v1.0  
> **生效日期**: 2026-05-25  
> **权威性**: 本文是所有流程 SLA 的唯一来源（SSOT）  
> **审查周期**: 每季度末审查，重大事件后 5 个工作日内更新

---

## 1. 缺陷生命周期 SLA

### 1.1 响应与分类（Triage SLA）

| 严重度 | 初始响应时间 | 分类完成时间 | Gate 影响 |
|--------|-------------|-------------|-----------|
| **P0 / Critical** | 立即（< 1h） | < 2h | 立即 BLOCKED，停止合并 |
| **P1 / High** | < 4h | < 8h | 阻塞时 BLOCKED |
| **P2 / Medium** | < 24h | < 48h | 不阻塞，计划修复 |
| **P3 / Low** | < 72h | 下一个 Sprint | 不阻塞 |

### 1.2 修复与关闭（Resolution SLA）

| 严重度 | 目标修复时间 | 最长修复时间 | 超时处理 |
|--------|-------------|-------------|----------|
| **P0 / Critical** | < 4h | < 24h | 立即升级，启动 P0 战时流程 |
| **P1 / High** | < 3 个工作日 | < 1 周 | 升级至团队 Lead |
| **P2 / Medium** | 当前 Sprint | 下一 Sprint | 进入 Waiver 流程 |
| **P3 / Low** | 下个 Sprint | 本季度内 | 可 Waiver，季度末 review |

### 1.3 Waiver 审批 SLA

| 操作 | SLA |
|------|-----|
| Waiver 申请提交 | 发现缺陷 48h 内 |
| Waiver 审批决定 | 收到申请 48h 内 |
| Waiver 到期前通知 | 到期前 5 个工作日 |

> Waiver 政策详见 [project-management/defect-tracking/waiver-policy.md](project-management/defect-tracking/waiver-policy.md)

---

## 2. 文档与 RCA SLA

### 2.1 Postmortem 提交 SLA

| 事件级别 | 草稿提交时限 | 终稿批准时限 |
|----------|-------------|-------------|
| P0 事故 | 事故关闭后 24h 内 | 48h 内 |
| P1 事故 | 3 个工作日内 | 5 个工作日内 |
| P2/P3 事件 | 5 个工作日内 | 下个 Sprint |

### 2.2 RCA 完成 SLA

| 触发条件 | 完成时限 |
|----------|----------|
| P0/P1 缺陷 | 修复后 3 个工作日内 |
| P2 缺陷（需要 RCA 时） | 修复后 5 个工作日内 |
| 跨项目模式触发（同类缺陷 ≥ 3 次/季度） | 识别后 5 个工作日内 |

### 2.3 文档更新 SLA

| 触发事件 | 更新时限 |
|----------|----------|
| 架构/流程变更 | 变更合并后 24h 内更新 ARCHITECTURE.md |
| 新 SOP 上线 | 上线当天更新 README.md 导航 |
| 质量指标刷新 | 每周一前更新 QUALITY-METRICS.md |
| Stage Gate 状态变更 | 变更后 24h 内同步 defect-register |

---

## 3. CI/CD 可用性 SLA

| 指标 | SLA 目标 | 计算方式 |
|------|---------|----------|
| Pipeline 月度可用性 | ≥ 99% | 非计划停机时间 / 总时间 |
| PR Gate 响应时间 | < 10 min | push 到 gate 完成 |
| 安全扫描完成时间 | < 5 min | trivy + npm audit 合计 |
| 定时 Pipeline 执行延迟 | < 15 min | 计划时间到实际开始 |

### 计划停机（不计入 SLA）

- GitHub Actions 官方维护窗口
- 事先公告的基础设施升级（≥ 48h 提前通知）
- Force majeure 事件

---

## 4. SLA 违约处理

### 4.1 违约识别

每周监控以下指标，违约时记录并触发处理流程：

```
违约 = 实际响应/修复时间 > SLA 目标时间
```

### 4.2 违约处理流程

```
违约发生
    ↓
24h 内登记至 defect-register（P2 或 P1，视影响而定）
    ↓
分析根因（是流程问题还是资源不足？）
    ↓
更新本文或相关 SOP
    ↓
下季度 SLA review 时汇总
```

### 4.3 SLA 达标率目标

| SLA 类别 | 季度达标率目标 |
|----------|---------------|
| 缺陷分类 SLA | ≥ 95% |
| 缺陷修复 SLA | ≥ 90% |
| Postmortem 按时提交 | ≥ 95% |
| CI/CD 可用性 | ≥ 99% |

---

## 5. 豁免条款

以下情况 SLA 时钟暂停或豁免：

| 豁免情形 | 说明 |
|----------|------|
| 法定节假日 | 节假日期间 SLA 顺延（按工作日计） |
| 外部依赖阻塞 | GitHub / 云服务商故障期间不计时 |
| 信息获取受阻 | 等待外部团队提供信息的时间不计入 |
| P3 低优先级 Waiver | 经审批的 Waiver 不计入违约 |

---

## 6. 版本历史

| 版本 | 日期 | 变更内容 |
|------|------|----------|
| v1.0 | 2026-05-25 | 初始版本，整合现有各文件中的分散 SLA 约定 |

---

## 相关文件

- [QUALITY-METRICS.md](QUALITY-METRICS.md) — SLA 达标率追踪
- [INCIDENT-ESCALATION.md](INCIDENT-ESCALATION.md) — 事故升级路径（SLA 违约时参考）
- [project-management/defect-tracking/waiver-policy.md](project-management/defect-tracking/waiver-policy.md) — Waiver 政策
- [project-management/defect-tracking/README.md](project-management/defect-tracking/README.md) — 缺陷跟踪制度
