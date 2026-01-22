# Test Data Dictionary

**Project**: GUI-mz/cypress-tests
**Module**: IWSVA Update
**Last Updated**: 2025-01-22

This document defines all test data used in IWSVA Update module testing.

---

## Component Identifiers

| Component ID | Display Name | Category | INI Section | INI Version Key | Lock File |
|--------------|--------------|----------|-------------|-----------------|-----------|
| PTN | Virus Pattern | Pattern | Pattern-Update | Version | .patupdate |
| SPYWARE | Spyware Pattern | Pattern | Pattern-Update | spywarever | .spywareupdate |
| BOT | Bot Pattern | Pattern | Pattern-Update | botver | .botupdate |
| ITP | IntelliTrap Pattern | Pattern | Pattern-Update | intellitrapver | .itrappupdate |
| ITE | IntelliTrap Exception | Pattern | Pattern-Update | intellitrapexpver | .itrapeupdate |
| SPAM | Spam Pattern | Pattern | Pattern-Update | spam | .spamupdate |
| ICRCAGENT | Smart Scan Agent | Pattern | Pattern-Update | icrcagent_ver | .icrcagentupdate |
| TMSA | Smart Analysis | Pattern | Pattern-Update | tmsa_ver | .tmsaupdate |
| DPIPTN | DPI Pattern | Pattern | Pattern-Update | dpi_ptn_ver | .dpiptnupdate |
| ENG | Virus Scan Engine | Engine | Pattern-Update | EngineVersion | .engupdate |
| ATSEENG | ATSE Scan Engine | Engine | Pattern-Update | ATSEEngineVersion | .atseupdate |
| TMUFEENG | URL Filtering Engine | Engine | Pattern-Update | url_eng_ver | .tmufeengineupdate |
| SPAMENG | Spam Engine | Engine | Pattern-Update | spam_eng_ver | .spamengineupdate |

---

## Test Versions

### Patterns
| Component | Old Version | New Version | Rollback Version |
|-----------|-------------|-------------|------------------|
| PTN | 18.500.00 | 18.501.00 | 18.499.00 |
| SPYWARE | 2.5.100 | 2.5.101 | 2.5.99 |
| BOT | 1.2.300 | 1.2.301 | 1.2.299 |
| ITP | 3.1.200 | 3.1.201 | 3.1.199 |
| ITE | 1.0.50 | 1.0.51 | 1.0.49 |
| SPAM | 4.1.100 | 4.1.101 | 4.1.99 |
| ICRCAGENT | 2.0.100 | 2.0.101 | 2.0.99 |
| TMSA | 1.5.200 | 1.5.201 | 1.5.199 |
| DPIPTN | 3.2.100 | 3.2.101 | 3.2.99 |

### Engines
| Component | Old Version | New Version | Rollback Version |
|-----------|-------------|-------------|------------------|
| ENG | 21.0.1234 | 21.0.1235 | 21.0.1233 |
| ATSEENG | 4.5.600 | 4.5.601 | 4.5.599 |
| TMUFEENG | 2.8.100 | 2.8.101 | N/A (Cannot rollback) |
| SPAMENG | 5.1.200 | 5.1.201 | 5.1.199 |

---

## Update Modes

| Mode | Value | Description | Confirmation Required |
|------|-------|-------------|----------------------|
| Normal | NORMAL | Standard update flow | No |
| Forced | FORCED | Update even if up-to-date | Yes |
| Rollback | ROLLBACK | Restore previous version | Yes |

---

## Update Servers

| Environment | Server URL | Purpose |
|-------------|------------|---------|
| Production | http://update.trend.com | Live update server |
| Test | http://test-update.trend.com | Test environment |
| Mock | http://localhost:8080 | Mock server for testing |

---

## Time Constraints

