# Projects Directory Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move all 14 project directories from repo root into `projects/<category>/` subdirectories to reduce root-level clutter.

**Architecture:** Create a `projects/` tree with 7 category subdirs, `git mv` each project to preserve history, then do batch path replacements across ~20 workflow files and 4 root docs.

**Tech Stack:** git mv, sed/bash replacements, GitHub Actions YAML

---

## Category Mapping

| Category | Projects |
|----------|---------|
| `projects/functional/` | iwsva-cypress-e2e, playwright-demo, selenium-demo, robot-framework-demo, api-testing-demo |
| `projects/platform/` | microservice-testing-platform, k8s-auto-testing-platform, performance-testing-platform, sid-iam-testing-platform |
| `projects/security/` | security-testing-demo |
| `projects/database/` | sql-testing-demo |
| `projects/ai/` | ai-testing-platform, llm-agent-tutorial |
| `projects/devops/` | cicd-demo |
| `projects/automotive/` | ivi-integration-lab |

## Critical Files

**Move targets (14 dirs):** all current root-level project dirs

**Workflow files to update (15):**
- `.github/workflows/ai-testing-ci.yml`
- `.github/workflows/api-testing-ci.yml`
- `.github/workflows/cicd-demo-pr.yml`
- `.github/workflows/cicd-demo-deploy.yml`
- `.github/workflows/cicd-demo-terraform.yml`
- `.github/workflows/docker-tests.yml`
- `.github/workflows/ivi-integration-ci.yml`
- `.github/workflows/k8s-ci.yml`
- `.github/workflows/nightly-soak.yml`
- `.github/workflows/performance-ci.yml`
- `.github/workflows/robot-framework-ci.yml`
- `.github/workflows/security-scan.yml`
- `.github/workflows/security-tests.yml`
- `.github/workflows/sid-iam-ci.yml`
- `.github/workflows/sql-testing-demo-ci.yml`
- `.github/workflows/copilot-setup-steps.yml`

**Root docs to update:**
- `README.md`
- `CLAUDE.md`
- `AGENTS.md`
- `package.json`

**Internal docs with cross-project refs:**
- `docs/project-management/defect-tracking/README.md` — references `../../../performance-testing-platform/`

---

## Task 1: Create feature branch

- [ ] **Step 1: Create branch**

```bash
git checkout -b feature/projects-restructure
```

---

## Task 2: Move all project directories

- [ ] **Step 1: Create category subdirs**

```bash
mkdir -p projects/functional projects/platform projects/security \
         projects/database projects/ai projects/devops projects/automotive
```

- [ ] **Step 2: git mv functional projects**

```bash
git mv iwsva-cypress-e2e projects/functional/
git mv playwright-demo   projects/functional/
git mv selenium-demo     projects/functional/
git mv robot-framework-demo projects/functional/
git mv api-testing-demo  projects/functional/
```

- [ ] **Step 3: git mv platform projects**

```bash
git mv microservice-testing-platform  projects/platform/
git mv k8s-auto-testing-platform      projects/platform/
git mv performance-testing-platform   projects/platform/
git mv sid-iam-testing-platform       projects/platform/
```

- [ ] **Step 4: git mv remaining projects**

```bash
git mv security-testing-demo  projects/security/
git mv sql-testing-demo       projects/database/
git mv ai-testing-platform    projects/ai/
git mv llm-agent-tutorial     projects/ai/
git mv cicd-demo              projects/devops/
git mv ivi-integration-lab    projects/automotive/
```

- [ ] **Step 5: Verify moves**

```bash
ls projects/functional/ projects/platform/ projects/security/ \
   projects/database/ projects/ai/ projects/devops/ projects/automotive/
```
Expected: all 14 project dirs present under correct categories.

- [ ] **Step 6: Commit**

```bash
git add projects/ iwsva-cypress-e2e playwright-demo selenium-demo \
        robot-framework-demo api-testing-demo microservice-testing-platform \
        k8s-auto-testing-platform performance-testing-platform \
        sid-iam-testing-platform security-testing-demo sql-testing-demo \
        ai-testing-platform llm-agent-tutorial cicd-demo ivi-integration-lab
git commit -m "refactor(repo): move projects into projects/<category>/"
```

---

## Task 3: Update workflow files — functional projects

**Pattern for each project:** replace bare `<project>/` with `projects/<category>/<project>/` everywhere in the workflow file.

