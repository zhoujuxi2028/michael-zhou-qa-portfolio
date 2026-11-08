# Documentation Index

Complete documentation for the IWSVA Cypress Test Automation project.

## 📚 Documentation Structure

### 🚀 Quick Start Guides
**Location:** `docs/quickstart/`

Fast-track guides to get you up and running quickly:
- [Downgrade Quickstart](quickstart/DOWNGRADE_QUICKSTART.md) - Quick guide for downgrading components
- [Consolidated Tests Quickstart](quickstart/CONSOLIDATED_TESTS_QUICKSTART.md) - Running consolidated test suites
- [Migration Guide](quickstart/MIGRATION_GUIDE.md) - Migrating from old to new test structure

### 📖 Developer Guides
**Location:** `docs/guides/`

In-depth technical guides and references:
- [IWSVA Test Guide](guides/IWSVA_TEST_GUIDE.md) - Comprehensive Cypress testing guide for IWSVA
- [Test Generator Guide](guides/TEST_GENERATOR_GUIDE.md) - Using test generators for data-driven tests
- [System Update Page Guide](guides/SYSTEM_UPDATE_PAGE_GUIDE.md) - System Updates page interactions
- [CSRF Token Explained](guides/CSRF_TOKEN_EXPLAINED.md) - Understanding CSRF token handling in IWSVA
- [Test Cases README](guides/TEST_CASES_README.md) - Quick reference for test cases
- [Update Module README](guides/UPDATE_MODULE_README.md) - Update module testing overview
- [Downgrade Guide](DOWNGRADE_GUIDE.md) - Complete component downgrade documentation

### 📊 Reports & Summaries
**Location:** `docs/reports/`

Project reports, refactoring summaries, and execution results:
- Test Report - Test execution results
- Test Execution Report - Detailed execution report
- Consolidation Summary - Test consolidation summary
- Refactoring Summary - Code refactoring summary
- Refactoring Complete - Refactoring completion report
- Phase 4 Optimization Summary - Phase 4 optimization details

### 📝 Test Cases & Plans
**Location:** `docs/test-cases/` and `docs/test-plans/`

Formal test documentation:
- Test Cases - All 77 test cases documented
- [Test Case Mapping](test-cases/test-case-mapping.json) - Machine-readable test metadata
- [Traceability Matrix](test-cases/traceability-matrix.md) - Requirements tracking
- Test Plan - Complete test plan
- Test Strategy - High-level strategy

### 🏗️ Project Planning
**Location:** `docs/project-planning/`

Project architecture and planning documents:
- Work Breakdown Structure (WBS) - 11-phase project plan
- Project roadmap and phase documentation

### 🇨🇳 Chinese Documentation
**Location:** `docs/zh-CN/`

中文文档:
- [会话恢复指南](zh-CN/会话恢复指南.md) - Session recovery guide

---

## 📂 Where to Place New Documentation

To maintain organization, follow these placement rules:

### Guides (`docs/guides/`)
Place here if your document is:
- A technical how-to guide
- API or feature reference
- Architecture explanation
- Configuration documentation
- Best practices guide

**Examples:** "How to use X", "Y API Reference", "Z Configuration Guide"

### Quick Start (`docs/quickstart/`)
Place here if your document is:
- A getting started guide
- Quick setup instructions
- Fast-track tutorial
- Migration guide

**Examples:** "Quick Start", "5-Minute Setup", "Migration from X to Y"

### Reports (`docs/reports/`)
Place here if your document is:
- Test execution report
- Project summary/retrospective
- Refactoring summary
- Performance analysis
- Phase completion report

**Examples:** "Q1 Test Report", "Refactoring Summary", "Performance Analysis"

### Test Cases (`docs/test-cases/`)
Place here if your document is:
- Test case specification
- Test scenario definition
- Verification checklist
- Test data dictionary

### Test Plans (`docs/test-plans/`)
Place here if your document is:
- Test plan document
- Test strategy
- QA approach documentation

### Project Planning (`docs/project-planning/`)
Place here if your document is:
- Project roadmap
- Work breakdown structure
- Architecture decision records (ADR)
- Project milestone documentation

### Chinese Docs (`docs/zh-CN/`)
Place all Chinese language documentation here.

---

## 🔍 Quick Links

### Most Used Documents
1. [IWSVA Test Guide](guides/IWSVA_TEST_GUIDE.md) - Start here for testing
2. Test Cases - All test cases
3. WBS - Project phases
4. [Downgrade Quickstart](quickstart/DOWNGRADE_QUICKSTART.md) - Quick downgrade guide

### For New Contributors
1. [IWSVA Test Guide](guides/IWSVA_TEST_GUIDE.md) - Understand the test framework
2. [Test Generator Guide](guides/TEST_GENERATOR_GUIDE.md) - Learn test generators
3. [CSRF Token Explained](guides/CSRF_TOKEN_EXPLAINED.md) - IWSVA-specific considerations

### For Test Execution
1. [Consolidated Tests Quickstart](quickstart/CONSOLIDATED_TESTS_QUICKSTART.md) - Run tests quickly
2. Test Execution Report - Latest results
3. Test Cases - Test specifications

---

## 📅 Documentation Updates

### 2026-01-24
- **Major:** Reorganized documentation structure
  - Created category-based folders (guides, quickstart, reports, zh-CN)
  - Moved 16 documents from root to organized folders
  - Reduced root directory from 18 MD files to 2 core files
  - Created this index for easy navigation

### 2026-01-23
- Added Downgrade Guide and Quickstart documentation
- Added Migration Guide for test refactoring

### 2026-01-22
- Initial documentation structure created
- Phase 1-3 documentation completed

---

## 🤝 Contributing to Documentation

When adding new documentation:

1. **Choose the right location** using the guide above
2. **Add an entry** to this README index in the appropriate section
3. **Update the root README** if it's a major document
4. **Follow naming conventions**:
   - Use UPPERCASE_WITH_UNDERSCORES for major docs (e.g., `TEST_GUIDE.md`)
   - Use kebab-case for multi-word names (e.g., `test-case-mapping.json`)
5. **Update the "Documentation Updates" section** with your changes

---

## 📧 Questions?

If you're unsure where to place a new document, consider:
- Is it instructional? → `guides/`
- Is it a quick reference? → `quickstart/`
- Is it a report or summary? → `reports/`
- Is it test-related? → `test-cases/` or `test-plans/`

When in doubt, place it in `guides/` and update this index.
