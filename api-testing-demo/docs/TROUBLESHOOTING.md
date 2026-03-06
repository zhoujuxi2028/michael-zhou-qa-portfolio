# Troubleshooting Guide

**Date**: 2026-02-28  
**Issue**: SSH Host Key Verification Failed  
**Status**: 🔴 Unresolved

---

## Problem Description

When attempting to push to the remote repository, the following error occurs:

```
Host key verification failed.
fatal: Could not read from remote repository.
```

## Root Cause

This issue occurs because:

1. The repository was previously operated on by the `root` user
2. SSH host key verification fails when switching between different users (root vs michael)
3. The SSH known_hosts file contains different credentials

## Affected Operations

- ❌ `git push` - Push commits to remote
- ❌ `git pull` - Pull from remote
- ✅ `git commit` - Local commits work fine

## Solutions

### Solution 1: Use HTTPS instead of SSH (Recommended)

Change the remote URL from SSH to HTTPS:

```bash
# Check current remote
git remote -v

# Change to HTTPS
git remote set-url origin https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio.git
```

### Solution 2: Regenerate SSH Keys

```bash
# Generate new SSH key
ssh-keygen -t rsa -C "your-email@example.com"

# Add to ssh-agent
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_rsa

# Copy public key to GitHub
cat ~/.ssh/id_rsa.pub
```

### Solution 3: Clear SSH Known Hosts

```bash
# Remove known hosts for the domain
ssh-keygen -R github.com

# Or manually edit
nano ~/.ssh/known_hosts
```

---

## Current Status

| Item | Status |
|------|--------|
| Local Commits | ✅ 2 commits ready |
| Remote Push | ❌ Failed |
| Workaround | Use HTTPS |

---

## Workaround Applied

For now, commits are made locally. When switching to HTTPS or fixing SSH, run:

```bash
git push -u origin postman-demo
```

---

**Document Type**: Troubleshooting  
**Category**: Git/SSH Configuration  
**Priority**: Medium
