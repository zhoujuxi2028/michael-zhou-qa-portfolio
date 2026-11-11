# Infra Directory Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move `cicd-demo` and `k8s-auto-testing-platform` out of `projects/` into a new root-level `infra/` directory, mirroring the `ai-lab/` pattern.

**Architecture:** Create `infra/` at repo root → `git mv` both projects → update all path references in 7 workflow files + 3 root docs → remove empty `projects/devops/` → verify & PR.

**Tech Stack:** git mv, sed (macOS BSD), GitHub Actions YAML

---

## File Map

| File | Change |
|------|--------|
| `projects/devops/cicd-demo/` | Move → `infra/cicd-demo/` |
| `projects/platform/k8s-auto-testing-platform/` | Move → `infra/k8s-auto-testing-platform/` |
| `.github/workflows/cicd-demo-pr.yml` | `projects/devops/cicd-demo` → `infra/cicd-demo` |
| `.github/workflows/cicd-demo-deploy.yml` | `projects/devops/cicd-demo` → `infra/cicd-demo` |
| `.github/workflows/cicd-demo-terraform.yml` | `projects/devops/cicd-demo` → `infra/cicd-demo` |
| `.github/workflows/docker-tests.yml` | `projects/devops/cicd-demo` → `infra/cicd-demo` |
| `.github/workflows/security-scan.yml` | `projects/devops/cicd-demo` → `infra/cicd-demo` |
| `.github/workflows/k8s-ci.yml` | `projects/platform/k8s-auto-testing-platform` → `infra/k8s-auto-testing-platform` |
| `.github/workflows/copilot-setup-steps.yml` | both old paths → new `infra/` paths |
| `CLAUDE.md` | table entries + path references |
| `README.md` | links + inline path references |
| `AGENTS.md` | no path changes needed (uses bare names) |

---

## Task 1: Create feature branch

- [ ] **Step 1: Create branch**

```bash
git checkout -b feature/infra-directory
```

- [ ] **Step 2: Verify**

```bash
git branch --show-current
```
Expected: `feature/infra-directory`

---

## Task 2: git mv both projects into infra/

- [ ] **Step 1: Create infra/ and move cicd-demo**

```bash
mkdir -p infra
git mv projects/devops/cicd-demo infra/cicd-demo
```

- [ ] **Step 2: Move k8s-auto-testing-platform**

```bash
git mv projects/platform/k8s-auto-testing-platform infra/k8s-auto-testing-platform
```