| Operation | Expected Duration | Timeout | Warning Threshold |
|-----------|-------------------|---------|-------------------|
| Pattern Update | 7-10 minutes | 15 minutes | 12 minutes |
| Engine Update | 10-12 minutes | 20 minutes | 15 minutes |
| Update All | 20-25 minutes | 30 minutes | 28 minutes |
| Rollback | 3-5 minutes | 10 minutes | 8 minutes |
| Page Load | <3 seconds | 10 seconds | 5 seconds |

---

## File Paths

| Path Type | Location | Description |
|-----------|----------|-------------|
| IWSVA Root | /opt/trend/iwsva/ | Main installation directory |
| INI File | /opt/trend/iwsva/intscan.ini | Configuration file |
| Pattern Directory | /opt/trend/iwsva/pattern/ | Pattern files storage |
| Backup Directory | /opt/trend/iwsva/backup/patterns/ | Pattern backups |
| Log File | /var/log/trend/iwsva/update.log | Update log |
| Lock Files | /opt/trend/iwsva/.{component}update | Update lock files |

---

## Test Accounts

Defined in `cypress.env.json`:

```json
{
  "baseUrl": "https://10.206.201.9:8443",
  "username": "admin",
  "password": "********",
  "readonly_username": "viewer",
  "readonly_password": "********"
}
```

---

## Error Messages

| Error Type | Expected Message Pattern | Error Code |
|------------|-------------------------|------------|
| Network Error | "Unable to connect to update server" | NET-001 |
| Disk Space | "Insufficient disk space" | DISK-001 |
| Permission Denied | "Permission denied" | PERM-001 |
| License Expired | "License has expired" | LIC-001 |
| Already Updating | "Component is currently updating" | STATE-001 |
| No Backup Available | "No backup version available" | BACKUP-001 |

---

## Verification Data

### Expected INI File Format
```ini
[Pattern-Update]
Version=18.501.00
Version_utime=2025-01-22 10:30:15
spywarever=2.5.101
spyware_utime=2025-01-22 10:35:20
EngineVersion=21.0.1235
Engine_utime=2025-01-22 10:40:00
```

### Expected Log Format
```
[2025-01-22 10:30:00] INFO: Starting update for PTN
[2025-01-22 10:30:05] INFO: Downloading version 18.501.00
[2025-01-22 10:38:00] INFO: Download completed
[2025-01-22 10:38:05] INFO: Installing version 18.501.00
[2025-01-22 10:39:50] INFO: Update PTN successful: 18.500.00 -> 18.501.00
```

---

## Browser Compatibility

| Browser | Version | Support Status |
|---------|---------|----------------|
| Chrome | 120+ | ✅ Fully Supported |
| Firefox | Latest | ✅ Fully Supported |
| Edge | Latest | ⚠️ Limited Testing |
| Safari | Latest | ❌ Not Supported |

---

## Test Environment Configuration

### Minimum Requirements
- **OS**: IWSVA Appliance (Linux-based)
- **Memory**: 4GB RAM
- **Disk Space**: 10GB free
- **Network**: Stable connection >1Mbps
- **Browser**: Chrome 120+ or Firefox latest

### Recommended Configuration
- **Memory**: 8GB RAM
- **Disk Space**: 20GB free
- **Network**: High-speed connection >10Mbps

---

## Fixture Files

Test data fixtures located in `cypress/fixtures/`:

- **update-test-data.json**: Main test data configuration
- **component-test-versions.json**: Version mapping for all components

---

## Constants and Enumerations

### Component Categories
```javascript
const CATEGORIES = {
  PATTERN: 'pattern',
  ENGINE: 'engine'
}
```

### Update Status
```javascript
const UPDATE_STATUS = {
  IDLE: 'idle',
  CHECKING: 'checking',
  DOWNLOADING: 'downloading',
  INSTALLING: 'installing',
  COMPLETED: 'completed',
  FAILED: 'failed'
}
```

### Priority Levels
```javascript
const PRIORITY = {
  P0: 'Critical',
  P1: 'High',
  P2: 'Medium',
  P3: 'Low'
}
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-01-22 | QA Team | Initial test data dictionary |
