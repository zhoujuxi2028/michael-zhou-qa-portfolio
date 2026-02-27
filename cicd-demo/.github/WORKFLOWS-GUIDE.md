# GitHub Actions Workflows Guide

This guide explains the CI/CD strategy using two complementary workflows.

## Workflow Overview

| Workflow | Technology | Speed | Triggers | Purpose |
|----------|-----------|-------|----------|---------|
| `pr-checks.yml` | Node.js Native | ~2-3 min | **PR events** | Fast feedback during development |
| `docker-tests.yml` | Docker Containers | ~5-6 min | **Main branch + Schedule** | Comprehensive validation |

---

## 1. PR Quick Checks (pr-checks.yml)

### When Does It Run?

This workflow is **AUTOMATICALLY triggered** when:

✅ **A Pull Request is opened**
```
Developer creates PR → GitHub detects pull_request event → Workflow runs
```

✅ **New commits are pushed to an existing PR**
```
Developer pushes new commit → GitHub detects 'synchronize' event → Workflow runs
```

✅ **A PR is reopened**
```
Developer reopens closed PR → GitHub detects 'reopened' event → Workflow runs
```

✅ **Manual trigger** (via GitHub UI)
```
Actions tab → Select workflow → Click "Run workflow"
```

### Configuration
```yaml
on:
  pull_request:
    branches: [ main ]
    types: [opened, synchronize, reopened]
  workflow_dispatch:
```

### What It Does
1. Checks out the PR branch
2. Installs Node.js dependencies with caching
3. Runs Cypress tests (Node.js native)
4. Runs Newman API tests (Node.js native)
5. Runs ESLint in parallel
6. Uploads artifacts only on failure

### Why Node.js?
- **Fast feedback**: Developers get results in ~2 minutes
- **Rapid iteration**: Faster than Docker for quick fixes during code review
- **Resource efficient**: No Docker image pulling overhead

---

## 2. Docker-Based Tests (docker-tests.yml)

### When Does It Run?

This workflow is **AUTOMATICALLY triggered** when:

✅ **Code is pushed to main branch** (typically after PR merge)
```
PR merged to main → GitHub detects push event → Workflow runs
```

✅ **Scheduled nightly runs** (every day at 2:00 AM UTC / 10:00 AM Beijing)
```
GitHub scheduler → Checks cron expression → Workflow runs
```

✅ **Manual trigger** (via GitHub UI)
```
Actions tab → Select workflow → Click "Run workflow"
```

### Configuration
```yaml
on:
  push:
    branches: [ main ]
  schedule:
    - cron: '0 2 * * *'  # Daily at 2:00 AM UTC
  workflow_dispatch:
```

### What It Does
1. Checks out the main branch code
2. Builds Newman Docker image
3. Runs Cypress + Newman in Docker containers (parallel)
4. Uploads all test artifacts (videos, screenshots, reports)
5. Publishes test results
6. Cleans up Docker resources

### Why Docker?
- **Environment parity**: Identical to local development and production
- **Comprehensive validation**: For production-bound code
- **Interview demonstration**: Shows Docker and containerization skills

---

## Layered Testing Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                     Developer Workflow                       │
└─────────────────────────────────────────────────────────────┘

1. Developer creates feature branch
   └─> Works locally, commits changes

2. Developer opens Pull Request
   └─> pr-checks.yml RUNS AUTOMATICALLY ✅
       - Node.js tests (2-3 min)
       - Fast feedback

3. Code review happens
   └─> More commits pushed
       └─> pr-checks.yml RUNS AGAIN ✅

4. PR approved and merged to main
   └─> docker-tests.yml RUNS AUTOMATICALLY ✅
       - Docker tests (5-6 min)
       - Comprehensive validation

5. Every night at 2 AM UTC
   └─> docker-tests.yml RUNS ON SCHEDULE ✅
       - Detects flaky tests
       - Catches external dependency issues
```

---

## Trigger Details

### Pull Request Events

GitHub automatically triggers workflows on these PR events:

| Event | When | Example |
|-------|------|---------|
| `opened` | PR created | `git push origin feature-branch` → Create PR |
| `synchronize` | New commits pushed | `git push origin feature-branch` (on existing PR) |
| `reopened` | Closed PR reopened | Click "Reopen" button on closed PR |

**You don't need to do anything special** - GitHub watches for these events automatically.

### Push Events

GitHub triggers workflows when commits are pushed to specified branches:

```yaml
push:
  branches: [ main ]
```

This runs **only when code is pushed directly to main** or **when a PR is merged into main**.

### Schedule Events

GitHub's built-in cron scheduler runs workflows at specified times:

```yaml
schedule:
  - cron: '0 2 * * *'  # Daily at 2:00 AM UTC
