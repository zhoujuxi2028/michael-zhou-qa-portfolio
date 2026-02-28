# Security Policy

## Supported Versions

This project is a demonstration/portfolio project. Security updates are provided for the latest version only.

| Version | Supported          |
| ------- | ------------------ |
| Latest (main branch) | :white_check_mark: |
| Older versions | :x: |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please follow responsible disclosure:

### For Portfolio/Demo Projects

Since this is a demonstration project for a QA portfolio:

1. **GitHub Issues**: Open a public issue for non-critical findings
2. **Email**: For sensitive issues, email [zhou_juxi@hotmail.com](mailto:zhou_juxi@hotmail.com)
3. **GitHub Security Advisories**: Use private vulnerability reporting if available

### What to Include

Please include:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)
- Your contact information (optional)

### Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial assessment**: Within 7 days
- **Fix timeline**: Based on severity
  - CRITICAL: 24-48 hours
  - HIGH: 1 week
  - MEDIUM: 1 month
  - LOW: Next release

## Security Measures

This project implements the following security practices:

### 1. Automated Security Scanning

- **npm audit**: Daily dependency vulnerability scans
- **Trivy**: Container, filesystem, and IaC security scanning
- **GitHub Security**: Centralized vulnerability tracking via SARIF
- **Scheduled scans**: Daily at 3:00 AM UTC

### 2. CI/CD Security Gates

- Security scans on every push and PR
- Dependency vulnerability checks before merge
- Container image scanning before deployment
- IaC misconfiguration detection

### 3. Dependency Management

- Automated dependency updates via Dependabot (if enabled)
- Lock files (package-lock.json) for reproducible builds
- Regular dependency audits
- Minimal dependency footprint

### 4. Container Security

- Official base images (node:18-alpine, postman/newman)
- Non-root user where possible
- Minimal image size (alpine-based)
- Regular base image updates

### 5. Infrastructure Security

- Least privilege IAM policies (Terraform)
- Encrypted storage (S3 encryption at rest)
- Network isolation (Kubernetes namespaces)
- Resource limits and quotas

### 6. Code Security

- No hardcoded credentials
- Environment variables for sensitive data
- `.gitignore` for secrets (cypress.env.json)
- Public code review (GitHub PRs)

## Known Limitations

As a demonstration project:

1. **No Production Data**: No real user data or sensitive information
2. **Public Repository**: All code is open source
3. **Test Environment**: Uses public test APIs (jsonplaceholder.typicode.com)
4. **Limited Scope**: Security measures demonstrate best practices, not production-grade hardening

## Security Resources

- [Security Documentation](security/README.md)
- [GitHub Security Tab](../../security/code-scanning)
- [Trivy Documentation](https://aquasecurity.github.io/trivy/)
- [npm audit Documentation](https://docs.npmjs.com/cli/v9/commands/npm-audit)

## Compliance

This project demonstrates security practices aligned with:

- OWASP Top 10
- CIS Benchmarks
- SANS Top 25
- NIST Cybersecurity Framework
- PCI DSS (vulnerability scanning requirements)

## Security Contacts

- **Project Owner**: Michael Zhou
- **Email**: [zhou_juxi@hotmail.com](mailto:zhou_juxi@hotmail.com)
- **GitHub**: [@zhoujuxi2028](https://github.com/zhoujuxi2028)

## Acknowledgments

We appreciate responsible disclosure and will acknowledge security researchers who report valid vulnerabilities.

---

**Last Updated**: 2026-02-28
**Policy Version**: 1.0