- [ ] **Step 3: Remove empty projects/devops/**

```bash
rmdir projects/devops
```

- [ ] **Step 4: Verify directory structure**

```bash
ls infra/
ls projects/
```
Expected: `infra/` contains `cicd-demo  k8s-auto-testing-platform`; `projects/devops` is gone.

- [ ] **Step 5: Commit**

```bash
git add infra/ projects/
git commit -m "$(cat <<'EOF'
refactor(repo): move cicd-demo and k8s to infra/ (#NNN)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```
> Replace `#NNN` with issue number if applicable, or omit `(#NNN)`.

---

## Task 3: Update cicd-demo workflow files

Affects: `cicd-demo-pr.yml`, `cicd-demo-deploy.yml`, `cicd-demo-terraform.yml`, `docker-tests.yml`, `security-scan.yml`

- [ ] **Step 1: Bulk replace in all 5 files**

```bash
sed -i '' 's|projects/devops/cicd-demo|infra/cicd-demo|g' \
    .github/workflows/cicd-demo-pr.yml \
    .github/workflows/cicd-demo-deploy.yml \
    .github/workflows/cicd-demo-terraform.yml \
    .github/workflows/docker-tests.yml \
    .github/workflows/security-scan.yml
```

- [ ] **Step 1b: Fix stale self-reference trigger paths (already wrong before this PR)**

Three workflow files contain a `paths:` trigger that points to a non-existent location
(`.github/workflows/projects/devops/cicd-demo-*.yml`). The bulk sed above turns them into
`.github/workflows/infra/cicd-demo-*.yml` — still wrong. Correct them to their actual path:

```bash
sed -i '' \
    's|\.github/workflows/infra/cicd-demo-pr\.yml|.github/workflows/cicd-demo-pr.yml|g' \
    .github/workflows/cicd-demo-pr.yml

sed -i '' \
    's|\.github/workflows/infra/cicd-demo-deploy\.yml|.github/workflows/cicd-demo-deploy.yml|g' \
    .github/workflows/cicd-demo-deploy.yml

sed -i '' \
    's|\.github/workflows/infra/cicd-demo-terraform\.yml|.github/workflows/cicd-demo-terraform.yml|g' \
    .github/workflows/cicd-demo-terraform.yml
```

- [ ] **Step 2: Verify — no old path remains**

```bash
grep -n "projects/devops/cicd-demo" \
    .github/workflows/cicd-demo-pr.yml \
    .github/workflows/cicd-demo-deploy.yml \
    .github/workflows/cicd-demo-terraform.yml \
    .github/workflows/docker-tests.yml \
    .github/workflows/security-scan.yml
```
Expected: no output (zero matches).

- [ ] **Step 3: Spot-check new paths present**

```bash
grep -c "infra/cicd-demo" \
    .github/workflows/cicd-demo-pr.yml \
    .github/workflows/cicd-demo-deploy.yml \
    .github/workflows/cicd-demo-terraform.yml
```
Expected: each file shows nonzero count.

- [ ] **Step 4: Validate YAML syntax**

```bash
for f in .github/workflows/cicd-demo-pr.yml \
          .github/workflows/cicd-demo-deploy.yml \
          .github/workflows/cicd-demo-terraform.yml \
          .github/workflows/docker-tests.yml \
          .github/workflows/security-scan.yml; do
  python3 -c "import yaml,sys; yaml.safe_load(open('$f'))" && echo "OK: $f" || echo "FAIL: $f"
done
```
Expected: all `OK`.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/cicd-demo-pr.yml \
        .github/workflows/cicd-demo-deploy.yml \
        .github/workflows/cicd-demo-terraform.yml \
        .github/workflows/docker-tests.yml \
        .github/workflows/security-scan.yml
git commit -m "$(cat <<'EOF'
fix(ci): update cicd-demo workflow paths to infra/

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Update k8s-ci.yml and copilot-setup-steps.yml

- [ ] **Step 1: Update k8s-ci.yml**

```bash
sed -i '' 's|projects/platform/k8s-auto-testing-platform|infra/k8s-auto-testing-platform|g' \
    .github/workflows/k8s-ci.yml
```

- [ ] **Step 2: Update copilot-setup-steps.yml**

```bash
sed -i '' \
    -e 's|projects/devops/cicd-demo|infra/cicd-demo|g' \
    -e 's|projects/platform/k8s-auto-testing-platform|infra/k8s-auto-testing-platform|g' \
    .github/workflows/copilot-setup-steps.yml
```

- [ ] **Step 3: Verify — no old paths remain**

```bash
grep -n "projects/devops/cicd-demo\|projects/platform/k8s-auto-testing-platform" \
    .github/workflows/k8s-ci.yml \
    .github/workflows/copilot-setup-steps.yml
```
Expected: no output.

- [ ] **Step 4: Validate YAML syntax**

```bash
for f in .github/workflows/k8s-ci.yml .github/workflows/copilot-setup-steps.yml; do
  python3 -c "import yaml,sys; yaml.safe_load(open('$f'))" && echo "OK: $f" || echo "FAIL: $f"
done
```
Expected: both `OK`.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/k8s-ci.yml .github/workflows/copilot-setup-steps.yml
git commit -m "$(cat <<'EOF'
fix(ci): update k8s and copilot workflow paths to infra/

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Update root docs (CLAUDE.md, README.md)

- [ ] **Step 1: Update CLAUDE.md**

```bash
sed -i '' \
    -e 's|projects/devops/cicd-demo/|infra/cicd-demo/|g' \
    -e 's|`projects/devops/cicd-demo/`|`infra/cicd-demo/`|g' \
    -e 's|projects/platform/k8s-auto-testing-platform/|infra/k8s-auto-testing-platform/|g' \
    -e 's|`projects/platform/k8s-auto-testing-platform/`|`infra/k8s-auto-testing-platform/`|g' \
    CLAUDE.md
```

Also update the Projects table category column (DevOps → Infra, 稳定性测试 stays but path moves):

```bash
sed -i '' \
    -e 's/| DevOps | `infra\/cicd-demo\//| Infra | `infra\/cicd-demo\//g' \
    CLAUDE.md
```

- [ ] **Step 2: Update README.md**

```bash
sed -i '' \
    -e 's|\./projects/devops/cicd-demo/|./infra/cicd-demo/|g' \
    -e 's|projects/devops/cicd-demo/|infra/cicd-demo/|g' \
    -e 's|\./projects/platform/k8s-auto-testing-platform/|./infra/k8s-auto-testing-platform/|g' \
    -e 's|projects/platform/k8s-auto-testing-platform/|infra/k8s-auto-testing-platform/|g' \
    README.md
```

- [ ] **Step 3: Verify no old paths remain in CLAUDE.md and README.md**

```bash
grep -n "projects/devops/cicd-demo\|projects/platform/k8s-auto-testing-platform" CLAUDE.md README.md
```
Expected: no output.

- [ ] **Step 4: Run markdown link checker**

```bash
bash scripts/check-markdown-links.sh
```
Expected: no broken relative links.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md README.md
git commit -m "$(cat <<'EOF'
docs(root): update project paths for infra/ restructure

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Final verification

- [ ] **Step 1: Confirm no stale paths in any workflow**

```bash
grep -rn "projects/devops/cicd-demo\|projects/platform/k8s-auto-testing-platform" \
    .github/workflows/ CLAUDE.md README.md AGENTS.md
```
Expected: no output.

- [ ] **Step 2: Confirm infra/ structure**

```bash
find infra/ -maxdepth 1 -mindepth 1 -type d | sort
```
Expected:
```
infra/cicd-demo
infra/k8s-auto-testing-platform
```

- [ ] **Step 3: Validate all workflow YAML**

```bash
for f in .github/workflows/*.yml; do
  python3 -c "import yaml,sys; yaml.safe_load(open('$f'))" && echo "OK: $f" || echo "FAIL: $f"
done
```
Expected: all `OK`.

- [ ] **Step 4: Push and open PR**

```bash
git push -u origin feature/infra-directory
gh pr create --title "refactor(repo): move infra projects to infra/ root dir" \
  --body "$(cat <<'EOF'
## Summary
- Move `cicd-demo` from `projects/devops/` to `infra/cicd-demo/`
- Move `k8s-auto-testing-platform` from `projects/platform/` to `infra/k8s-auto-testing-platform/`
- Remove now-empty `projects/devops/`
- Update all 7 workflow files + CLAUDE.md + README.md

## Test plan
- [ ] All CI workflows show `infra/` paths — no `projects/devops/` or `projects/platform/k8s-*` refs remain
- [ ] YAML syntax valid on all changed workflows
- [ ] Markdown link checker passes
- [ ] k8s-ci.yml and cicd-demo-* workflows trigger correctly on next push

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Verification After Merge

1. Push a trivial change under `infra/cicd-demo/` → confirm `cicd-demo-pr.yml` triggers
2. Push a trivial change under `infra/k8s-auto-testing-platform/` → confirm `k8s-ci.yml` triggers
3. Check GitHub Actions tab: no "path not found" errors
