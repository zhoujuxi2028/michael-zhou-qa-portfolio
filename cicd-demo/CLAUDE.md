# CLAUDE.md - CI/CD Demo Project

This file provides guidance to Claude Code when working with the CI/CD demonstration project within the QA Portfolio.

## Project Purpose

This is a **CI/CD pipeline demonstration project** showcasing:
- Dual-layer GitHub Actions strategy (PR fast checks + Docker production tests)
- Docker container orchestration (Cypress + Newman)
- DevOps best practices (caching, parallelization, artifact management)
- Interview-ready architecture documentation

**Part of**: Michael Zhou's QA Portfolio (`michael-zhou-qa-portfolio`)
**Related Projects**: `cypress-tests/`, `postman-tests/`, `selenium-tests/`
**Portfolio Root**: `/home/michael/repos/michael-zhou-qa-portfolio`

## Quick Start

```bash
cd /home/michael/repos/michael-zhou-qa-portfolio/cicd-demo

# Install dependencies
npm install

# Run tests locally
npm test                     # Both Cypress + Newman
npm run test:cypress         # Cypress only
npm run test:newman          # Newman only

# Run in Docker
npm run docker:test          # Run and cleanup
npm run docker:test:logs     # With detailed logs

# Interactive development
npm run test:cypress:headed  # Cypress UI mode
```

## Interview Talking Points

### CI/CD Architecture
> "This project demonstrates a dual-layer CI/CD strategy: fast Node.js checks on PRs for developer productivity (2-3 min), and comprehensive Docker tests on main branch for production reliability (5-8 min). This balances speed with thoroughness."

### Docker Benefits  
> "We use --exit-code-from cypress instead of --abort-on-container-exit because Newman completes faster (6s vs 14s). This ensures Cypress finishes all 16 tests while still returning Cypress's exit code to CI for failure detection."

### Test Coverage
> "The project includes 16 Cypress E2E tests and 18 Newman API assertions, all targeting JSONPlaceholder. This demonstrates API mocking, error handling, CRUD operations, and responsive design testing."

## Common Commands

```bash
# Local testing
npm install
npm test
npm run test:cypress:headed

# Docker testing
docker compose up --abort-on-container-exit
npm run docker:test

# CI/CD workflows  
# Automatically run on PR and main branch pushes
```

## Phase Completion Doc Template

When writing `docs/PHASE-*-COMPLETION.md` docs, follow this structure (~100-150 lines max):

1. **Header** - Phase name, date, status
2. **Deliverables table** - Files created/updated with brief descriptions
3. **What was built** - Short description of each feature (no code blocks unless essential)
4. **New commands/scripts** - Table of npm scripts or CLI commands added
5. **Cross-references** - Link to existing docs, DO NOT duplicate their content

**DO NOT include in phase completion docs:**
- Interview talking points (add to `docs/INTERVIEW-GUIDE.md`)
- Troubleshooting sections (add to `docs/guides/TROUBLESHOOTING.md`)
- Error classification (add to `docs/ERROR-CLASSIFICATION.md`)
- Verbose verification output / self-test transcripts
- Metrics tables, future enhancements, or maintenance checklists

## Portfolio Context

This project is part of Michael Zhou's QA Portfolio demonstrating CI/CD and DevOps skills.

**For portfolio-wide guidance, see** `/home/michael/repos/michael-zhou-qa-portfolio/CLAUDE.md`
