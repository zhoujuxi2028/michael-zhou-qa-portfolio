## Summary

<!-- What does this PR do? Link related issues with #issue-number -->

## Changes

-

## Test Plan

- [ ] Lint passes (`black`/`flake8` or `eslint`)
- [ ] Format check passes (`prettier --check` or `black --check`)
- [ ] Unit tests pass locally
- [ ] CI green (all required status checks pass before merge)
- [ ] 增量覆盖率不下降（相对目标分支基线）
- [ ] 失败已分类（代码缺陷/环境波动/数据问题/依赖问题）
- [ ] 文档改动已校验相对链接可达性（无 Broken Markdown links）

## Checklist

- [ ] Follows conventional commit style (`feat:`, `fix:`, `docs:`, `test:`)
- [ ] Commit subject ≤ 72（已运行 `bash scripts/check-commit-guard.sh`）
- [ ] No credentials or secrets committed
- [ ] CLAUDE.md updated (if project structure changed)
- [ ] docs/ updated (if applicable)

## Workflow Drift Check（if workflow changed）

- [ ] Workflow 名称已同步到根 `README.md` 与根 `CLAUDE.md`
- [ ] 已检查 branch protection / rulesets 的 required checks

## Architecture Check (Documentation)

<!-- If this PR adds or modifies documentation files, verify these items: -->

- [ ] **No duplicate documentation** — verified against `docs/ARCHITECTURE.md` that no information is repeated
- [ ] **Single source of truth** — if information exists elsewhere, link instead of copying
- [ ] **Clear responsibility** — new files have a single, well-defined purpose
- [ ] **Naming convention** — follows `docs/ARCHITECTURE.md` naming rules
- [ ] **Navigation updated** — related index/README files link to new docs

<!-- If no docs are added/modified, mark all as N/A -->
