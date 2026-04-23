# Postmortem — PR #185 Claude Code Review 被 Copilot 自触发导致失败

> **事件时间**: 2026-04-23 02:07 UTC  
> **影响范围**: PR #185 的 `Claude Code Review` workflow  
> **严重级别**: P3 — 代码审查辅助流程失败，不阻断主功能测试  
> **关联 run/job**: run #24812160997 / job #72620934904

---

## 1. 事件摘要

PR #185 在 Copilot agent 推送新提交后，触发 `pull_request.synchronize`。  
随后 `Claude Code Review` workflow 运行失败，报错：

```text
App token exchange failed: 401 Unauthorized - User does not have write access on this repository
```

虽然报错与 Issue #164 相似，但本次 workflow 的 permissions 已正确，故判定为新的失败模式。

---

## 2. 影响评估

| 维度 | 影响 |
|------|------|
| PR 审查 | Claude 自动代码审查未执行 |
| 主 CI | 不影响其他项目测试/构建 |
| 合并节奏 | 造成 PR #185 检查项报红，需要人工介入 |
| 范围 | 主要影响由 Copilot bot 自己 push 更新的 `copilot/*` PR |

---

## 3. 时间线

| 时间 (UTC) | 事件 |
|-----------|------|
| 2026-04-23 01:22 | PR #185 的较早一次 Claude Review run 由人类 actor 触发，执行成功 |
| 2026-04-23 01:45 | Copilot agent 向 `copilot/review-integration-test-scripts` push 新提交 |
| 2026-04-23 02:07:06 | run #24812160997 开始 |
| 2026-04-23 02:07:17 | OIDC token 获取成功，开始 app token exchange |
| 2026-04-23 02:07:17 ~ 02:07:34 | 连续 3 次 token exchange 返回 401 |
| 2026-04-23 02:07:34 | job #72620934904 失败退出 |
| 2026-04-23 02:12 | 开始针对本次失败进行 RCA 与修复 |

---

## 4. 根因总结

### 直接原因

`claude-code-review.yml` 在 `pull_request.synchronize` 事件上对所有 actor 一视同仁，没有区分：

- 人类用户触发
- Copilot bot 自己触发

### 深层原因

团队此前已经处理过一次相同表象的 401（Issue #164），但那次的根因是 **permissions scope 不足**。  
因此默认把新的 401 也容易理解为同一类问题，缺少对 **actor 身份差异** 的单独防御。

---

## 5. 修复措施

### 已实施

在 `.github/workflows/claude-code-review.yml` 中新增 job 级条件：

```yaml
github.actor != 'Copilot'
```

并补充注释说明：

- 该条件不是 workaround，而是针对 Claude review action 的身份授权限制做显式保护
- 目的是避免 Copilot bot 自己更新 PR 时触发自身 review 并稳定 401

### 配套文档

- 新增本次 RCA 文档  
  `docs/reports/RCA-185-claude-code-review-copilot-actor-401.md`
- 新增本次 postmortem 文档  
  `docs/project-management/postmortems/postmortem-2026-Q2-issue-185-claude-review-copilot-trigger.md`

---

## 6. 回归验证

已完成：

- workflow YAML 语法校验
- Markdown 文档链接校验
- 核对失败 run 与成功 run 的 actor 差异

预期线上结果：

- Copilot bot 再次 push 到同类 PR 时，`Claude Code Review` 应为 **skipped**
- 非 Copilot actor 的正常 PR 审查仍保持可用

---

## 7. Lessons Learned

1. **相同错误文本不代表相同根因**  
   401 `User does not have write access on this repository` 既可能来自 permission scope，也可能来自 actor 身份限制。

2. **GitHub App 自触发 review 型 workflow 需要额外防护**  
   对会“读取 PR 并回写评论”的 action，必须考虑 bot self-trigger 场景。

3. **成功样本与失败样本对比很关键**  
   本次通过对比 run #24811486586（成功）与 run #24812160997（失败）的 actor 字段，快速区分了“配置问题”和“触发者问题”。

---

## 8. 后续行动

| 行动项 | 类型 | 状态 |
|--------|------|------|
| 观察下一次 Copilot push 是否将 Claude Review 正确标记为 skipped | 验证 | 待下一次 CI 运行 |
| 后续如新增其他 review/comment 型 GitHub App action，补充 bot actor 触发策略 | 流程 | 待纳入 action 审计清单 |

---

## 9. 最终结论

本次事件属于 **Claude Code Review 对 Copilot bot 自触发场景缺少保护条件** 的 CI 设计缺口。  
修复后，工作流将避免在已知不受支持的 actor 上失败，同时保留对人类触发审查的正常能力。
