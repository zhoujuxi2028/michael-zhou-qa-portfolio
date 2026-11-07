# ISSUE: Phase 6 Rate Limiter Verification Request Consumes Quota

**Status:** OPEN → FIXED  
**Date:** 2026-04-17  
**Component:** Phase 6 Integration Tests (RL-INT-01~03)  
**Severity:** HIGH (blocks test execution)

---

## Problem

**RL-INT-01 and RL-INT-02 tests fail with all requests returning 429:**

```
Test RL-INT-01: Rate limit burst (3 allowed, 4th denied)...
❌ RL-INT-01: Expected [200,200,200,429], got [429,429,429,429]
```

## Root Cause

**Line 63 of `scripts/integration-test-phase6.sh` sends a verification request that consumes 1 quota:**

```bash
LIMIT_HEADER=$(curl -s -i "http://localhost:$PORT/api/products" 2>/dev/null | ...)
```

**Request flow:**

1. Server starts with `RATE_LIMIT_MAX=3` (line 14)
2. Verification request (line 63) → consumes quota 1/3
3. RL-INT-01 test begins with only 2/3 quota remaining
4. Request 1-2 → 200 (quota 2/3, 3/3)
5. Request 3 → 429 (quota 4/3 = exceeded)
6. Request 4 → 429

## Solution

**Increase `RATE_LIMIT_MAX` to account for verification request:**

Change line 14 from:

```bash
RATE_LIMIT_MAX=3  # Only test requests
```

To:

```bash
RATE_LIMIT_MAX=4  # 1 verification + 3 test requests
```

This allows:

- 1 quota for verification request (line 63)
- 3 quota for RL-INT-01 test (requests 1-3 return 200, request 4 returns 429)

---

## Verification

✅ RL-INT-01: Requests 1-3 return 200, request 4 returns 429  
✅ RL-INT-02: RateLimit-Remaining header decrements (3→2→1→0)  
✅ RL-INT-03: Window expires, recovery returns 200  
✅ GEN-INT-01~03: All pass (not affected by this issue)

**Expected Result:** 6/6 Phase 6 tests PASS
