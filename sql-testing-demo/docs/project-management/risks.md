# sql-testing-demo 风险清单

**项目**: sql-testing-demo (PREQ-019)  
**最近更新**: 2026-11-03（Stage 1 初始识别）

---

## 活跃风险

| ID | 风险描述 | 概率 | 影响 | 等级 | 缓解措施 | 状态 |
|----|---------|------|------|------|---------|------|
| R-01 | psycopg2-binary 与 Python 3.14 不兼容（C 扩展 ABI 变化）| 高 | 高 | P1 | 使用 psycopg v3（纯 Python 模式可用，binary 包可选）| Open |
| R-02 | testcontainers 拉取 postgres:16-alpine 镜像超时 | 中 | 中 | P2 | 开发前先执行 `docker pull postgres:16-alpine` 预缓存 | Open |
| R-03 | CI 环境（GitHub Actions）无 OrbStack，testcontainers 无法启动容器 | 中 | 高 | P1 | CI 改用 `services: postgres`，本地用 testcontainers，conftest.py 通过环境变量切换 | Open |
| R-04 | PL/pgSQL 语法与 Oracle PL/SQL 有差异，面试官误以为不懂 Oracle | 低 | 低 | P3 | README 明确注明"PostgreSQL PL/pgSQL（语法与 Oracle PL/SQL 近似）"，面试时主动说明 | Open |

---

## 已解决风险历史

| ID | 风险描述 | 解决方案 | 解决日期 |
|----|---------|---------|---------|
| _(Stage 3+ 填入)_ | | | |