```

**Important Notes**:
- Scheduled workflows only run on the **default branch** (main)
- GitHub may delay execution by a few minutes during high load
- Inactive repos: scheduled workflows disable after 60 days of no activity

### Manual Triggers

The `workflow_dispatch` event allows manual runs:

**How to trigger manually**:
1. Go to your repository on GitHub
2. Click "Actions" tab
3. Select the workflow (pr-checks or docker-tests)
4. Click "Run workflow" button
5. Select branch (if applicable)
6. Click green "Run workflow" button

---

## Example Scenarios

### Scenario 1: Developer Creates PR

```
Developer: git push origin feature-auth-fix
Developer: [Opens PR on GitHub]

GitHub: 🔔 Detected pull_request.opened event
GitHub: ▶️  Running pr-checks.yml...
GitHub: ✅ Tests passed in 2m 15s

Developer: [Sees green checkmark on PR]
```

### Scenario 2: Code Review Iteration

```
Reviewer: "Please fix the login error handling"

Developer: [Makes changes]
Developer: git push origin feature-auth-fix

GitHub: 🔔 Detected pull_request.synchronize event
GitHub: ▶️  Running pr-checks.yml again...
GitHub: ✅ Tests passed in 2m 08s
```

### Scenario 3: PR Merged to Main

```
Maintainer: [Clicks "Merge pull request"]

GitHub: 🔔 Detected push event on main branch
GitHub: ▶️  Running docker-tests.yml...
GitHub: ✅ Tests passed in 5m 42s
GitHub: ✅ Main branch validated with Docker
```

### Scenario 4: Nightly Regression

```
Time: 2:00 AM UTC (10:00 AM Beijing)

GitHub Scheduler: 🔔 Cron trigger: '0 2 * * *'
GitHub: ▶️  Running docker-tests.yml...
GitHub: ❌ Tests failed! External API changed!
GitHub: 📧 Sends notification to team
```

---

## Best Practices

### 1. Branch Protection Rules

Configure branch protection on main branch:
- ✅ Require `pr-checks.yml` to pass before merging
- ✅ Require code review
- ✅ Prevent direct pushes to main

### 2. Artifact Management

- **pr-checks.yml**: Only uploads on failure (saves storage)
- **docker-tests.yml**: Always uploads (debugging production issues)

### 3. Timeout Settings

- **pr-checks.yml**: 10 minutes (fail fast for quick feedback)
- **docker-tests.yml**: 30 minutes (allow comprehensive testing)

### 4. Scheduled Testing

- Run during low-traffic hours (2 AM)
- Don't run on weekends if not necessary (save CI minutes)
- Adjust frequency based on project needs

---

## Monitoring Workflows

### View Workflow Runs

1. Go to repository → "Actions" tab
2. See all workflow runs with status
3. Click any run to see detailed logs

### Check Scheduled Runs

```bash
# Via GitHub CLI
gh run list --workflow=docker-tests.yml --limit 10
```

### Download Artifacts

```bash
# Via GitHub CLI
gh run download <run-id>
```

---

## Troubleshooting

### PR Workflow Not Running?

Check:
1. Workflow file is on the **PR branch** (not just main)
2. YAML syntax is valid (use `yamllint`)
3. Branch name matches filter: `branches: [ main ]`

### Scheduled Workflow Not Running?

Check:
1. Workflow file is on the **default branch** (main)
2. Repository is active (commits in last 60 days)
3. Cron syntax is correct (use [crontab.guru](https://crontab.guru))

### Docker Tests Failing?

Check:
1. Docker images can be pulled (network issues?)
2. `docker-compose.yml` is valid
3. Ports are not in use (shouldn't happen in CI)

---

## Interview Talking Points

**"Why two workflows?"**
> "We use a layered testing strategy. PR checks with Node.js provide fast feedback (~2 min) for rapid iteration during code review. Docker tests on main branch and scheduled runs provide comprehensive validation with environment parity. This balances developer productivity with production reliability."

**"How are they triggered?"**
> "PR checks run automatically on every pull request event - when opened, updated, or reopened. Docker tests run when code is merged to main, on a nightly schedule, and can be triggered manually. This ensures every code path is validated before and after integration."

**"Why Docker for some tests but not others?"**
> "Docker provides environment consistency but adds ~2 minutes of overhead. For PR feedback where speed matters, we use Node.js directly. For production-bound code and regression testing, we prioritize environment parity with Docker. It's about choosing the right tool for the context."

---

## Quick Reference

### Workflow Triggers Summary

```yaml
# pr-checks.yml - FAST FEEDBACK
on:
  pull_request:           # Auto: when PR opened/updated
  workflow_dispatch:      # Manual: from GitHub UI

# docker-tests.yml - COMPREHENSIVE VALIDATION
on:
  push:                   # Auto: when merged to main
    branches: [ main ]
  schedule:               # Auto: daily at 2 AM UTC
    - cron: '0 2 * * *'
  workflow_dispatch:      # Manual: from GitHub UI
```

### Testing Flow

```
PR → Node.js tests (auto) → Code review → Merge → Docker tests (auto)
                                                         ↓
                                              Nightly Docker tests (schedule)
```
