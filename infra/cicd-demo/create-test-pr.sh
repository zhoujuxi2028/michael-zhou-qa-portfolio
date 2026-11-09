#!/bin/bash
# Script to create test PR for verifying security-scan workflow

gh pr create \
  --title "Test: Verify Security Scan Workflow Triggering" \
  --body "$(cat <<'EOF'
## Purpose

This is a **test Pull Request** to verify that the `security-scan.yml` workflow triggers automatically.

## What This Tests

- ✅ Automatic workflow triggering on `pull_request.opened` event
- ✅ npm audit job execution
- ✅ Trivy filesystem / Docker / IaC scans
- ✅ SARIF upload to GitHub Security tab
- ✅ PR status reporting

## Expected Behavior

Within ~10 seconds of creating this PR:

1. GitHub detects the `pull_request.opened` event
2. `security-scan.yml` workflow starts automatically
3. Security jobs begin running:
   - "NPM Dependency Audit"
   - "Trivy Filesystem Scan"
   - "Trivy Docker Image Scan"
   - "Trivy IaC Scan"
4. SARIF results upload to the Security tab
5. Green checkmark appears on PR (or red X if fails)

**Expected completion time:** 5-10 minutes

## Verification Checklist

- [ ] Check "Checks" section below shows workflow running
- [ ] Verify security scan jobs appear
- [ ] Confirm npm audit job completes
- [ ] Confirm Trivy jobs complete and upload artifacts
- [ ] Check artifacts are uploaded (Newman reports)
- [ ] Verify green checkmark appears

## After Verification

This PR will be **closed and deleted** after successful verification. It serves only to test CI/CD automation.

---

**Interview Note:** This demonstrates understanding of GitHub Actions event-driven workflows and PR-based CI/CD validation strategies.
EOF
)" \
  --base portfolio \
  --head test/verify-pr-workflow \
  --web
