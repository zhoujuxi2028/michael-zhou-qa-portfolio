# SID IAM 测试平台 — 常见问题

## Q: 需要真实 SID 环境吗？

不需要。所有测试通过 mock 服务运行，无需安装或配置 SID 产品。Mock 服务在 pytest fixture 中自动启动。

## Q: 如何运行测试？

```bash
source venv/bin/activate
cd sid-iam-testing-platform
pip install -r requirements.txt
pytest tests/ -v
```

## Q: 测试之间有依赖关系吗？

没有。每个测试独立运行，function 级 fixture 保证隔离。session 级 fixture（mock 服务）在测试间共享但状态通过 reset 清理。

## Q: Mock 服务如何工作？

| Mock 服务 | 实现 | 说明 |
|-----------|------|------|
| SSO Provider | FastAPI + TestClient | SAML/OIDC 端点，同进程 HTTP |
| LDAP Server | Python dict | 模拟 bind/search/modify |
| Kerberos KDC | 内存令牌存储 | TGT/ST 签发与验证 |
| Data Warehouse | SQLite `:memory:` | 真实 SQL 执行 |
| Graph DB | networkx.DiGraph | 图遍历与路径查询 |
| AI Agent | 规则引擎 | 状态机 + 安全护栏 |

## Q: 为什么覆盖率是 81% 而不是 90%？

Mock 服务（核心逻辑）覆盖率 80-94%。未达 90% 的部分主要是 client 层（薄封装，仅做方法转发）和部分未使用的 helper 函数。

## Q: 如何只运行安全相关测试？

```bash
pytest tests/ -m security -v
```

安全测试覆盖：LDAP 注入、SQL 注入、Prompt 注入、重放攻击、权限提升、PII 脱敏等。

## Q: 如何添加新测试？

1. 在对应 `tests/test_{domain}/` 目录下创建或编辑测试文件
2. 使用 `TC-{DOMAIN}-{MODULE}-{NNN}` 编号
3. 添加 marker（`@pytest.mark.auth`/`data`/`ai` + `@pytest.mark.P0`/`P1`/`P2`）
4. 在 docstring 中包含 TC ID
5. 如需新 mock 功能，在 `src/mock_services/` 中扩展

## Q: CI/CD 如何配置？

GitHub Actions 工作流 `.github/workflows/sid-iam-ci.yml`：

```
Code Quality (black/isort/flake8)
  → Unit Tests (130 tests, coverage)
    → Integration Tests (8 E2E tests)
      → All Tests (138, P0/security 验证)
```

---

*文档版本: 1.0*
