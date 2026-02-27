# Documentation Directory

This directory contains all project documentation organized by purpose.

## Directory Structure

```
docs/
├── guides/           # User guides and tutorials
├── analysis/         # Analysis reports and test results
├── fixes/            # Bug fixes and troubleshooting records
└── README.md         # This file
```

## Guides (`guides/`)

**Purpose**: Step-by-step guides and reference documentation

- `CI-CD-GUIDE.md` - Comprehensive guide for CI/CD pipeline setup and integration
- `TROUBLESHOOTING.md` - Common issues and solutions for the project

**When to add**: Create new guides when documenting workflows, setup procedures, or best practices.

## Analysis (`analysis/`)

**Purpose**: Analysis reports, test results, and project assessments

- `CICD-COMPLETE-ANALYSIS.md` - Complete analysis of CI/CD implementation
- `REGRESSION-TEST-RESULT.md` - Regression test execution results

**When to add**: Add analysis documents when performing system reviews, test assessments, or technical investigations.

## Fixes (`fixes/`)

**Purpose**: Historical records of bugs, fixes, and troubleshooting sessions

- `BUGFIX-SUMMARY.md` - Summary of bug fixes applied
- `BUG-LIST.md` - List of identified bugs and their status
- `README-DOCKER-FIXES.md` - Docker-related fixes documentation
- `dependency-tree-fixed.txt` - Dependency resolution records
- `fix-summary.txt` - Quick reference for fixes
- `npm-audit-results.txt` - Security audit results

**When to add**: Document bug fixes, security patches, and troubleshooting sessions for future reference.

## Document Naming Conventions

- Use kebab-case for file names: `my-guide-name.md`
- Use descriptive names that indicate content: `docker-setup-guide.md` not `guide.md`
- Add date prefix for time-sensitive reports: `2026-02-21-performance-analysis.md`
- Use `.md` for markdown, `.txt` for plain text logs

## Organization Guidelines

1. **Keep root directory clean**: Only essential project files (configs, package.json, README) should be in root
2. **Separate by purpose**: Guides vs Analysis vs Fixes have different lifecycles
3. **Archive old documents**: Move outdated docs to an `archive/` subdirectory
4. **Update references**: When moving documents, update any links in other files

## Quick Links

From project root:
- View guides: `ls -1 docs/guides/`
- View analysis: `ls -1 docs/analysis/`
- View fixes: `ls -1 docs/fixes/`
- Search all docs: `grep -r "search-term" docs/`
