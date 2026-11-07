# sql-testing-demo 风险清单

**项目**: sql-testing-demo (PREQ-019)  
**最近更新**: 2026-11-03（Stage 4 验收确认）

---

## 活跃风险

| ID | 风险描述 | 概率 | 影响 | 等级 | 缓解措施 | 状态 |
|----|---------|------|------|------|---------|------|
| R-04 | PL/pgSQL 语法与 Oracle PL/SQL 有差异，面试官误以为不懂 Oracle | 低 | 低 | P3 | README 明确注明"PostgreSQL PL/pgSQL（语法与 Oracle PL/SQL 近似）"，面试时主动说明 | Open |

---

## 已解决风险历史

| ID | 风险描述 | 解决方案 | 解决日期 |
|----|---------|---------|---------|
| R-01 | psycopg2-binary 与 Python 3.14 不兼容 | 改用 psycopg v3（`psycopg[binary]>=3.3.7`），本地验证通过 | 2026-11-03 |
| R-02 | testcontainers 拉取 postgres:16-alpine 超时 | 提前 `docker pull` 缓存镜像；OrbStack 启动后容器拉取正常 | 2026-11-03 |
| R-03 | CI 无 OrbStack，testcontainers 无法启动容器 | conftest.py `USE_EXTERNAL_DB` 切换：本地用 testcontainers，CI 用 `services: postgres` | 2026-11-03 |
