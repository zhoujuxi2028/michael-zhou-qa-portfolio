# Documentation Directory

This directory contains all project documentation organised by purpose.

## Directory Structure

```
docs/
├── README.md                        # This file
├── architecture/                    # System design and technical specs
├── guides/                          # How-to guides, quickstart, troubleshooting
├── reference/                       # Conceptual reference and scenario cards
├── project-management/              # Analysis, WBS, phase completions, issues
│   └── phases/                      # Per-phase completion reports
└── fixes/                           # Bug fix logs and audit records
```

## architecture/

System design documents and infrastructure specs.

| File | Description |
|------|-------------|
| `ARCHITECTURE.md` | Overall system architecture |
| `PHASE-1.2-TERRAFORM-DESIGN.md` | Terraform infrastructure design |

## guides/

Step-by-step guides for setup, verification, and troubleshooting.

| File | Description |
|------|-------------|
| `CI-CD-GUIDE.md` | CI/CD pipeline setup and integration guide |
| `QUICKSTART.md` | Quick start for new contributors |
| `FAQ-GUIDE.md` | Frequently asked questions |
| `TROUBLESHOOTING.md` | Common issues and solutions |
| `MANUAL-VERIFICATION-GUIDE.md` | Manual verification procedures |
| `VERIFICATION-GUIDE.md` | Automated verification guide |
| `GITHUB-ACTIONS-VERIFICATION.md` | GitHub Actions-specific verification |

## reference/

Conceptual reference and QA scenario cards — use these when designing or reviewing pipelines.

| File | Description |
|------|-------------|
| `QA-CICD-SCENARIOS.md` | QA scenario cards across the full CI/CD lifecycle |
| `AZURE-VS-GITHUB-ACTIONS.md` | Comparison of Azure Pipelines and GitHub Actions |
| `ERROR-CLASSIFICATION.md` | Error taxonomy and classification guide |

## project-management/

Analysis reports, WBS, and project records.

| File | Description |
|------|-------------|
| `WBS.md` | Work breakdown structure |
| `CICD-COMPLETE-ANALYSIS.md` | Full CI/CD implementation analysis |
| `REGRESSION-TEST-RESULT.md` | Regression test execution results |
| `VIDEO-QUALITY-ISSUE.md` | Video quality issue record |
| `phases/` | Per-phase completion reports (PHASE-1.4 through PHASE-2-3) |

## fixes/

Historical records of bugs, fixes, and security audit outputs.

| File | Description |
|------|-------------|
| `BUG-LIST.md` | Identified bugs and their status |
| `BUGFIX-SUMMARY.md` | Summary of applied fixes |
| `BUG-FIX-LOG-2026-02-21.md` | Dated fix log |
| `README-DOCKER-FIXES.md` | Docker-specific fixes |
| `npm-audit-results.txt` | npm security audit output |
| `dependency-tree-fixed.txt` | Dependency resolution record |
| `fix-summary.txt` | Quick-reference fix notes |

## Conventions

- File names: ALL-CAPS with hyphens (`MY-GUIDE.md`)
- Time-sensitive reports: date prefix (`2026-02-21-report.md`)
- Plain text logs: `.txt`; all documentation: `.md`
