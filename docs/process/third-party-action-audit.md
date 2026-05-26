# 第三方 GitHub Action 季度巡检指南

> 来源：Postmortem #37 (#35 trivy Node 20) / (#39 k6 action Node 20) → Issue #71  
> 原则：第三方 action 的上游变更（权限模型、Node 版本、破坏性更新）是本仓库历史上 3 次 CI 故障的共同根因。建立季度巡检机制，主动跟踪已知问题上游状态。

---

## 巡检节奏

| 周期 | 触发条件 | 负责人 |
|------|---------|--------|
| 每季度（1月/4月/7月/10月第一周） | 日历提醒 | 维护者 |
| 每次升级 action 版本后 | 代码 review | PR 提交者 |
| 上游出现 breaking change issue 时 | 外部事件 | 任何人 |

---

## 当前第三方 Action 清单

> 最后更新：2026-04-21

| Action | 当前版本 | 用途 | 已知问题 | 状态 |
|--------|---------|------|---------|------|
| `actions/checkout` | v6 | 代码检出 | 无 | ✅ 正常 |
| `actions/setup-node` | v6 | Node.js 环境 | 无 | ✅ 正常 |
| `actions/setup-python` | v6 | Python 环境 | 无 | ✅ 正常 |
| `actions/upload-artifact` | v7 | 构件上传 | 无 | ✅ 正常 |
| `actions/download-artifact` | v8 | 构件下载 | 无 | ✅ 正常 |
| `aquasecurity/trivy-action` | v0.35.0 | 漏洞扫描 | 内部依赖 `actions/cache@v4.2.4` (Node 20)，非阻断性 | ⚠️ 已记录 (#35) |
| `zaproxy/action-baseline` | v0.15.0 | ZAP DAST 基线扫描 | v0.9+ 改变权限模型，workflow_dispatch 下 write 受限 | ✅ 已修复 (#37)，`allow_issue_writing: false` |
| `github/codeql-action/upload-sarif` | v4 | SARIF 上传 | 无 | ✅ 正常 |
| `github/codeql-action/init` | v4 | CodeQL 初始化 | 无 | ✅ 正常 |
| `github/codeql-action/autobuild` | v4 | CodeQL 自动构建 | 无 | ✅ 正常 |
| `github/codeql-action/analyze` | v4 | CodeQL 分析执行 | 无 | ✅ 正常 |
| `docker/setup-buildx-action` | v4 | Docker Buildx | 无 | ✅ 正常 |
| `azure/setup-helm` | v5 | Helm 安装 | 无 | ✅ 正常 |
| `helm/kind-action` | v1 | Kind K8s 集群 | 无 | ✅ 正常 |
| `browser-actions/setup-chrome` | v2 | Chrome 安装 | 无 | ✅ 正常 |
| `EnricoMi/publish-unit-test-result-action` | v2 | 测试结果发布 | 无 | ✅ 正常 |
| `anthropics/claude-code-action` | v1 | Claude AI 代码审查 | 无 | ✅ 正常 |

---

## 季度巡检 Checklist

每季度执行以下检查，并将结果记录在下方"历次巡检记录"表中：

### 1. 版本检查

```bash
# 批量检查 workflows 中使用的 action 版本
grep -rh "uses:" .github/workflows/ | grep -v "#" | sort | uniq -c | sort -rn
```

- [ ] 对照上方"当前第三方 Action 清单"，检查每个 action 的最新发布版本
- [ ] 版本落后 ≥2 个 major 版本的，评估升级可行性
- [ ] Node.js 版本警告（EOL）— 检查 GitHub Actions 公告

### 2. 已知问题跟踪

- [ ] 查看 `known-issue/external` 标签下所有 open issue
- [ ] 检查每个已知问题的上游 repo release notes / changelog
- [ ] 已上游修复的 → 升级版本并关闭对应 issue
- [ ] 未修复但有 workaround → 评估 workaround 是否仍有效

### 3. 权限模型检查

ZAP、Trivy 等安全工具的 action 权限模型变化频繁：

- [ ] `zaproxy/action-baseline`: 检查 `allow_issue_writing` 参数行为是否变化
- [ ] `aquasecurity/trivy-action`: 检查 SARIF 上传权限要求是否变化
- [ ] `github/codeql-action`: 检查 `security-events: write` 是否仍为必须

### 4. Node.js 版本兼容性

GitHub Actions 的 Node.js 运行时会逐步淘汰旧版本：

```bash
# 检查 workflows 是否有 Node 20 警告
grep -rn "node-version" .github/workflows/
```

- [ ] 确认所有 action 与当前 runner 支持的 Node 版本兼容
- [ ] 检查 GitHub Actions changelog 中的 deprecation 公告

### 5. Breaking Changes 扫描

```bash
# 手动检查每个 action 的 RELEASES.md 或 CHANGELOG
# 重点关注：  
# - 参数名变更  
# - 默认值变更  
# - 权限要求变更  
# - 依赖版本变更
```

---

## 历次巡检记录

| 日期 | 执行者 | 发现问题 | 处理结果 |
|------|--------|---------|---------|
| 2026-04-21 | Copilot (初始化) | trivy-action 内部 Node 20 依赖 (#35)；ZAP 权限变更 (#37)；k6 action 弃用 (#39) | #35 保留记录；#37 已修复；#39 已替换为手动安装 |

---

## 历史已知问题

### #35 — trivy-action 内部依赖 Node 20

- **Action**: `aquasecurity/trivy-action@v0.35.0`
- **现象**: CI warning，内部使用 `actions/cache@v4.2.4`（Node 20 运行时）
- **状态**: 非阻断性，标记 `known-issue/external`，等待上游修复
- **巡检触发点**: 每次 trivy-action 版本升级后复查

### #37 — ZAP action 权限模型变更

- **Action**: `zaproxy/action-baseline@v0.15.0`（之前版本）
- **现象**: ZAP 升级后，`workflow_dispatch` 触发的 GITHUB_TOKEN 为 read-only，`allow_issue_writing: true` 导致 403
- **修复**: `allow_issue_writing: false`，扫描报告改走 artifact
- **状态**: 已修复 ✅

### #39 — k6 action 不支持 Node 24

- **Action**: `grafana/setup-k6-action@v1`
- **现象**: `grafana/setup-k6-action@v1` 无 Node 24 版本支持
- **修复**: 替换为手动 `curl + tar` 安装 k6，不再依赖该 action
- **状态**: 已修复 ✅，已从 workflows 中移除该 action

---

## 升级 Action 版本操作规范

升级第三方 action 版本时，必须：

1. **全量扫描**：`grep -rn "<action-name>" .github/workflows/` — 确保所有引用都已更新
2. **阅读 changelog**：重点关注 breaking changes 和权限变更
3. **验证所有 trigger 路径**（ISS-009 教训）：push / PR / schedule / workflow_dispatch 都要验证
4. **本地先验证**：升级后在 feature 分支推送，观察所有 CI workflow 是否绿灯
5. **故意失败验证**：确认 CI 能正确报红（非假绿灯）

---

## 相关文档

- [CLAUDE.md Common Pitfalls](../../CLAUDE.md) — ISS-009: 升级 action 全量扫描
- [Postmortem 2026 Q1](../project-management/postmortems/postmortem-2026-Q1.md) — #35, #37, #39 详细分析
- [CI Workflow Verification Checklist](./ci-workflow-verification-checklist.md)
