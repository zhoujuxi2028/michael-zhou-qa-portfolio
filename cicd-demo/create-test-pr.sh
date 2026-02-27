#!/bin/bash
# Script to create test PR for verifying pr-checks workflow

gh pr create \
  --title "Test: Verify PR Workflow Automatic Triggering" \
  --body "$(cat <<'EOF'
## Purpose

This is a **test Pull Request** to verify that the `pr-checks.yml` workflow triggers automatically.

## What This Tests

- ✅ Automatic workflow triggering on `pull_request.opened` event
- ✅ Node.js based test execution (Cypress + Newman)
- ✅ ESLint code quality checks
- ✅ Parallel job execution (tests + lint)
- ✅ Test artifact uploads
- ✅ PR check status reporting

## Expected Behavior

Within ~10 seconds of creating this PR:

1. GitHub detects the `pull_request.opened` event
2. `pr-checks.yml` workflow starts automatically
3. Two jobs run in parallel:
   - "Fast Tests (Node.js Native)"
   - "Code Linting"
4. Newman API tests execute (18 assertions)
5. ESLint runs on Cypress test files
6. Green checkmark appears on PR (or red X if fails)

**Expected completion time:** 2-3 minutes

## Verification Checklist

- [ ] Check "Checks" section below shows workflow running
- [ ] Verify both jobs appear (tests + lint)
- [ ] Confirm Newman tests pass (18/18 assertions)
- [ ] Confirm ESLint passes (0 errors acceptable)
- [ ] Check artifacts are uploaded (Newman reports)
- [ ] Verify green checkmark appears

## After Verification

This PR will be **closed and deleted** after successful verification. It serves only to test CI/CD automation.

---

**Interview Note:** This demonstrates understanding of GitHub Actions event-driven workflows and PR-based CI/CD validation strategies.
EOF
)" \
  --base main \
  --head test/verify-pr-workflow \
  --web
