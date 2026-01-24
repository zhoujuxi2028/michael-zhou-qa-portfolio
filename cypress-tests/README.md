# Cypress Tests - IWSVA Kernel Version Verification

**Enterprise-grade E2E testing** for Trend Micro IWSVA system kernel version verification.

**Architecture**: Page Object Model + Framework Integration
**Target**: Verify kernel version `5.14.0-427.24.1.el9_4.x86_64`
**Status**: ✅ Refactored to Enterprise Framework Standards

---

## 📋 What's New

**Latest Update (2026-01-24)**: Complete enterprise framework refactoring

- ✅ **New Page Object**: `SystemUpdatePage.js` - Reusable page object for System Updates
- ✅ **Enhanced Test Suite**: Expanded from 2 to 5 comprehensive test cases (+150%)
- ✅ **Framework Integration**: Full integration with Page Object Model and Workflows
- ✅ **Comprehensive Documentation**: API docs, usage guides, refactoring summary

**See**: `REFACTORING_SUMMARY.md` for complete details

---

## 🚀 Quick Start

### 1. Setup Configuration

```bash
# Copy example configuration file
cp cypress.env.json.example cypress.env.json

# Edit cypress.env.json with your credentials
# {
#   "baseUrl": "https://your-iwsva-server:8443",
#   "username": "your-username",
#   "password": "your-password",
#   "targetKernelVersion": "5.14.0-427.24.1.el9_4.x86_64"
# }
```

**Important**: The `cypress.env.json` file is gitignored and will not be committed to version control.

### 2. Install and Run

```bash
# Install dependencies
npm install

# Run main test (recommended)
npm test

# Open interactive mode
npm run cypress:open

# Run with Firefox
npm run test:firefox
```

---

## 🏗️ Architecture

This test suite demonstrates **enterprise-grade test automation** architecture:

### Framework Structure

```
Test Layer (verify_kernel_version.cy.js)
    ↓ imports
Workflow Layer (SetupWorkflow)
    ↓ orchestrates
Page Object Layer (SystemUpdatePage, BasePage)
    ↓ uses
Data Layer (TestConfig, TestConstants)
```

### Key Components

- **SystemUpdatePage.js** - Page Object for System Updates page
  - Frame handling (tophead, left, right)
  - Navigation via menu
  - Kernel version extraction and verification
  - Frameset structure validation

- **SetupWorkflow.js** - Test environment setup
  - Standardized login process
  - Test preparation
  - Environment verification

- **TestConfig.js** - Centralized configuration
  - Timeouts and URLs
  - No hardcoded values

- **TestConstants.js** - Selector definitions
  - Frame selectors
  - Menu navigation selectors
  - Consistent selector management

### Test Cases (5)

1. **TC-SYS-001**: Kernel Version Display (3-step test)
2. **TC-SYS-002**: Frameset Structure Validation (3-step test)
3. **TC-SYS-003**: Complete System Updates Workflow
4. **TC-SYS-004**: Kernel Version Extraction
5. **TC-SYS-005**: Page Title Verification

**See**: `SYSTEM_UPDATE_PAGE_GUIDE.md` for complete API documentation

---

## 🔑 CSRF Token Handling - IMPORTANT!

### How CSRF Tokens Work in This Application

**Key Discovery**: The test script does **NOT** explicitly handle CSRF tokens, and it doesn't need to!

#### Why It Works

1. **Login Page**: NO CSRF token required
   ```javascript
   cy.visit('https://10.206.201.9:8443/')
   cy.get('input[type="text"]').type('admin')
   cy.get('input[type="password"]').type('111111')
   cy.get('input[type="submit"]').click()
   ```

2. **After Login**: Token automatically appears in URL
   ```
   https://10.206.201.9:8443/index.jsp?CSRFGuardToken=KIRQWIYXLZGDFD8V...
                                        ↑
                                Token is here automatically!
   ```

3. **Navigation**: All links in frames already contain the token
   ```html
   <!-- Server embeds token in all links -->
   <a href="admin_patch_mgmt.jsp?CSRFGuardToken=XXXXX">System Updates</a>
   <a href="go.jsp?CSRFGuardToken=XXXXX&url=hardwarestatus">System Status</a>
   ```

4. **Frame Navigation**: When clicking links, browser automatically includes token
   ```javascript
   // No explicit token handling needed!
   leftFrame.querySelector('a').click()  // ✓ Token included automatically
   ```

#### When You WOULD Need Explicit Token Handling

