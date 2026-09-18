# AGENTS.md — QA Portfolio

Michael Zhou's QA portfolio: ~12 **independent** test-automation projects in one repo.
No npm workspaces / no monorepo tooling — each project has its own `package.json` or `venv`, install and test separately. Root `package.json` exists only for Husky, lint-staged, and commitlint.

Full conventions live in `CLAUDE.md` (root) and each project's `CLAUDE.md` / `README.md`. This file is the fast entry point.

## Critical rules

- **Never work on `main`.** Use `feature/*`, `fix/*`, `docs/*`, `copilot/*`, or `hotfix/*`. `.husky/pre-push` rejects direct pushes to `main`/`master`/`release/*` (admin escape: `ALLOW_DIRECT_PUSH=1`).
- **5-stage process** (requirements → design → development → testing → closing). Pause for human review after each stage; never auto-advance. Checklist: `docs/dev-process-checklist.md`; gate automation: `phase-gate` skill.
- **Conventional Commits**, subject ≤ 72 chars, no trailing period. Types: `feat|fix|docs|style|refactor|test|chore|ci|perf|build|revert`. Enforced by `.husky/commit-msg` + CI `commit-guard.yml`.
- Cloud Agent `report_progress` commits **bypass Husky** — CI `commit-guard.yml` still blocks; keep subjects short.
- **Never mask failures**: no `|| true`, no `continue-on-error`, no `--collect-only` as the final test command. Verify CI goes red on a real failure.

## Hooks (auto-run; require root `npm install`)

| Hook | Does |
|------|------|
| `pre-commit` | Secret scan on staged diff (allowlist `.secretsallow`) + lint-staged: `ruff` for `*.py`, `eslint` for `microservice-testing-platform` / `playwright-demo` JS/TS |
| `pre-push` | Commit Guard + markdown link check (changed `.md`) + workflow-doc sync + perf quality gates when `performance-testing-platform/` changed |

Workflow doc sync: any change under `.github/workflows/*.yml` must register the exact filename in **both** `README.md` and `CLAUDE.md` (`scripts/check-workflow-doc-sync.sh`). Full list of workflows and naming rules is in `CLAUDE.md`.

## Commands

Node.js projects (run inside the project dir):

| Project | Test / verify |
|---------|---------------|
| `performance-testing-platform` | `npm test` (unit) · `npm run test:coverage` · `npm run lint` · `npm run k6:smoke` · `npm run jmeter:smoke` · `bash scripts/integration-test.sh` (mutex lock; stale: `rm -rf /tmp/integration-test.lock`) |
| `playwright-demo` | `npx playwright install` once, then `npx playwright test` (`--project=chromium\|firefox\|webkit`, `npm run test:a11y`, `test:visual`) |
| `api-testing-demo` | start `npm run server` (json-server :3001) then `npm test`; `npm run validate` (collection/env schema); root shortcuts `npm run test:api`, `npm run validate:api` |
| `microservice-testing-platform` | `npm run test:unit\|contract\|integration\|e2e`; integration needs `docker compose up -d` (Redis :6379) |
| `iwsva-cypress-e2e` | `npm test` (single spec) · `npm run test:all`; needs IWSVA at :8443 |
| `cicd-demo` | Terraform / Helm / ArgoCD — see `cicd-demo/CLAUDE.md` |

Python projects: `python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt`, then `pytest tests/ -v`.

| Project | Notes |
|---------|-------|
| `ai-testing-platform` | `pytest tests/ -v -m "not llm and not integration"` (LLM tests need `OPENAI_API_KEY`) |
| `k8s-auto-testing-platform` | `pytest tests/ -v -m "not integration"` for unit |
| `security-testing-demo` | black/isort/flake8 + pytest; Docker brings up Juice Shop (:3100) / ZAP (:8090) |
| `sid-iam-testing-platform`, `selenium-demo`, `robot-framework-demo` | see project `CLAUDE.md` |

Quality tooling differs by project: Python uses `black` + `isort` + `flake8 --max-line-length=120 --extend-ignore=E203` (plus `ruff` in pre-commit); Node uses `eslint` + `prettier`. Coverage targets: statements ≥ 80%, branches ≥ 70%, functions ≥ 75%.

## Gotchas

- **Ports are pre-allocated** to avoid cross-project conflicts; full table in `CLAUDE.md`. Common: 3000 perf API, 3001–3002 api json-server, 3003–3005 microservices, 3010/8086 perf Grafana/InfluxDB, 3100/8090 security, 6379 Redis, 8080/3020 k8s.
- New pytest markers must be declared in `pytest.ini` (strict markers) or CI fails.
- New deps must be added to `package.json` / `requirements.txt`; CI writes files — ensure dirs exist (`mkdir -p`).
- k6 setup requests pollute thresholds — tag them (`tags: {name: 'setup'}`). Run `npm run jmeter:dryrun` before full JMeter tests.
- Worktrees go to `~/.config/superpowers/worktrees/michael-zhou-qa-portfolio/`, not `.worktrees/` in-repo.

## References

- `CLAUDE.md` — root source of truth: project table, port allocation, workflow table, commit/branch rules.
- `docs/dev-process-checklist.md` — 5-stage gate items.
- `docs/process/workaround-tracking.md` — required tracking for any workaround.
- `docs/GIT-COMMIT-CONVENTION.md` — commit format details.
- `docs/ARCHITECTURE.md` — documentation responsibility matrix.
