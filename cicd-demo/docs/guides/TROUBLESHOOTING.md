# Troubleshooting: npm Installation Issues

## Issue: MODULE_NOT_FOUND 'string-width' (Resolved 2026-02-18)

### Symptoms
- `npm install` fails with MODULE_NOT_FOUND for string-width
- Cypress postinstall script cannot complete
- string-width directory exists but is empty
- Hundreds of packages marked as "extraneous"

### Root Causes
1. **Missing package-lock.json** (was excluded via .gitignore)
2. **Non-deterministic dependency resolution** across npm versions
3. **Failed npm deduplication** left empty string-width placeholder
4. **cypress.config.js referenced non-existent cypress-multi-reporters**
5. **Dependency version conflicts** (string-width@^4.1.0 vs ^4.2.0)
6. **Bleeding-edge Node.js v25.2.1** may have triggered npm edge cases

### Resolution
1. Removed corrupted node_modules and cleared npm cache
2. Switched to Node.js LTS 20.20.0 for stability (recommended for CI/CD)
3. Fixed cypress.config.js to use built-in 'spec' reporter
4. Updated .gitignore to track package-lock.json
5. Reinstalled dependencies with clean state
6. Generated and committed package-lock.json for reproducible builds

### Prevention
- ✅ package-lock.json now tracked in git
- ✅ Using stable Node.js LTS version (v20.20.0)
- ✅ Simplified Cypress reporter configuration
- ✅ Documented for future reference

---

## Interview Discussion Points

### "Tell me about a challenging technical issue you resolved"

**Situation**: While preparing a CI/CD demo project for the BASF interview, npm install consistently failed with MODULE_NOT_FOUND for string-width during Cypress installation.

**Task**: Diagnose and fix the issue while ensuring the solution would be stable across different environments - critical for CI/CD pipelines.

**Action**: Used systematic debugging approach:
- Examined dependency tree and discovered 325/326 packages marked as "extraneous"
- Found string-width directory was completely empty (failed npm deduplication)
- Key insight: package-lock.json was excluded via .gitignore, causing non-deterministic installations
- Identified Node.js v25.x as potential contributing factor
- Applied comprehensive fix: cleanup, LTS downgrade, config fix, lock file generation

**Result**:
- Installation now works reliably
- Deterministic builds across environments
- Gained deep understanding of npm deduplication algorithms
- Created documentation for future troubleshooting
- **Turned a blocker into a learning opportunity demonstrating DevOps problem-solving**

---

## Key Technical Points for Interview

### Why lock files are critical for CI/CD

**The Problem:**
Without package-lock.json, each `npm install` can produce different dependency trees:
- Different minor/patch versions installed
- Different deduplication decisions by npm
- "Works on my machine" issues between developers and CI/CD
- Security audit discrepancies

**The Solution:**
- `package-lock.json` records exact dependency tree
- Use `npm ci` (not `npm install`) in CI/CD pipelines
- `npm ci` deletes node_modules and installs from lock file exactly
- Enforces reproducible builds

**Real-World Impact:**
```
Developer machine: string-width@4.2.3 ✓
CI/CD pipeline:    string-width@4.1.0 ✗ (causes subtle bugs)
Production:        string-width@4.2.2 ✗ (different behavior)
```

With lock file: All environments use exact same versions.

---

### Dependency Management: Understanding Transitive Dependencies

**What happened with string-width:**
```
newman-reporter-htmlextra
  └─ cli-progress
      └─ string-width@^4.2.0

log-update (in Cypress)
  └─ wrap-ansi
      └─ string-width@^4.1.0
```

Both packages need string-width but specify different semver ranges. npm's deduplication algorithm tries to install one version that satisfies both, but when it fails mid-process, you get an empty placeholder.

**Key Concepts:**
- **Hoisting**: npm tries to flatten dependency trees
- **Deduplication**: Sharing one version of a package across multiple dependents
- **Peer dependencies**: Packages that require compatible versions
- **Resolution**: How npm picks which version to install

---

### Debugging Methodology: Systematic Root Cause Analysis

**My Approach:**
1. **Observe**: npm install fails, MODULE_NOT_FOUND for string-width
2. **Investigate**: Check string-width directory → completely empty
3. **Analyze**: Run `npm ls` → 325/326 packages extraneous
4. **Hypothesis**: Missing package-lock.json causing non-deterministic resolution
5. **Test**: Clean install with lock file → Success!
6. **Document**: Create troubleshooting guide for future reference

**Not just quick fixes:**
- Could have manually installed string-width (wrong approach)
- Could have used `--legacy-peer-deps` (masks the problem)
- Instead: Fixed root cause for long-term stability

