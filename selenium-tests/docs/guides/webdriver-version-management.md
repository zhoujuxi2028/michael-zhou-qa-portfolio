# WebDriver Version Management Guide

## Overview

The Selenium test framework supports **3 modes** of WebDriver version management:

1. **Explicit Path Mode** (CI/CD) - Fastest, no downloads
2. **Version Lock Mode** (Development) - Reproducible environments
3. **Auto-detect Mode** (Fallback) - Intelligent default with caching

## Quick Start

### Mode 1: Explicit Path (CI/CD)

Use pre-installed drivers for fastest execution:

```bash
# .env
CHROMEDRIVER_PATH=/usr/local/bin/chromedriver
```

**When to use**: CI/CD pipelines, Docker containers, production

**Benefits**: No downloads, fastest execution, offline-capable

### Mode 2: Version Lock (Development)

Pin specific versions for reproducible testing:

```bash
# .env
CHROMEDRIVER_VERSION=145.0.7054.8
```

**When to use**: Development, debugging, version-specific testing

**Benefits**: Reproducible, controlled upgrades, cached after first download

### Mode 3: Auto-detect (Fallback)

Let the framework detect your Chrome version:

```bash
# .env
# Leave CHROMEDRIVER_PATH and CHROMEDRIVER_VERSION commented
CHROMEDRIVER_CACHE_VALID_DAYS=7
```

**When to use**: Quick local testing, when version doesn't matter

**Benefits**: No configuration, automatic compatibility, 7-day cache

## Finding ChromeDriver Versions

### Step 1: Check Chrome Version

```bash
# Linux
google-chrome --version

# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --version

# Windows
"C:\Program Files\Google\Chrome\Application\chrome.exe" --version
```

Example output: `Google Chrome 145.0.6533.89`

### Step 2: Find Matching ChromeDriver

Visit: https://googlechromelabs.github.io/chrome-for-testing/

Look for **"Stable"** channel matching your major version.

Example: Chrome 145.x → ChromeDriver 145.0.7054.8

## CI/CD Setup

### Docker Example

```dockerfile
FROM python:3.12-slim

# Install Chrome and ChromeDriver (specific versions)
RUN wget -q https://dl.google.com/linux/chrome/deb/pool/main/g/google-chrome-stable/google-chrome-stable_145.0.6533.89-1_amd64.deb \
    && apt-get install -y ./google-chrome-stable_145.0.6533.89-1_amd64.deb \
    && wget -q https://storage.googleapis.com/chrome-for-testing-public/145.0.7054.8/linux64/chromedriver-linux64.zip \
    && unzip chromedriver-linux64.zip \
    && mv chromedriver-linux64/chromedriver /usr/local/bin/ \
    && chmod +x /usr/local/bin/chromedriver

# Set explicit path
ENV CHROMEDRIVER_PATH=/usr/local/bin/chromedriver
```

### GitHub Actions Example

```yaml
- name: Setup ChromeDriver
  uses: nanasess/setup-chromedriver@v2
  with:
    chromedriver-version: '145.0.7054.8'

- name: Run tests
  env:
    CHROMEDRIVER_PATH: /usr/local/bin/chromedriver
  run: pytest tests/
```

## Troubleshooting

### Issue: "ChromeDriver version mismatch"

**Symptom**: `session not created: This version of ChromeDriver only supports Chrome version 145`

**Solution**: Update CHROMEDRIVER_VERSION to match your Chrome:

```bash
# Check Chrome version
google-chrome --version

# Update .env
CHROMEDRIVER_VERSION=145.0.7054.8  # Match your Chrome major version
```

### Issue: Repeated downloads in logs

**Symptom**: `Get LATEST chromedriver version for google-chrome` appears every test run

**Solution**: Use Mode 1 (explicit path) or Mode 2 (version lock):