- [ ] **Step 1: Update api-testing-ci.yml**

```bash
sed -i '' 's|api-testing-demo|projects/functional/api-testing-demo|g' \
    .github/workflows/api-testing-ci.yml
```

- [ ] **Step 2: Update robot-framework-ci.yml**

```bash
sed -i '' 's|robot-framework-demo|projects/functional/robot-framework-demo|g' \
    .github/workflows/robot-framework-ci.yml
```

- [ ] **Step 3: Verify api and robot workflows**

```bash
grep -n "api-testing-demo\|robot-framework-demo" \
    .github/workflows/api-testing-ci.yml \
    .github/workflows/robot-framework-ci.yml
```
Expected: all occurrences now show `projects/functional/` prefix.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/api-testing-ci.yml .github/workflows/robot-framework-ci.yml
git commit -m "fix(ci): update api-testing and robot workflow paths"
```

---

## Task 4: Update workflow files — platform projects

- [ ] **Step 1: Update k8s-ci.yml**

```bash
sed -i '' 's|k8s-auto-testing-platform|projects/platform/k8s-auto-testing-platform|g' \
    .github/workflows/k8s-ci.yml
```

- [ ] **Step 2: Update performance-ci.yml and nightly-soak.yml**

```bash
sed -i '' 's|performance-testing-platform|projects/platform/performance-testing-platform|g' \
    .github/workflows/performance-ci.yml \
    .github/workflows/nightly-soak.yml
```

- [ ] **Step 3: Update sid-iam-ci.yml**

```bash
sed -i '' 's|sid-iam-testing-platform|projects/platform/sid-iam-testing-platform|g' \
    .github/workflows/sid-iam-ci.yml
```

- [ ] **Step 4: Verify**

```bash
grep -c "projects/platform/" \
    .github/workflows/k8s-ci.yml \
    .github/workflows/performance-ci.yml \
    .github/workflows/nightly-soak.yml \
    .github/workflows/sid-iam-ci.yml
```
Expected: each file shows nonzero count with `projects/platform/` prefix.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/k8s-ci.yml .github/workflows/performance-ci.yml \
        .github/workflows/nightly-soak.yml .github/workflows/sid-iam-ci.yml
git commit -m "fix(ci): update platform project workflow paths"
```

---

## Task 5: Update workflow files — security, database, ai, automotive

- [ ] **Step 1: Update security workflows**

```bash
sed -i '' 's|security-testing-demo|projects/security/security-testing-demo|g' \
    .github/workflows/security-tests.yml \
    .github/workflows/security-scan.yml
```

- [ ] **Step 2: Update sql, ai, ivi workflows**

```bash
sed -i '' 's|sql-testing-demo|projects/database/sql-testing-demo|g' \
    .github/workflows/sql-testing-demo-ci.yml

sed -i '' 's|ai-testing-platform|projects/ai/ai-testing-platform|g' \
    .github/workflows/ai-testing-ci.yml

sed -i '' 's|ivi-integration-lab|projects/automotive/ivi-integration-lab|g' \
    .github/workflows/ivi-integration-ci.yml
```

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/security-tests.yml .github/workflows/security-scan.yml \
        .github/workflows/sql-testing-demo-ci.yml .github/workflows/ai-testing-ci.yml \
        .github/workflows/ivi-integration-ci.yml
git commit -m "fix(ci): update security/database/ai/automotive workflow paths"
```

---

## Task 6: Update cicd-demo workflows

`cicd-demo` appears in 4 workflow files (pr, deploy, terraform, docker-tests, security-scan). Note `security-scan.yml` was already updated in Task 5 — only handle the remaining 4 here.

- [ ] **Step 1: Update cicd-demo workflows**

```bash
sed -i '' 's|cicd-demo|projects/devops/cicd-demo|g' \
    .github/workflows/cicd-demo-pr.yml \
    .github/workflows/cicd-demo-deploy.yml \
    .github/workflows/cicd-demo-terraform.yml \
    .github/workflows/docker-tests.yml
```

- [ ] **Step 2: Spot-check terraform workflow (uses `cicd-demo/terraform` subpath)**

```bash
grep "working-directory\|scan-ref\|trivyignores" .github/workflows/cicd-demo-terraform.yml
```
Expected: paths like `projects/devops/cicd-demo/terraform`.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/cicd-demo-pr.yml .github/workflows/cicd-demo-deploy.yml \
        .github/workflows/cicd-demo-terraform.yml .github/workflows/docker-tests.yml
git commit -m "fix(ci): update cicd-demo workflow paths"
```

