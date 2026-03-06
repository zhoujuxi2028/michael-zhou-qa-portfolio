# Verification Checklist

**Project**: GUI-mz/cypress-tests
**Module**: IWSVA Update
**Last Updated**: 2025-01-22

This checklist ensures complete verification of update operations across all levels.

---

## Update Verification Checklist

### Level 1: UI Verification ✅

#### Manual Update Page
- [ ] Current version displayed correctly
- [ ] Last update timestamp shown
- [ ] Component radio buttons selectable
- [ ] Update button enabled
- [ ] Rollback button enabled
- [ ] Update All button enabled
- [ ] Refresh button functional
- [ ] Help icon present and functional
- [ ] No error messages on page load

#### During Update
- [ ] Redirect to AU_Update.jsp successful
- [ ] Progress indicator visible
- [ ] Status message updates appropriately
- [ ] No JavaScript errors in console

#### After Update
- [ ] New version number displayed
- [ ] Last update timestamp updated
- [ ] Success message shown
- [ ] "Back" button returns to correct page
- [ ] "Updating..." status cleared

---

### Level 2: Backend Verification ✅

#### INI File Checks
- [ ] **File Path**: `/opt/trend/iwsva/intscan.ini` exists
- [ ] **Section**: `[Pattern-Update]` present
- [ ] **Version Key**: Updated to new version
- [ ] **Update Time Key**: Updated to current timestamp
- [ ] **File Permissions**: Readable (644)
- [ ] **File Encoding**: UTF-8

#### Lock File Checks
- [ ] **During Update**: Lock file exists (e.g., `.patupdate`)
- [ ] **After Update**: Lock file removed
- [ ] **Lock File Location**: `/opt/trend/iwsva/`
- [ ] **No Orphan Locks**: No stale lock files present

#### Pattern/Engine File Checks
- [ ] **Files Exist**: Pattern files present in `/opt/trend/iwsva/pattern/`
- [ ] **File Size**: Files > minimum expected size
- [ ] **File Timestamp**: Modified time is recent
- [ ] **File Integrity**: No corruption (checksum if available)

#### Backup Verification
- [ ] **Backup Created**: Old version backed up
- [ ] **Backup Location**: `/opt/trend/iwsva/backup/patterns/{version}/`
- [ ] **Backup Complete**: All old files preserved
- [ ] **Backup Accessible**: Can be used for rollback

---

### Level 3: Log Verification ✅

#### Update Log (`/var/log/trend/iwsva/update.log`)
- [ ] **Update Start**: Log entry for update start
- [ ] **Component ID**: Correct component logged
- [ ] **Version Change**: From/To versions logged
- [ ] **Download Progress**: Download logged
- [ ] **Installation**: Installation process logged
- [ ] **Success/Failure**: Clear outcome logged
- [ ] **Timestamp**: All entries timestamped
- [ ] **No Errors**: No error entries (for successful update)

#### Audit Log
- [ ] **User Action**: Admin action recorded
- [ ] **Username**: Correct user logged
- [ ] **Operation Type**: Update/Rollback/Forced logged
- [ ] **Timestamp**: Action timestamp recorded

---

### Level 4: Business Function Verification ✅

#### For Pattern Updates
- [ ] **Scan Function**: Virus scan works
- [ ] **EICAR Test**: EICAR file detected
- [ ] **Pattern Version**: Scan results show correct version
- [ ] **Detection Rate**: No decrease in detection capability
- [ ] **Scan Performance**: No significant performance degradation

#### For Engine Updates
- [ ] **Engine Function**: Scan engine operational
- [ ] **Service Status**: `iws_scan` service running
- [ ] **Service Restart**: Service restarted successfully (if required)
- [ ] **Memory Usage**: Within acceptable limits
- [ ] **CPU Usage**: No abnormal spikes

#### General System Health
- [ ] **Web Filtering**: URL filtering functional
- [ ] **Policy Enforcement**: Policies still enforced
- [ ] **No Service Interruption**: No downtime during update
- [ ] **Admin Console**: Admin interface accessible
- [ ] **System Logs**: No critical errors in system logs

---

## Rollback Verification Checklist

### Pre-Rollback
- [ ] Backup version exists
- [ ] Rollback is supported for component
- [ ] Current version noted

### During Rollback
- [ ] Confirmation dialog shown
- [ ] Rollback process starts
- [ ] Status updates visible

### Post-Rollback
- [ ] Version reverted to previous
- [ ] INI file updated to old version
- [ ] Old pattern files restored
- [ ] Log records rollback operation
- [ ] System functionality verified
- [ ] No residual new version files

---

## Error Scenario Verification Checklist

### Network Errors
- [ ] Error message displayed to user
- [ ] Version unchanged
- [ ] No partial downloads
- [ ] Error logged
- [ ] Retry option available

### Resource Errors
- [ ] Disk space checked before update
- [ ] Appropriate error message shown
- [ ] System remains stable
- [ ] Cleanup performed

### State Errors
- [ ] Concurrent update prevented
- [ ] Lock file mechanism works
- [ ] Stale locks handled
- [ ] Clear error messages

---

## Performance Verification Checklist

### Update Duration
- [ ] Pattern update < 10 minutes (typical)
- [ ] Engine update < 15 minutes (typical)
- [ ] Update All < 30 minutes (typical)
- [ ] No unexpected delays

### Resource Usage
- [ ] CPU usage < 80% during update
- [ ] Memory growth acceptable
- [ ] Memory released after update
- [ ] Network bandwidth utilized efficiently
- [ ] No impact on other services

---

## Security Verification Checklist

### Authentication & Authorization
- [ ] Only authenticated users can update
- [ ] Read-only users cannot update
- [ ] Update permission checked
- [ ] Session timeout handled

### Data Integrity
- [ ] Pattern files not corrupted
- [ ] No unauthorized modifications
- [ ] Checksums verified (if available)
- [ ] Backup integrity maintained

### Logging & Audit
- [ ] All actions logged
- [ ] User identified in logs
- [ ] Logs not tamperable
- [ ] Sensitive data not exposed in logs

---

## Cross-Browser Verification Checklist

### Chrome
- [ ] All features functional
- [ ] No console errors
- [ ] UI renders correctly

### Firefox
- [ ] All features functional
- [ ] No console errors
- [ ] UI renders correctly

---

## Regression Verification Checklist

After any update, verify:
- [ ] Existing configurations unchanged
- [ ] Custom settings preserved
- [ ] Other modules unaffected
- [ ] No new defects introduced
- [ ] All P0 test cases pass

---

## Sign-off Checklist

### Before Production Release
- [ ] All P0 test cases passed
- [ ] All P1 test cases passed
- [ ] No critical defects open
- [ ] Performance acceptable
- [ ] Documentation updated
- [ ] Test report generated

### Approval
- [ ] QA Lead approval
- [ ] Development Team approval
- [ ] Product Manager approval (if required)

---

## Quick Verification Steps (Smoke Test)

For quick verification after update:

1. **UI Check**: Version displayed = expected version ✅
2. **Backend Check**: `grep "Version=" /opt/trend/iwsva/intscan.ini` shows new version ✅
3. **Log Check**: `tail -20 /var/log/trend/iwsva/update.log` shows success ✅
4. **Function Check**: Run a test scan ✅
5. **Service Check**: All services running ✅

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-01-22 | QA Team | Initial verification checklist |