**Only if you're:**
- ❌ Making direct URL navigation (bypassing menu clicks)
- ❌ Using `cy.request()` for API calls
- ❌ Submitting forms programmatically

**Example of explicit handling:**
```javascript
// Extract token from URL
cy.url().then((url) => {
  const token = new URL(url).searchParams.get('CSRFGuardToken')

  // Use for direct navigation
  cy.visit(`/admin_page.jsp?CSRFGuardToken=${token}`)
})
```

#### Our Approach: Frame-Based Navigation

```javascript
// No explicit token handling - browser handles it!
login()                      // ✓ No token needed
navigateToSystemUpdates()    // ✓ Token in links automatically
verifyKernelVersion()        // ✓ Token maintained in session
```

**See `CSRF_TOKEN_EXPLAINED.md` for detailed explanation.**

---

## 📋 Main Test File

### `verify_kernel_version.cy.js` ⭐

Complete automated verification test with 2 test cases:

1. ✅ Find target kernel version
2. ✅ Verify page structure (3 frames)

**Test Path**: Administration → System Updates → Current IWSVA Information

### Helper Functions

```javascript
// Simplified code with reusable helpers
login()                      // Handles authentication
getFrameDoc('left')          // Access frame content
navigateToSystemUpdates()    // Navigate to target page
```

---

## 🏗️ Page Structure

IWSVA uses **frameset** architecture:

```
┌─────────────────────────────────────┐
│  tophead (navigation bar)           │
├──────────┬──────────────────────────┤
│  left    │  right                   │
│  (menu)  │  (content)               │
│          │                          │
│ - Admin  │  System Updates page     │
│   - Sys  │  shows kernel version    │
│   Update │                          │
└──────────┴──────────────────────────┘
```

**Accessing frames:**
```javascript
const leftFrame = doc.querySelector('frame[name="left"]')
const leftDoc = leftFrame.contentDocument
// Now access elements in leftDoc
```

---

## 🎨 Custom Commands

Available in `cypress/support/commands.js`:

```javascript
// CSRF-aware login command
cy.loginWithCSRF(baseUrl, 'admin', '111111')

// Get CSRF token from URL
cy.getCSRFToken().then(token => {
  // Use token if needed
})
```

**Note**: Current test doesn't use these commands - frame navigation handles tokens automatically.

---

## 📁 Project Structure

```
cypress-tests/
├── cypress/
│   ├── e2e/
│   │   ├── verify_kernel_version.cy.js  ⭐ Main test
│   │   ├── csrf_token_demo.cy.js         Demo script
│   │   └── example.cy.js                 Reference
│   ├── fixtures/                         Test data
│   ├── screenshots/                      Test screenshots
│   ├── support/
│   │   ├── commands.js                   Custom commands
│   │   └── e2e.js                        Configuration
│   └── videos/                           Test recordings
├── archive/old_tests/                    Archived tests (15 files)
├── docs/                                 Documentation
├── cypress.config.js                     Cypress config
├── CSRF_TOKEN_EXPLAINED.md              ⭐ CSRF details
├── SELF_CHECK_REPORT.md                  Test report
└── README.md                             This file
```

---

## 📝 NPM Scripts

```bash
npm run cypress:open      # Open test interface
npm run cypress:run       # Run headless
npm test                  # Run main test
npm run test:firefox      # Run with Firefox
npm run test:headed       # Run with visible browser
npm run test:all          # Run all tests
```

---

## 🧪 Test Results

```
IWSVA Kernel Version Verification
  ✓ should find target kernel version (17.1s)
  ✓ should have correct page structure with 3 frames (9.2s)

2 passing (26s)
```

**System Information Verified:**
- Host Name: `iwsva-65-sp4-10-206-201-9`
- **OS Version**: `5.14.0-427.24.1.el9_4.x86_64` ✅
- Application Version: `6.5-SP4_Build_Linux_5124`
- Last Updated: `09/23/2024 16:01:30`

---

## ⚙️ Configuration

### Environment Variables (cypress.env.json)

Credentials and configuration are stored in `cypress.env.json` (gitignored for security):

```json
{
  "baseUrl": "https://10.206.201.9:8443",
  "username": "admin",
  "password": "111111",
  "targetKernelVersion": "5.14.0-427.24.1.el9_4.x86_64"
}
```

**Setup Steps**:
1. Copy `cypress.env.json.example` to `cypress.env.json`
2. Update with your IWSVA server credentials
3. File is automatically excluded from git commits