---

## Task 7: Update copilot-setup-steps.yml

This file has cache paths for 11 projects across all categories.

- [ ] **Step 1: Apply all project renames**

```bash
sed -i '' \
    -e 's|api-testing-demo|projects/functional/api-testing-demo|g' \
    -e 's|iwsva-cypress-e2e|projects/functional/iwsva-cypress-e2e|g' \
    -e 's|playwright-demo|projects/functional/playwright-demo|g' \
    -e 's|selenium-demo|projects/functional/selenium-demo|g' \
    -e 's|microservice-testing-platform|projects/platform/microservice-testing-platform|g' \
    -e 's|performance-testing-platform|projects/platform/performance-testing-platform|g' \
    -e 's|k8s-auto-testing-platform|projects/platform/k8s-auto-testing-platform|g' \
    -e 's|sid-iam-testing-platform|projects/platform/sid-iam-testing-platform|g' \
    -e 's|security-testing-demo|projects/security/security-testing-demo|g' \
    -e 's|ai-testing-platform|projects/ai/ai-testing-platform|g' \
    .github/workflows/copilot-setup-steps.yml
```

- [ ] **Step 2: Verify**

```bash
grep "path:" .github/workflows/copilot-setup-steps.yml
```
Expected: all paths prefixed with `projects/<category>/`.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/copilot-setup-steps.yml
git commit -m "fix(ci): update copilot-setup-steps cache paths"
```

---

## Task 8: Update root docs

- [ ] **Step 1: Update package.json npm scripts and lint-staged globs**

```bash
sed -i '' \
    -e 's|api-testing-demo|projects/functional/api-testing-demo|g' \
    -e 's|microservice-testing-platform|projects/platform/microservice-testing-platform|g' \
    -e 's|playwright-demo|projects/functional/playwright-demo|g' \
    package.json
```

- [ ] **Step 2: Verify package.json**

```bash
grep -n "projects/" package.json
```

- [ ] **Step 3: Update AGENTS.md**

```bash
sed -i '' \
    -e 's|microservice-testing-platform/|projects/platform/microservice-testing-platform/|g' \
    -e 's|playwright-demo/|projects/functional/playwright-demo/|g' \
    -e 's|performance-testing-platform/|projects/platform/performance-testing-platform/|g' \
    AGENTS.md
```

- [ ] **Step 4: Update README.md — markdown links**

Use sed to prefix all `./project-name` links:

```bash
sed -i '' \
    -e 's|\./performance-testing-platform|./projects/platform/performance-testing-platform|g' \
    -e 's|\./playwright-demo|./projects/functional/playwright-demo|g' \
    -e 's|\./selenium-demo|./projects/functional/selenium-demo|g' \
    -e 's|\./robot-framework-demo|./projects/functional/robot-framework-demo|g' \
    -e 's|\./iwsva-cypress-e2e|./projects/functional/iwsva-cypress-e2e|g' \
    -e 's|\./api-testing-demo|./projects/functional/api-testing-demo|g' \
    -e 's|\./security-testing-demo|./projects/security/security-testing-demo|g' \
    -e 's|\./k8s-auto-testing-platform|./projects/platform/k8s-auto-testing-platform|g' \
    -e 's|\./sql-testing-demo|./projects/database/sql-testing-demo|g' \
    -e 's|\./ivi-integration-lab|./projects/automotive/ivi-integration-lab|g' \
    -e 's|\./sid-iam-testing-platform|./projects/platform/sid-iam-testing-platform|g' \
    -e 's|\./microservice-testing-platform|./projects/platform/microservice-testing-platform|g' \
    -e 's|\./ai-testing-platform|./projects/ai/ai-testing-platform|g' \
    -e 's|\./llm-agent-tutorial|./projects/ai/llm-agent-tutorial|g' \
    -e 's|\./cicd-demo|./projects/devops/cicd-demo|g' \
    README.md
