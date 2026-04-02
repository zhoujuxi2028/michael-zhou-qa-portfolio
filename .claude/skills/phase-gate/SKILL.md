---
name: phase-gate
description: Automate 5-stage dev process gate checks. Use when transitioning between phases (requirements, design, development, testing, closing) or when user says "phase gate", "stage check", "checklist", or "ready for review".
user-invocable: true
allowed-tools: Read, Grep, Glob, Bash, Agent, TaskCreate, TaskUpdate
---

# Phase Gate — Stage Transition Checklist

Automates the 5-stage dev process gate checks defined in `docs/dev-process-checklist.md`.

## Usage

```
/phase-gate <phase> [project-dir]
```

- `<phase>`: `1` | `requirements` | `2` | `design` | `3` | `development` | `4` | `testing` | `5` | `closing`
- `[project-dir]`: optional, defaults to current working directory (e.g., `performance-testing-platform`)

## Behavior

### Step 1: Identify Phase and Project

Parse `$ARGUMENTS` to determine:
1. Which phase (1-5) to gate-check
2. Which project directory to check

If phase is ambiguous, ask the user.

### Step 2: Run the Checklist

For the identified phase, verify **every** checklist item below. For each item:
- **Auto-verify** where possible (run commands, check file existence, grep for content)
- **Manual-verify** where automation isn't possible (flag for user review)

Report results as a table:

```
| # | Item | Status | Evidence |
|---|------|--------|----------|
| 1 | ... | PASS/FAIL/MANUAL | command output or file path |
```

### Step 3: Gate Decision

- **ALL PASS** → "Gate PASSED — ready for user review before proceeding to Phase N+1"
- **ANY FAIL** → "Gate BLOCKED — N items need attention" + list fixes needed
- **MANUAL items** → "Gate PENDING — N items require user verification"

**CRITICAL: Never auto-proceed to the next phase. Always pause and wait for user confirmation.**

---

## Phase Checklists

### Phase 1: Requirements (needs)

| # | Item | Verification Method |
|---|------|-------------------|
| 1 | Issue read, objective clear | MANUAL — ask user to confirm |
| 2 | User stories and use cases defined | MANUAL — ask user to confirm |
| 3 | Scope confirmed (phase breakdown, feature boundaries) | MANUAL — ask user to confirm |
| 4 | Feasibility assessed (local env, dependencies, risks) | MANUAL — ask user to confirm |
| 5 | Dependencies identified | MANUAL — ask user to confirm |
| 6 | Requirements numbered (e.g., AUTH-01) | `grep -c '[A-Z]+-[0-9]+' docs/project-management/requirements.md` |
| 7 | Requirements documented in requirements.md | `test -f docs/project-management/requirements.md` + check non-empty |
| 8 | New project: doc scaffolds created | `test -f CLAUDE.md && test -f README.md && test -d docs/` |

### Phase 2: Design

| # | Item | Verification Method |
|---|------|-------------------|
| 1 | Implementation plan written | `find docs/project-management/ -name 'implementation-plan*'` |
| 2 | Plan Reviewer executed | MANUAL — ask user to confirm (check for reviewer fix record in plan) |
| 3 | All reviewer issues resolved | MANUAL — ask user to confirm |
| 4 | Architecture doc updated | `test -f docs/architecture/architecture.md` + grep for current phase content |
| 5 | Test strategy doc updated | `test -f docs/test-cases/test-cases.md` + grep for current phase content |
| 6 | Consistent with existing patterns | MANUAL — spot-check directory structure, config files, naming |

### Phase 3: Development

| # | Item | Verification Method |
|---|------|-------------------|
| 1 | Prerequisites verified | Run `which <tool>` / `<tool> --version` for tools in implementation plan |
| 2 | TDD followed (RED-GREEN-REFACTOR) | MANUAL — check git log for test-first commits |
| 3 | Source code produced in src/ | `ls src/` — check for new modules per implementation plan |
| 4 | Test code produced in tests/ | `ls tests/` — check for new test files |
| 5 | Config files updated | Check `package.json` or `requirements.txt` for new dependencies |
| 6 | Independent commits per task | `git log --oneline` — verify multiple commits |
| 7 | Conventional commit messages | `git log --oneline` — verify feat:/fix:/test:/docs: prefixes |
| 8 | Lint passes | Run project lint command (`npx eslint .` or `black --check`) |
| 9 | New deps in dependency file | Cross-check `require()`/`import` vs package.json/requirements.txt |
| 10 | No hardcoded secrets | `grep -rn 'password\|secret\|credential\|api_key' src/ --include='*.js' --include='*.py'` — flag suspicious matches |
| 11 | Self-test verification executed | MANUAL — ask for run evidence |

### Phase 4: Testing

| # | Item | Verification Method |
|---|------|-------------------|
| 1 | All unit tests PASS | Run `npm test` or `pytest tests/ -v` — check exit code and output |
| 2 | Lint check passes | Run `npx eslint .` or `black --check src/ tests/` |
| 3 | Format check passes | Run `npx prettier --check .` or `isort --check-only` (if configured) |
| 4 | Coverage meets threshold | Run `npm test -- --coverage` or `pytest --cov` |
| 5 | Integration/E2E tests pass | Run integration test command if applicable |
| 6 | Test reports produced | Check `coverage/` directory exists |
| 7 | CI pipeline green | `gh run list --limit 3` — check latest run status |
| 8 | Pre-commit checklist passed | MANUAL — cross-reference root CLAUDE.md |

### Phase 5: Closing

| # | Item | Verification Method |
|---|------|-------------------|
| 1 | PR created | `gh pr list --head $(git branch --show-current)` |
| 2 | Project README.md finalized | `test -f README.md` + check content completeness |
| 3 | Project CLAUDE.md finalized | `test -f CLAUDE.md` + check content completeness |
| 4 | Root CLAUDE.md registered | Grep root CLAUDE.md for project name in Projects table, Quick Commands, GitHub Actions |
| 5 | Root README.md registered | Grep root README.md for project name |
| 6 | Wiki synced | MANUAL — ask user to confirm |
| 7 | PR merged | `gh pr view --json state` |

---

## Rules

1. **Always read `docs/dev-process-checklist.md` first** to check for any updates to the checklist
2. **Run real commands** for auto-verifiable items — never assume or guess
3. **Show actual command output** as evidence for PASS/FAIL
4. **Never skip MANUAL items** — always flag them for user review
5. **Never proceed to next phase** without explicit user approval
6. **If a check fails**, explain what's wrong and suggest the fix
7. **Language**: Match the user's language (Chinese if they write Chinese, English if English)