```bash
# Option A: Explicit path
CHROMEDRIVER_PATH=/usr/local/bin/chromedriver

# Option B: Version lock
CHROMEDRIVER_VERSION=145.0.7054.8
```

### Issue: Tests fail after Chrome auto-update

**Symptom**: Tests passed yesterday, fail today after Chrome update

**Solution**: Use Version Lock Mode to control upgrades:

```bash
CHROMEDRIVER_VERSION=145.0.7054.8
```

Upgrade ChromeDriver version intentionally when ready.

## Best Practices

### Development Environment
- Use **Version Lock Mode** for consistency across team
- Document required version in README
- Update versions together (Chrome + ChromeDriver)

### CI/CD Environment
- Use **Explicit Path Mode** for speed
- Pin versions in Dockerfile
- Test version upgrades in separate branch

### Version Upgrade Strategy
1. Check new Chrome version in local environment
2. Find matching ChromeDriver version
3. Update .env with new CHROMEDRIVER_VERSION
4. Run full test suite
5. If passing, update team documentation
6. Update CI/CD Docker images

## FAQ

**Q: Which mode should I use?**
- CI/CD: Explicit Path (fastest)
- Development: Version Lock (reproducible)
- Quick testing: Auto-detect (easiest)

**Q: How often should I update ChromeDriver?**
- Update when Chrome auto-updates (every 4-6 weeks)
- Test in development environment first
- Update team .env.example with new version

**Q: Can I use different Chrome versions on different machines?**
- Not recommended for team consistency
- Use same CHROMEDRIVER_VERSION across team
- Document required Chrome version in README

**Q: Does cache work offline?**
- Yes, cached drivers work offline
- Default cache: 7 days
- Adjust with CHROMEDRIVER_CACHE_VALID_DAYS

## Technical Details

### How Version Management Works

The framework uses a priority-based resolution system:

```python
# Priority 1: Explicit Path
if CHROMEDRIVER_PATH is set:
    use that path directly (no download)

# Priority 2: Version Lock
elif CHROMEDRIVER_VERSION is set:
    download specific version (cached)

# Priority 3: Auto-detect
else:
    detect Chrome version and download matching driver (cached)
```

### Cache Location

WebDriver Manager stores cached drivers in:
- Linux/macOS: `~/.wdm/drivers/chromedriver/`
- Windows: `%USERPROFILE%\.wdm\drivers\chromedriver\`

### Cache Duration

Default cache duration: **7 days**

This means:
- First test run: Downloads driver
- Subsequent runs (within 7 days): Uses cached driver
- After 7 days: Checks for updates

Adjust with: `CHROMEDRIVER_CACHE_VALID_DAYS=<days>`

## Integration with TestConfig

All WebDriver version settings are centralized in `src/core/config/test_config.py`:

```python
# ChromeDriver configuration
CHROMEDRIVER_PATH = os.getenv('CHROMEDRIVER_PATH', None)
CHROMEDRIVER_VERSION = os.getenv('CHROMEDRIVER_VERSION', None)
CHROMEDRIVER_CACHE_VALID_DAYS = int(os.getenv('CHROMEDRIVER_CACHE_VALID_DAYS', '7'))

# GeckoDriver (Firefox) configuration
GECKODRIVER_PATH = os.getenv('GECKODRIVER_PATH', None)
GECKODRIVER_VERSION = os.getenv('GECKODRIVER_VERSION', None)
GECKODRIVER_CACHE_VALID_DAYS = int(os.getenv('GECKODRIVER_CACHE_VALID_DAYS', '7'))
```

## Related Documentation

- [Installation Guide](../getting-started/installation.md) - Setup instructions
- [Design Specification](../architecture/DESIGN_SPECIFICATION.md) - Architecture overview
- [Enterprise Standards Assessment](../architecture/ENTERPRISE_STANDARDS_ASSESSMENT.md) - Quality standards

---

**Document Version**: 1.0
**Last Updated**: 2026-02-18
**Author**: QA Automation Team
