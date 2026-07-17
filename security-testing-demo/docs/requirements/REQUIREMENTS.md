# Security Testing Demo — Requirements

## 功能需求

| ID | 描述 | 优先级 |
|----|------|--------|
| FR-SEC-001 | DVWA 安全测试（XSS, SQLi, CSRF, Auth, Headers） | P0 |
| FR-SEC-002 | Juice Shop API 安全测试 | P0 |
| FR-SEC-003 | OWASP ZAP 集成（基线/全量/API 扫描） | P0 |
| FR-SEC-004 | Nessus Essentials 漏洞扫描 | P1 |
| FR-SEC-005 | OpenVAS/GVM 开源扫描 | P1 |
| FR-SEC-006 | SQLMap SQL 注入利用自动化 | P1 |
| FR-SEC-007 | OWASP Top 10 2021 全量覆盖 | P1 |
| FR-SEC-008 | 密码学失效测试（A02） | P1 |
| FR-SEC-009 | 易受攻击组件测试（A06） | P1 |
| FR-SEC-010 | 软件完整性测试（A08） | P2 |
| FR-SEC-011 | 日志记录与监控失效测试（A09） | P2 |
| FR-SEC-012 | SSRF 测试（A10） | P2 |
| FR-SEC-013 | 多安全级别测试（低/中/高） | P2 |
| FR-SEC-014 | Docker Compose 环境编排（ZAP + DVWA + Juice Shop） | P1 |
| FR-SEC-015 | 分阶段学习指南（7 阶段） | P2 |

## 非功能需求

| ID | 类别 | 要求 |
|----|------|------|
| NFR-SEC-001 | CI | GitHub Actions 5 并行任务 |
| NFR-SEC-002 | 安全 | 依赖安全扫描（safety） |
| NFR-SEC-003 | 合规 | OWASP Top 10 2021 映射 |
