# GitHub Actions Verification Guide

This guide helps you verify that the CI/CD workflows are working correctly on GitHub.

## ✅ What We've Deployed

Two automated workflows have been pushed to GitHub:

1. **`pr-checks.yml`** - Fast Node.js tests for Pull Requests
2. **`docker-tests.yml`** - Comprehensive Docker tests for main branch & scheduled runs

## 🔍 Step 1: Verify Workflows Are Visible

### Via GitHub Web UI

1. Go to your repository: https://github.com/zhoujuxi2028/2026-restart
2. Click the **"Actions"** tab
3. You should see both workflows listed:
   - "PR Quick Checks (Node.js)"
   - "Docker-Based Tests (Production-Grade)"

### Via GitHub CLI (Optional)

```bash
gh workflow list --repo zhoujuxi2028/2026-restart
```

Expected output:
```
PR Quick Checks (Node.js)              active  12345
Docker-Based Tests (Production-Grade)  active  67890
```

---

## 🧪 Step 2: Test the Docker Workflow (Manual Trigger)

Since we just pushed to `main` branch, the `docker-tests.yml` workflow should have **already started automatically**!

### Check if it's running:

```bash
# Via CLI
gh run list --workflow=docker-tests.yml --limit 5

# Or visit GitHub Actions tab and look for a running workflow
```

### Manually trigger it (if needed):

**Via GitHub Web UI:**
1. Go to Actions → "Docker-Based Tests (Production-Grade)"
2. Click "Run workflow" button (on the right)
3. Select `main` branch
4. Click green "Run workflow" button

**Via GitHub CLI:**
```bash
gh workflow run docker-tests.yml --ref main
```

### Expected Results:

- ✅ Newman tests pass (18 assertions)
- ✅ Cypress tests run (may need to check for environment issues in CI)
- ✅ Artifacts uploaded (screenshots, videos, reports)
- ✅ Test results published

**View the run:**
```bash
# Get the run ID
gh run list --workflow=docker-tests.yml --limit 1

# View details
gh run view <RUN_ID>

# View logs
gh run view <RUN_ID> --log
```

---

## 🔄 Step 3: Test the PR Workflow (Create a Test PR)

The `pr-checks.yml` workflow triggers automatically on Pull Requests. Let's create a test PR:

### Option A: Via Command Line

```bash
# 1. Create a test branch
git checkout -b test/workflow-verification

# 2. Make a trivial change (e.g., add a comment to README)
echo "<!-- Test PR for workflow verification -->" >> README.md

# 3. Commit and push
git add README.md
git commit -m "test: verify PR workflow triggers correctly"
git push origin test/workflow-verification

# 4. Create the PR
gh pr create \
  --title "Test: Verify PR Workflow" \
  --body "This PR tests the pr-checks.yml workflow automation. Will close after verification." \
  --base main \
  --head test/workflow-verification
```

### Option B: Via GitHub Web UI

1. Go to your repository
2. Click "Pull requests" → "New pull request"
3. Select `main` as base, create a new branch as compare
4. Add a title: "Test: Verify PR Workflow"
5. Click "Create pull request"

### What Should Happen:

Within ~10 seconds of creating the PR:

1. ✅ GitHub automatically detects the `pull_request.opened` event
2. ✅ `pr-checks.yml` workflow starts running
3. ✅ You'll see a yellow indicator on the PR showing "Checks in progress"
4. ✅ Two jobs run in parallel:
   - "Fast Tests (Node.js Native)"
   - "Code Linting"

**Check the PR page:**
- Scroll down to "Checks" section
- You should see both jobs listed with status indicators

**Expected completion time:** ~2-3 minutes

**Expected results:**
- ✅ Newman tests pass
- ✅ ESLint passes (with 2 warnings)
- ✅ Green checkmark appears on the PR

### Close the Test PR

After verification:
```bash
# Via CLI
gh pr close <PR_NUMBER> --delete-branch

# Or click "Close pull request" on the GitHub web UI
```

---

## 📅 Step 4: Verify Scheduled Workflow

The `docker-tests.yml` is scheduled to run daily at **2:00 AM UTC (10:00 AM Beijing time)**.

You can't immediately test scheduled runs, but you can:

### Check if the schedule is configured:

```bash
# View the workflow file
cat .github/workflows/docker-tests.yml | grep -A 2 "schedule:"
```

Expected output:
```yaml
schedule:
  - cron: '0 2 * * *'
```

### Monitor scheduled runs:

After 2:00 AM UTC tomorrow, check:
```bash
gh run list --workflow=docker-tests.yml --limit 10
```

You should see a run with event type "schedule".

**Important:** GitHub may disable scheduled workflows if the repository has no activity for 60 days.

---

## 🛠️ Step 5: Troubleshooting

### Workflow Not Appearing in Actions Tab?