---

### Risk Assessment: Stability vs Latest Versions

**The Decision:**
Keep existing package versions vs upgrade all to latest.

**Analysis:**
| Factor | Keep Current | Update All |
|--------|--------------|------------|
| Time investment | 20 minutes | 2+ hours |
| Stability risk | Low | High |
| Breaking changes | None | Many |
| Interview focus | CI/CD concepts | Package management |
| Production alignment | LTS versions | Bleeding edge |

**Conclusion:** For a demo/practice project, stability aligns better with interview goals. The deprecated packages (glob, rimraf, eslint@8) are devDependencies with acceptable risk.

**In production:** Different calculus - security patches take priority.

---

### Team Collaboration: How Missing Lock Files Affect Teams

**Scenario without lock file:**
```
Developer A (Mac):     npm install → works ✓
Developer B (Linux):   npm install → MODULE_NOT_FOUND ✗
CI/CD (Docker):        npm install → different versions ⚠️
QA Environment:        npm install → flaky tests ⚠️
```

**Prevention strategies:**
1. **Repository**: Require package-lock.json in version control
2. **Pre-commit hooks**: Use Husky to reject commits without lock file sync
3. **CI enforcement**: Pipeline fails if `package-lock.json` doesn't match `package.json`
4. **Documentation**: Team guidelines on Node.js version standards (.nvmrc file)
5. **Code review**: Lock file changes must be explicitly reviewed
6. **Automated updates**: Dependabot/Renovate for dependency updates with testing

---

## Additional Context

### Deprecated Packages (Acceptable Risk for Demo)
- `glob@7.2.3` - security vulnerabilities (transitive dependency)
- `rimraf@3.0.2` - no longer supported (transitive dependency)
- `inflight@1.0.6` - memory leak (transitive dependency)
- `eslint@8.57.1` - no longer supported (direct devDependency)

**Decision:** These are devDependencies in a practice project, not production code. Discuss this tradeoff during interview as example of risk assessment.

### npm Audit Results
```
16 vulnerabilities (11 moderate, 5 high)
```

**Interview talking point:** In production, I would:
1. Run `npm audit fix` for non-breaking fixes
2. Evaluate `npm audit fix --force` for breaking changes
3. Review each vulnerability for actual impact
4. Create tickets for manual updates if needed
5. Document accepted risks for known issues

---

## Commands Reference

### Verify Installation
```bash
# Check Cypress installation
npm run ci:verify

# Check string-width
npm ls string-width

# Check for extraneous packages
npm ls --depth=0

# Test Cypress
npm run test:cypress

# Test Newman
npm run test:newman
```

### Troubleshooting
```bash
# Clean slate
rm -rf node_modules package-lock.json
npm cache clean --force

# Reinstall
npm install

# Use exact versions from lock file (CI/CD)
npm ci
```

### Node.js Version Management
```bash
# Check available versions
nvm list

# Install LTS
nvm install 20

# Switch to LTS
nvm use 20

# Set as default
nvm alias default 20
```

---

## Related Issues

### Cypress Test Code Issues (Separate from npm install)
The Cypress tests fail with "Cannot call `cy.log()` outside a running test" because test files have Cypress commands outside `it()` blocks. This is a code quality issue unrelated to the dependency installation.

### Missing ESLint Configuration
ESLint cannot find configuration file. Create `.eslintrc.js` or use `npm init @eslint/config` to set up ESLint properly.

---

## Success Metrics

After applying the fix:
- ✅ npm install completes without errors (374 packages added)
- ✅ string-width directory contains files (package.json, index.js, etc.)
- ✅ package-lock.json generated (162KB)
- ✅ All packages properly recognized (no "extraneous" warnings)
- ✅ Cypress installs and verifies successfully
- ✅ Newman runs all tests successfully (18 assertions passed)
- ✅ No MODULE_NOT_FOUND errors

---

## Further Reading

**Official Documentation:**
- [npm ci documentation](https://docs.npmjs.com/cli/v10/commands/npm-ci)
- [package-lock.json specification](https://docs.npmjs.com/cli/v10/configuring-npm/package-lock-json)
- [Cypress installation guide](https://docs.cypress.io/guides/getting-started/installing-cypress)

**Best Practices:**
- [npm lock file best practices](https://docs.npmjs.com/cli/v10/configuring-npm/package-lock-json#lock-file-best-practices)
- [Dependency management in CI/CD](https://docs.github.com/en/actions/automating-builds-and-tests/building-and-testing-nodejs)
- [Node.js LTS schedule](https://github.com/nodejs/release#release-schedule)
