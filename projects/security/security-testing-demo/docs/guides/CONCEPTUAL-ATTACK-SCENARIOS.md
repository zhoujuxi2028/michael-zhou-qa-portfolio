# 概念性攻击场景（非自动化）

这些场景原先是 `@pytest.mark.skip(reason="Conceptual: ...")` 测试：**从不执行**，却计入测试总数。因靶场（DVWA / Juice Shop）缺少可观测的条件，无法写成有效的自动化断言，故移至本文档作为手工测试参考。

| ID | 场景 | 原测试 | 无法自动化的原因 | 若要自动化需要 |
|----|------|--------|------------------|----------------|
| SEC-LOG-001 | User-Agent 日志注入 | `test_logging.py::test_log_injection_via_user_agent` | 测试端看不到服务端日志 | 能读取应用日志的靶场（挂载日志卷 / 日志 API） |
| SEC-LOG-002 | 用户名日志注入 | `test_logging.py::test_log_injection_via_username` | 同上 | 同上 |
| SEC-AUTH-002 | 账户锁定 | `test_auth.py::test_account_lockout` | DVWA 没有锁定机制，也没有可配置的阈值 | 带锁定策略的靶场；"缺少速率限制"已由 `test_login_rate_limiting` 覆盖 |
| SEC-AUTH-004 | 会话超时 | `test_auth.py::test_session_timeout` | 需要等待 PHP `session.gc_maxlifetime`（默认 24 分钟） | 可配置短超时的靶场，或允许测试调整会话 TTL |
| SEC-SQLI-005 | 二阶 SQL 注入 | `test_sqli.py::test_second_order_sqli_concept` | 需要"存储 → 另一处读取并拼接 SQL"的多步数据流，DVWA 中没有 | 带存储后再查询流程的靶场（例如先注册用户名，再在个人资料查询中使用） |

## 手工测试 payload

### 日志注入（SEC-LOG-001 / 002）

通过 `User-Agent` 或登录用户名提交，再检查日志里是否出现伪造的行：

```text
Mozilla/5.0\nFake-Log-Entry: INJECTED
Mozilla/5.0\r\n[ERROR] Fake error message
Mozilla/5.0%0d%0a[CRITICAL] Injected log
admin\nFake-Entry: Success
admin\r\n[INFO] User logged in successfully
admin%0a%0dFake entry
```

**判定**：日志中出现独立的伪造行（例如 `[ERROR] Fake error message`）即为存在漏洞；CR/LF 被转义或剔除即为安全。

### 账户锁定（SEC-AUTH-002）

对同一账户连续提交 N 次（例如 5–10 次）错误密码，再用正确密码登录。

**判定**：仍然能登录说明没有锁定机制。

### 会话超时（SEC-AUTH-004）

登录后闲置超过配置的超时时间，再访问受保护页面。

**判定**：没有被重定向到登录页说明会话没有过期。

### 二阶 SQL 注入（SEC-SQLI-005）

1. 在存储型字段（例如用户名）写入 `admin'-- `
2. 触发另一个会读取该字段并拼接进 SQL 的功能
3. 观察是否出现 SQL 错误，或越权读到其他记录

## 已改为自动化测试的场景

原先同样是 Conceptual 的 SSRF（SEC-SSRF-001 ~ 010）和 XXE（SEC-INTEG-002），已经改成针对 Juice Shop 的真实测试，见 `tests/test_ssrf.py` 和 `tests/test_xxe.py`。
