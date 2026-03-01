#!/bin/bash
# Security Report Generator
# This script runs all security scans and generates a comprehensive report
#
# Usage:
#   ./security/security-report.sh [output-dir]
#
# Options:
#   output-dir: Directory to save reports (default: ./security-reports)

set -e  # Exit on error

# ==============================================================================
# Configuration
# ==============================================================================

# Default output directory
OUTPUT_DIR="${1:-./security-reports}"
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
REPORT_FILE="${OUTPUT_DIR}/security-report-${TIMESTAMP}.md"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ==============================================================================
# Functions
# ==============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# ==============================================================================
# Setup
# ==============================================================================

log_info "Security Report Generator"
log_info "Timestamp: $(date)"
log_info "Output directory: ${OUTPUT_DIR}"

# Create output directory
mkdir -p "${OUTPUT_DIR}"

# Initialize report
cat > "${REPORT_FILE}" << EOF
# Security Report
**Generated**: $(date)
**Project**: QA Portfolio CI/CD Demo
**Scan Type**: Comprehensive Security Scan

---

EOF

# ==============================================================================
# Scan 1: NPM Audit
# ==============================================================================

log_info "Running npm audit..."
echo "## 1. NPM Dependency Audit" >> "${REPORT_FILE}"
echo "" >> "${REPORT_FILE}"

if npm audit --json > "${OUTPUT_DIR}/npm-audit.json" 2>&1; then
    log_success "npm audit: No vulnerabilities found"
    echo "✅ **Status**: PASS - No vulnerabilities detected" >> "${REPORT_FILE}"
else
    log_warning "npm audit: Vulnerabilities detected"
    echo "⚠️ **Status**: FAIL - Vulnerabilities detected" >> "${REPORT_FILE}"
fi

# Generate summary
echo "" >> "${REPORT_FILE}"
echo "\`\`\`" >> "${REPORT_FILE}"
npm audit 2>&1 | head -30 >> "${REPORT_FILE}"
echo "\`\`\`" >> "${REPORT_FILE}"
echo "" >> "${REPORT_FILE}"

# ==============================================================================
# Scan 2: Trivy Filesystem Scan
# ==============================================================================

log_info "Running Trivy filesystem scan..."
echo "## 2. Trivy Filesystem Scan" >> "${REPORT_FILE}"
echo "" >> "${REPORT_FILE}"

if command -v trivy &> /dev/null; then
    if trivy fs --config security/trivy-config.yaml . > "${OUTPUT_DIR}/trivy-fs.txt" 2>&1; then
        log_success "Trivy filesystem scan: No issues found"
        echo "✅ **Status**: PASS - No critical issues" >> "${REPORT_FILE}"
    else
        log_warning "Trivy filesystem scan: Issues detected"
        echo "⚠️ **Status**: FAIL - Security issues detected" >> "${REPORT_FILE}"
    fi

    echo "" >> "${REPORT_FILE}"
    echo "\`\`\`" >> "${REPORT_FILE}"
    cat "${OUTPUT_DIR}/trivy-fs.txt" | head -50 >> "${REPORT_FILE}"
    echo "\`\`\`" >> "${REPORT_FILE}"
    echo "" >> "${REPORT_FILE}"
else
    log_warning "Trivy not installed, skipping filesystem scan"
    echo "⚠️ **Status**: SKIPPED - Trivy not installed" >> "${REPORT_FILE}"
    echo "" >> "${REPORT_FILE}"
fi

# ==============================================================================
# Scan 3: Trivy Docker Image Scan
# ==============================================================================

log_info "Running Trivy image scan..."
echo "## 3. Trivy Docker Image Scan" >> "${REPORT_FILE}"
echo "" >> "${REPORT_FILE}"

# Check if Docker image exists
if docker image inspect qa-newman-demo:latest &> /dev/null && command -v trivy &> /dev/null; then
    if trivy image --severity CRITICAL,HIGH,MEDIUM qa-newman-demo:latest > "${OUTPUT_DIR}/trivy-image.txt" 2>&1; then
        log_success "Trivy image scan: No issues found"
        echo "✅ **Status**: PASS - No critical issues" >> "${REPORT_FILE}"
    else
        log_warning "Trivy image scan: Issues detected"
        echo "⚠️ **Status**: FAIL - Security issues detected" >> "${REPORT_FILE}"
    fi

    echo "" >> "${REPORT_FILE}"
    echo "\`\`\`" >> "${REPORT_FILE}"
    cat "${OUTPUT_DIR}/trivy-image.txt" | head -50 >> "${REPORT_FILE}"
    echo "\`\`\`" >> "${REPORT_FILE}"
    echo "" >> "${REPORT_FILE}"
else
    log_warning "Docker image not found or Trivy not installed, skipping image scan"
    echo "⚠️ **Status**: SKIPPED - Image not built or Trivy not installed" >> "${REPORT_FILE}"
    echo "" >> "${REPORT_FILE}"
fi

# ==============================================================================
# Summary
# ==============================================================================

echo "## Summary" >> "${REPORT_FILE}"
echo "" >> "${REPORT_FILE}"
echo "### Scan Results" >> "${REPORT_FILE}"
echo "" >> "${REPORT_FILE}"
echo "| Scan Type | Status | Details |" >> "${REPORT_FILE}"
echo "|-----------|--------|---------|" >> "${REPORT_FILE}"
echo "| NPM Audit | See above | \`npm-audit.json\` |" >> "${REPORT_FILE}"
echo "| Trivy Filesystem | See above | \`trivy-fs.txt\` |" >> "${REPORT_FILE}"
echo "| Trivy Docker Image | See above | \`trivy-image.txt\` |" >> "${REPORT_FILE}"
echo "" >> "${REPORT_FILE}"

echo "### Artifacts" >> "${REPORT_FILE}"
echo "" >> "${REPORT_FILE}"
echo "- 📄 Full report: \`${REPORT_FILE}\`" >> "${REPORT_FILE}"
echo "- 📁 Detailed results: \`${OUTPUT_DIR}/\`" >> "${REPORT_FILE}"
echo "" >> "${REPORT_FILE}"

echo "---" >> "${REPORT_FILE}"
echo "*Report generated by \`security/security-report.sh\`*" >> "${REPORT_FILE}"

# ==============================================================================
# Output Summary
# ==============================================================================

log_success "Security scan complete!"
echo ""
log_info "Report saved to: ${REPORT_FILE}"
log_info "Detailed results in: ${OUTPUT_DIR}/"
echo ""
log_info "View report: cat ${REPORT_FILE}"
echo ""

# Display quick summary
log_info "Quick Summary:"
grep "Status" "${REPORT_FILE}" || true
