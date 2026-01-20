# Quick Start Guide - IWSVA Kernel Version Verification

## 🎯 What This Does

Automatically verifies that the IWSVA system has kernel version `5.14.0-427.24.1.el9_4.x86_64`.

## 🔧 Setup (First Time Only)

```bash
# 1. Copy configuration template
cp cypress.env.json.example cypress.env.json

# 2. Edit cypress.env.json with your credentials
nano cypress.env.json  # or use your favorite editor

# 3. Install dependencies
npm install
```

**cypress.env.json** should contain:
```json
{
  "baseUrl": "https://your-iwsva-server:8443",
  "username": "your-username",
  "password": "your-password",
  "targetKernelVersion": "5.14.0-427.24.1.el9_4.x86_64"
}
```

## ⚡ Run the Test

```bash
npm test
```

That's it! The test will:
1. Login to IWSVA
2. Navigate to Administration → System Updates
3. Verify kernel version is `5.14.0-427.24.1.el9_4.x86_64`

## 🔑 CSRF Token Question?

**Q: Where is the CSRF token handling?**

**A: It's automatic! You don't see it because:**

1. Login page doesn't need a token
2. After login, token appears in URL: `?CSRFGuardToken=XXXXX`
3. All menu links already have the token embedded
4. Clicking links = token included automatically

**No explicit token extraction needed!**

See `CSRF_TOKEN_EXPLAINED.md` for full details.

## 📖 Documentation

- `README.md` - Full documentation with CSRF section
- `CSRF_TOKEN_EXPLAINED.md` - Detailed CSRF explanation
- `SELF_CHECK_REPORT.md` - Test verification report
- `verify_kernel_version.cy.js` - Main test file (101 lines, clean)

## ✅ Expected Result

```
IWSVA Kernel Version Verification
  ✓ should find target kernel version (17.1s)
  ✓ should have correct page structure with 3 frames (9.2s)

2 passing (26s)
```

Screenshot saved to: `cypress/screenshots/verify_kernel_version.cy.js/kernel-version-verified.png`

---

**Last Updated**: 2026-01-20