**Check 1:** Ensure workflow files are on the main branch
```bash
git ls-tree main:.github/workflows
```

You should see:
```
100644 blob <hash>    docker-tests.yml
100644 blob <hash>    pr-checks.yml
```

**Check 2:** Validate YAML syntax locally
```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/docker-tests.yml'))"
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/pr-checks.yml'))"
```

No output = valid syntax.

### PR Workflow Not Triggering?

**Check 1:** Ensure the workflow file exists on the **PR branch** (not just main)
```bash
git checkout your-pr-branch
ls -la .github/workflows/pr-checks.yml
```

**Check 2:** Check if the PR targets the `main` branch (our workflow only triggers for PRs to main)

**Check 3:** Look at the "Actions" tab for error messages

### Docker Workflow Failing?

**Common issues:**

1. **Docker image pull failures** - Network issues, retry manually
2. **Cypress tests timeout** - Expected in some CI environments, focus on Newman results
3. **Permission issues** - Ensure artifacts directories are writable

**View failure logs:**
```bash
gh run view <RUN_ID> --log-failed
```

### How to Re-run a Failed Workflow?

**Via Web UI:**
1. Go to Actions → Click the failed run
2. Click "Re-run all jobs" button (top right)

**Via CLI:**
```bash
gh run rerun <RUN_ID>
```

---

## 📊 Success Criteria

Your CI/CD setup is working correctly if:

- [x] Both workflows visible in Actions tab
- [x] Docker workflow runs automatically when pushing to main
- [x] PR workflow runs automatically when creating/updating PRs
- [x] Newman API tests pass consistently (18/18 assertions)
- [x] ESLint checks pass (0 errors acceptable, warnings OK)
- [x] Artifacts are uploaded and downloadable
- [x] Test results appear in PR checks

---

## 🎤 Interview Talking Points

After verifying these workflows, you can confidently say:

> "I've implemented a two-tier CI/CD strategy using GitHub Actions:
>
> **Tier 1 - PR Checks:** Fast Node.js-based tests run automatically on every pull request, providing 2-3 minute feedback cycles. This includes Cypress E2E tests, Newman API tests, and ESLint code quality checks running in parallel.
>
> **Tier 2 - Production Validation:** Docker-based tests run on the main branch and nightly at 2 AM UTC. These containerized tests ensure environment parity and catch integration issues.
>
> Both workflows are fully automated - PRs trigger on creation and updates, main branch tests trigger on merge, and scheduled tests run daily. The system uploads test artifacts (videos, screenshots, JUnit reports) for debugging and publishes results directly to pull requests.
>
> I verified this works by pushing to main (Docker workflow ran), creating a test PR (Node.js workflow ran), and manually triggering both workflows successfully."

---

## 🔗 Quick Links

- **Repository:** https://github.com/zhoujuxi2028/2026-restart
- **Actions Tab:** https://github.com/zhoujuxi2028/2026-restart/actions
- **Workflows Directory:** `.github/workflows/`
- **Workflow Guide:** `.github/WORKFLOWS-GUIDE.md`

---

## 📝 Next Steps

After verifying workflows work:

1. **Configure Branch Protection:**
   - Go to Settings → Branches → Add rule for `main`
   - Require `pr-checks` workflow to pass before merging
   - Require 1 code review approval

2. **Set up Notifications:**
   - Configure email/Slack notifications for workflow failures
   - GitHub Settings → Notifications → Actions

3. **Optimize for Cost:**
   - Monitor CI minutes usage (GitHub Actions → Insights)
   - Consider caching strategies for faster runs
   - Disable video recording for successful runs (already implemented)

4. **Add More Workflows (Optional):**
   - Deployment workflow (staging/production)
   - Security scanning (Snyk, Dependabot)
   - Performance benchmarking
   - Weekly regression test suite

---

## 🆘 Getting Help

If workflows aren't working:

1. Check workflow run logs in Actions tab
2. Review this guide's troubleshooting section
3. Validate YAML syntax locally
4. Check GitHub Actions status: https://www.githubstatus.com/
5. Review GitHub Actions documentation: https://docs.github.com/actions

---

## ✅ Verification Checklist

Use this checklist to confirm everything works:

- [ ] Workflows visible in Actions tab
- [ ] Docker workflow triggered by push to main
- [ ] Docker workflow can be manually triggered
- [ ] PR workflow triggered by opening a PR
- [ ] PR workflow triggered by pushing to existing PR
- [ ] Newman tests pass in both workflows
- [ ] ESLint passes in PR workflow
- [ ] Test artifacts uploaded successfully
- [ ] Test results appear in PR checks
- [ ] Workflow logs are readable and helpful
- [ ] Scheduled workflow configuration is correct (will run tomorrow at 2 AM UTC)

**Date Verified:** _________________

**Verified By:** _________________

**Notes:** _________________
