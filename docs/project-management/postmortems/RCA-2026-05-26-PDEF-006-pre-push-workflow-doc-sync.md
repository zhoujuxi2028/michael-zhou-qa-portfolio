---
id: PDEF-006
date: 2026-05-26
severity: P2
status: resolved
pr: "#291"
issue: "#292"
---

# RCA: pre-push hook 未覆盖 workflow 文档同步检查

## 事件摘要

PR #291（workflow 命名规范化）修改了 6 个 `.github/workflows/*.yml` 文件，但 `ai-testing-ci.yml` 和 `nightly-soak.yml` 未在 `README.md` / `CLAUDE.md` 中登记。该问题在本地 pre-push 阶段未被发现，在 CI `repo-meta-ci.yml` 中才报错，导致额外一轮 push 修复。

## 时间线

| 时间 | 事件 |
|------|------|
| 2026-05-26 22:xx | PR #291 推送，触发 CI |
| 2026-05-26 22:xx | `repo-meta-ci` 报错：README.md / CLAUDE.md 未同步 `ai-testing-ci.yml`、`nightly-soak.yml` |
| 2026-05-26 22:xx | 本地补充两条注册记录，再次推送，CI 通过 |

## 根因分析（5-Why）

```
为什么 PR 被合入 CI 才发现问题？
  → pre-push hook 未检查 workflow 文档同步

为什么 pre-push hook 没有该检查？
  → hook 设计时只覆盖了 Commit Guard、Markdown 断链、Performance 质量门控
    未将 check-workflow-doc-sync.sh 纳入

为什么开发者手动运行脚本也无法发现？
  → check-workflow-doc-sync.sh 依赖 CI 生成的 changed-files.txt
    该文件本地不存在时脚本静默 exit 0，不报错、不提示

为什么 changed-files.txt 只有 CI 才有？
  → 脚本设计时假设由 tj-actions/changed-files 提供输入
    未提供本地运行的等效路径（git diff）
```

## 双重根因

### 根因 A：pre-push hook 存在覆盖盲区

`.husky/pre-push` 未对 `.github/workflows/*.yml` 变更触发 `check-workflow-doc-sync.sh`，导致 workflow 文件变更时本地完全跳过同步检查。

### 根因 B：脚本静默跳过行为掩盖了本地可运行性

```bash
# check-workflow-doc-sync.sh 第 8-11 行
if [ ! -f "$CHANGED_FILE_LIST" ]; then
  echo "info: $CHANGED_FILE_LIST not found, skip workflow-doc sync check."
  exit 0   # ← 静默成功，不提示开发者如何本地运行
fi
```

开发者即使主动运行脚本，也会因 `changed-files.txt` 不存在而静默跳过，形成「本地永远能通过」的假象。

## 修复措施

| # | 措施 | 类型 | 状态 |
|---|------|------|------|
| 1 | pre-push hook 增加 workflow 文档同步检查：检测 `.github/workflows/*.yml` 变更，用 `git diff --name-only` 生成临时 changed-files.txt 并调用脚本 | 预防 | ✅ 已实现 |
| 2 | `check-workflow-doc-sync.sh` 增加本地运行提示：`changed-files.txt` 不存在时打印如何本地生成的说明，而非静默跳过 | 改进 | ✅ 已实现 |
| 3 | `CLAUDE.md` Pre-commit Checklist 补充：workflow 文件变更时需运行同步检查 | 文档 | ✅ 已实现 |

## 改进后的本地检查流程

```bash
# 变更 .github/workflows/ 后，手动验证（pre-push 自动执行）：
git diff --name-only origin/main...HEAD > /tmp/changed-files.txt
bash scripts/check-workflow-doc-sync.sh /tmp/changed-files.txt
rm /tmp/changed-files.txt
```

## 预防机制

```
开发者变更 .github/workflows/*.yml
        ↓
pre-push hook 检测到 workflow 文件变更
        ↓
自动生成 changed-files.txt（git diff）
        ↓
调用 check-workflow-doc-sync.sh
        ↓
README.md / CLAUDE.md 未登记 → push 被阻断（本地反馈）
```

## 经验教训

1. **CI 检查必须有本地等效路径**：任何 CI 质量门禁如果本地无法触发，都是潜在的"只有 CI 才能发现"问题。设计脚本时应同时考虑 CI 模式和本地模式。
2. **静默跳过优于静默成功**：脚本依赖文件缺失时，应打印使用说明（如何本地生成），而非 `exit 0`。
3. **pre-push hook 覆盖面需与 CI 门禁对齐**：每次新增 CI 检查，应评估是否同步加入 pre-push hook。