```

- [ ] **Step 5: Update CLAUDE.md — table entries and path references**

```bash
sed -i '' \
    -e 's|`iwsva-cypress-e2e/`|`projects/functional/iwsva-cypress-e2e/`|g' \
    -e 's|`cicd-demo/`|`projects/devops/cicd-demo/`|g' \
    -e 's|`api-testing-demo/`|`projects/functional/api-testing-demo/`|g' \
    -e 's|`playwright-demo/`|`projects/functional/playwright-demo/`|g' \
    -e 's|`selenium-demo/`|`projects/functional/selenium-demo/`|g' \
    -e 's|`robot-framework-demo/`|`projects/functional/robot-framework-demo/`|g' \
    -e 's|`security-testing-demo/`|`projects/security/security-testing-demo/`|g' \
    -e 's|`sql-testing-demo/`|`projects/database/sql-testing-demo/`|g' \
    -e 's|`sid-iam-testing-platform/`|`projects/platform/sid-iam-testing-platform/`|g' \
    -e 's|`microservice-testing-platform/`|`projects/platform/microservice-testing-platform/`|g' \
    -e 's|`performance-testing-platform/`|`projects/platform/performance-testing-platform/`|g' \
    -e 's|`k8s-auto-testing-platform/`|`projects/platform/k8s-auto-testing-platform/`|g' \
    -e 's|`ai-testing-platform/`|`projects/ai/ai-testing-platform/`|g' \
    -e 's|`llm-agent-tutorial/`|`projects/ai/llm-agent-tutorial/`|g' \
    -e 's|`ivi-integration-lab/`|`projects/automotive/ivi-integration-lab/`|g' \
    -e 's|performance-testing-platform/docs/|projects/platform/performance-testing-platform/docs/|g' \
    -e 's|performance-testing-platform/tests/|projects/platform/performance-testing-platform/tests/|g' \
    CLAUDE.md
```

- [ ] **Step 6: Commit root docs**

```bash
git add README.md CLAUDE.md AGENTS.md package.json
git commit -m "docs(root): update project paths for projects/ restructure"
```

---

## Task 9: Fix internal cross-project references

- [ ] **Step 1: Update defect-tracking README**

The file `docs/project-management/defect-tracking/README.md` references `../../../performance-testing-platform/`.
After move, path becomes `../../../../projects/platform/performance-testing-platform/`.

```bash
sed -i '' \
    's|\.\./\.\./\.\./performance-testing-platform/|../../../../projects/platform/performance-testing-platform/|g' \
    docs/project-management/defect-tracking/README.md
```

- [ ] **Step 2: Verify**

```bash
grep "performance-testing-platform" docs/project-management/defect-tracking/README.md
```

- [ ] **Step 3: Commit**

```bash
git add docs/project-management/defect-tracking/README.md
git commit -m "docs: fix cross-project relative paths after restructure"
```

---

## Task 10: Final verification

- [ ] **Step 1: Check no bare project names remain in workflows**

```bash
for proj in iwsva-cypress-e2e api-testing-demo playwright-demo selenium-demo \
            robot-framework-demo cicd-demo microservice-testing-platform \
            k8s-auto-testing-platform performance-testing-platform \
            sid-iam-testing-platform security-testing-demo sql-testing-demo \
            ai-testing-platform llm-agent-tutorial ivi-integration-lab; do
  count=$(grep -rl "^  *${proj}" .github/workflows/ 2>/dev/null | wc -l)
  echo "$proj: $count unpatched files"
done
```
Expected: all counts are 0.

- [ ] **Step 2: Validate all project dirs exist under projects/**

```bash
find projects/ -maxdepth 2 -mindepth 2 -type d | sort
```
Expected: 14 entries, one per project.

- [ ] **Step 3: Run markdown link checker**

```bash
bash scripts/check-markdown-links.sh
```
Expected: no broken relative links.

- [ ] **Step 4: Validate YAML syntax on changed workflows**

```bash
for f in .github/workflows/*.yml; do
  python3 -c "import yaml,sys; yaml.safe_load(open('$f'))" && echo "OK: $f" || echo "FAIL: $f"
done
```
Expected: all OK.

- [ ] **Step 5: Push and open PR**

```bash
git push -u origin feature/projects-restructure
```
Then open PR via `gh pr create`.

---

## Verification

End-to-end test after PR merges:
1. Push a trivial change to any moved project → confirm its CI workflow triggers
2. Check GitHub Actions tab: workflow paths resolve correctly (no "path not found" errors)
3. Run `bash scripts/check-markdown-links.sh` on main to confirm no broken links