### Other Settings

- **SSL**: Self-signed certificate support enabled
- **Browser**: Firefox (recommended) or Electron
- **Viewport**: 1280x720
- **Chrome Web Security**: Disabled for CORS

---

## 📖 Documentation

**Complete Documentation Index**: [docs/README.md](docs/README.md)

### Quick Links

#### 🚀 Quick Start Guides
- [Downgrade Quickstart](docs/quickstart/DOWNGRADE_QUICKSTART.md) - Downgrade components for testing
- [Consolidated Tests Quickstart](docs/quickstart/CONSOLIDATED_TESTS_QUICKSTART.md) - Run consolidated test suites
- [Migration Guide](docs/quickstart/MIGRATION_GUIDE.md) - Migrate to new test structure

#### 📖 Developer Guides
- [IWSVA Test Guide](docs/guides/IWSVA_TEST_GUIDE.md) - ⭐ Comprehensive Cypress testing guide
- [Test Generator Guide](docs/guides/TEST_GENERATOR_GUIDE.md) - Data-driven test generation
- [System Update Page Guide](docs/guides/SYSTEM_UPDATE_PAGE_GUIDE.md) - SystemUpdatePage API reference
- [CSRF Token Explained](docs/guides/CSRF_TOKEN_EXPLAINED.md) - ⭐ CSRF token handling details
- [Update Module README](docs/guides/UPDATE_MODULE_README.md) - Update module testing overview
- [Test Cases README](docs/guides/TEST_CASES_README.md) - Quick test case reference

#### 📊 Reports & Test Plans
- [Test Execution Report](docs/reports/TEST_EXECUTION_REPORT.md) - Latest test results
- [Test Cases](docs/test-cases/UPDATE_TEST_CASES.md) - All 77 test cases documented
- [Test Plan](docs/test-plans/IWSVA-Update-Test-Plan.md) - Complete test plan
- [Work Breakdown Structure](docs/project-planning/WBS.md) - 11-phase project plan

**Browse all documentation**: [docs/](docs/)

---

## 🔐 Security Features

### Credential Management

- **No hardcoded credentials**: All sensitive data in `cypress.env.json`
- **Gitignored by default**: Credentials never committed to repository
- **Template provided**: `cypress.env.json.example` for team setup
- **Validation**: Test fails gracefully if credentials are missing
- **Environment-based**: Easy to use different credentials per environment

```javascript
// Test code loads credentials securely:
const credentials = {
  username: Cypress.env('username'),
  password: Cypress.env('password')
}

// Validation ensures they exist:
if (!credentials.username || !credentials.password) {
  throw new Error('Credentials not found! Please create cypress.env.json')
}
```

---

## 🔧 Common Issues

### Missing credentials
- ✅ Error: "Credentials not found!"
- ✅ Solution: Copy `cypress.env.json.example` to `cypress.env.json` and configure

### Login fails
- ✅ Visit `/` not `/index.jsp`
- ✅ Use correct credentials in `cypress.env.json`

### CSRF Token issues
- ✅ **Don't worry!** Frame navigation handles it automatically
- ✅ Only extract token if doing direct URL navigation
- ✅ Check URL contains `?CSRFGuardToken=` after login

### SSL certificate errors
- ✅ Already configured in `cypress.config.js`
- ✅ Firefox handles it automatically

### Frame access issues
- ✅ Use `contentDocument` to access frame content
- ✅ Ensure frame exists before accessing
- ✅ Check frame name is correct (tophead, left, right)

---

## 📦 Dependencies

- **Cypress**: ^15.9.0
- **Node.js**: >= 14.x (recommended v25.2.1)

---

## 🗂️ Archive

Development test files moved to `archive/old_tests/`:
- Page analysis tests
- Frame structure exploration
- Various login and navigation attempts

---

## 🎯 Key Takeaways

1. ✅ **CSRF tokens are handled automatically** via frame navigation
2. ✅ No explicit token extraction needed for our use case
3. ✅ Code is simplified (108 lines vs 215 lines original)
4. ✅ All tests passing consistently
5. ✅ Target kernel version successfully verified
6. ✅ **Secure credential management** via cypress.env.json (gitignored)
7. ✅ No hardcoded passwords in test files

---

**Last Updated**: 2026-01-20
**Cypress Version**: 15.9.0
**Test Status**: ✅ All Passing (2/2)
**CSRF Handling**: ✅ Automatic (URL-based, frame navigation)
