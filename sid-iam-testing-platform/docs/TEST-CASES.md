# SID IAM 测试平台 — 测试用例目录

# SID IAM Testing Platform — Test Cases

## 编号规则 / Naming Convention

```
TC-{DOMAIN}-{MODULE}-{NNN}

TC     = Test Case
DOMAIN = AUTH / DATA / AI
MODULE = SSO / LDAP / KRB / ZT / SES / MFA
         ONT / PIP / WH / TAG / ANA
         LCY / AUTH / DAT / SAF / INT
NNN    = 001-999
```

---

## 测试用例汇总 / Summary

| 领域 / Domain | 模块 / Module | 数量 / Count | 优先级分布 |
|--------|--------|-------|------------|
| Auth | SSO | 12 | P0×6, P1×4, P2×2 |
| Auth | LDAP | 10 | P0×4, P1×4, P2×2 |
| Auth | Kerberos | 8 | P0×3, P1×3, P2×2 |
| Auth | Zero Trust | 10 | P0×4, P1×4, P2×2 |
| Auth | Session | 8 | P0×4, P1×3, P2×1 |
| Auth | MFA | 6 | P0×2, P1×3, P2×1 |
| Data | Ontology | 10 | P0×4, P1×4, P2×2 |
| Data | Pipeline | 10 | P0×4, P1×4, P2×2 |
| Data | Warehouse | 8 | P0×4, P1×3, P2×1 |
| Data | Tag Platform | 8 | P0×3, P1×3, P2×2 |
| Data | Analytics | 8 | P0×3, P1×3, P2×2 |
| AI | Lifecycle | 8 | P0×3, P1×3, P2×2 |
| AI | Auth | 8 | P0×4, P1×3, P2×1 |
| AI | Data Access | 8 | P0×4, P1×3, P2×1 |
| AI | Safety | 8 | P0×4, P1×3, P2×1 |
| AI | Integration | 8 | P0×4, P1×3, P2×1 |
| | **合计 Total** | **138** | **P0×60, P1×53, P2×25** |

---

## 认证安全 — SSO 测试 (12)

| 编号              | 描述                         | 类型  | 优先级 |
| --------------- | -------------------------- | --- | --- |
| TC-AUTH-SSO-001 | SAML SSO 登录流程正确性           | 功能  | P0  |
| TC-AUTH-SSO-002 | OIDC Authorization Code 流程 | 功能  | P0  |
| TC-AUTH-SSO-003 | SAML Assertion 签名验证        | 安全  | P0  |
| TC-AUTH-SSO-004 | OIDC ID Token 声明验证         | 功能  | P0  |
| TC-AUTH-SSO-005 | SSO 登出（SAML SLO）           | 功能  | P0  |
| TC-AUTH-SSO-006 | OIDC Token 刷新              | 功能  | P0  |
| TC-AUTH-SSO-007 | 多租户 SP 隔离                  | 安全  | P1  |
| TC-AUTH-SSO-008 | 无效 SAML Assertion 拒绝       | 安全  | P1  |
| TC-AUTH-SSO-009 | Token 过期处理                 | 功能  | P1  |
| TC-AUTH-SSO-010 | 并发登录会话管理                   | 功能  | P1  |
| TC-AUTH-SSO-011 | Replay Attack 重放攻击检测       | 安全  | P2  |
| TC-AUTH-SSO-012 | IdP Metadata 解析与验证         | 配置  | P2  |

---

## 认证安全 — LDAP 测试 (10)

| 编号 | 描述 | 类型 | 优先级 |
|------|------|------|--------|
| TC-AUTH-LDAP-001 | Simple Bind 认证成功 | 功能 | P0 |
| TC-AUTH-LDAP-002 | 无效凭据 Bind 拒绝 | 安全 | P0 |
| TC-AUTH-LDAP-003 | 用户搜索（按 UID/邮箱） | 功能 | P0 |
| TC-AUTH-LDAP-004 | LDAP 注入防御 | 安全 | P0 |
| TC-AUTH-LDAP-005 | 组织树查询（OU 遍历） | 功能 | P1 |
| TC-AUTH-LDAP-006 | 用户属性修改 | 功能 | P1 |
| TC-AUTH-LDAP-007 | 分页查询（大结果集） | 功能 | P1 |
| TC-AUTH-LDAP-008 | 连接池管理 | 功能 | P1 |
| TC-AUTH-LDAP-009 | TLS/STARTTLS 连接验证 | 安全 | P2 |
| TC-AUTH-LDAP-010 | Anonymous Bind 限制 | 安全 | P2 |

---

## 认证安全 — Kerberos 测试 (8)

| 编号 | 描述 | 类型 | 优先级 |
|------|------|------|--------|
| TC-AUTH-KRB-001 | TGT 请求与签发 | 功能 | P0 |
| TC-AUTH-KRB-002 | Service Ticket 请求 | 功能 | P0 |
| TC-AUTH-KRB-003 | 票据过期与续期 | 功能 | P0 |
| TC-AUTH-KRB-004 | 重放攻击检测（时间戳校验） | 安全 | P1 |
| TC-AUTH-KRB-005 | 跨域票据授权（cross-realm） | 功能 | P1 |
| TC-AUTH-KRB-006 | 密钥轮换验证 | 安全 | P1 |
| TC-AUTH-KRB-007 | 无效票据拒绝 | 安全 | P2 |
| TC-AUTH-KRB-008 | 票据缓存管理 | 功能 | P2 |

---

## 认证安全 — 零信任测试 (10)

| 编号 | 描述 | 类型 | 优先级 |
|------|------|------|--------|
| TC-AUTH-ZT-001 | 设备态势评估（合规设备） | 功能 | P0 |
| TC-AUTH-ZT-002 | 不合规设备拒绝访问 | 安全 | P0 |
| TC-AUTH-ZT-003 | 上下文感知访问策略 | 功能 | P0 |
| TC-AUTH-ZT-004 | 地理位置异常检测 | 安全 | P0 |
| TC-AUTH-ZT-005 | 时间段访问限制 | 功能 | P1 |
| TC-AUTH-ZT-006 | 网络微分段策略 | 功能 | P1 |
| TC-AUTH-ZT-007 | 风险评分计算 | 功能 | P1 |
| TC-AUTH-ZT-008 | 策略规则优先级冲突处理 | 功能 | P1 |
| TC-AUTH-ZT-009 | 持续验证（会话中重新评估） | 安全 | P2 |
| TC-AUTH-ZT-010 | 策略变更热加载 | 配置 | P2 |

---

## 认证安全 — 会话管理测试 (8)

| 编号 | 描述 | 类型 | 优先级 |
|------|------|------|--------|
| TC-AUTH-SES-001 | 会话创建与存储 | 功能 | P0 |
| TC-AUTH-SES-002 | 会话超时（绝对/空闲） | 功能 | P0 |
| TC-AUTH-SES-003 | Session Fixation 防御 | 安全 | P0 |
| TC-AUTH-SES-004 | 并发会话数限制 | 安全 | P0 |
| TC-AUTH-SES-005 | 会话失效后拒绝请求 | 安全 | P1 |
| TC-AUTH-SES-006 | 跨设备会话管理 | 功能 | P1 |
| TC-AUTH-SES-007 | 会话数据加密存储 | 安全 | P1 |
| TC-AUTH-SES-008 | 会话续期机制 | 功能 | P2 |

---

## 认证安全 — MFA 测试 (6)

| 编号 | 描述 | 类型 | 优先级 |
|------|------|------|--------|
| TC-AUTH-MFA-001 | TOTP 码生成与验证 | 功能 | P0 |
| TC-AUTH-MFA-002 | MFA 注册流程 | 功能 | P0 |
| TC-AUTH-MFA-003 | 无效 TOTP 码拒绝 | 安全 | P1 |
| TC-AUTH-MFA-004 | MFA 绕过检测 | 安全 | P1 |
| TC-AUTH-MFA-005 | 恢复码机制 | 功能 | P1 |
| TC-AUTH-MFA-006 | TOTP 时间窗口容忍 | 功能 | P2 |

---

## 数据平台 — 本体测试 (10)

| 编号 | 描述 | 类型 | 优先级 |
|------|------|------|--------|
| TC-DATA-ONT-001 | 实体创建（学生/课程/院系） | 功能 | P0 |
| TC-DATA-ONT-002 | 关系创建（选修/所属/教授） | 功能 | P0 |
| TC-DATA-ONT-003 | 图遍历（BFS/DFS） | 功能 | P0 |
| TC-DATA-ONT-004 | 路径查询（最短路径） | 功能 | P0 |
| TC-DATA-ONT-005 | 实体更新与删除 | 功能 | P1 |
| TC-DATA-ONT-006 | 关系级联删除 | 功能 | P1 |
| TC-DATA-ONT-007 | 循环检测（防止环形关系） | 安全 | P1 |
| TC-DATA-ONT-008 | Schema 迁移（版本演进） | 功能 | P1 |
| TC-DATA-ONT-009 | 大规模图性能（1000+ 节点） | 性能 | P2 |
| TC-DATA-ONT-010 | 孤立节点检测与清理 | 功能 | P2 |

---

## 数据平台 — 管道测试 (10)

| 编号 | 描述 | 类型 | 优先级 |
|------|------|------|--------|
| TC-DATA-PIP-001 | DAG 定义与拓扑排序 | 功能 | P0 |
| TC-DATA-PIP-002 | 任务顺序执行 | 功能 | P0 |
| TC-DATA-PIP-003 | 任务失败重试 | 功能 | P0 |
| TC-DATA-PIP-004 | 数据血缘记录 | 功能 | P0 |
| TC-DATA-PIP-005 | 并行任务执行 | 功能 | P1 |
| TC-DATA-PIP-006 | 幂等性验证（重复执行） | 安全 | P1 |
| TC-DATA-PIP-007 | 循环依赖检测 | 安全 | P1 |
| TC-DATA-PIP-008 | 任务超时处理 | 功能 | P1 |
| TC-DATA-PIP-009 | 管道暂停与恢复 | 功能 | P2 |
| TC-DATA-PIP-010 | 跨管道依赖 | 功能 | P2 |

---

## 数据平台 — 数仓测试 (8)

| 编号 | 描述 | 类型 | 优先级 |
|------|------|------|--------|
| TC-DATA-WH-001 | 表创建（Schema 定义） | 功能 | P0 |
| TC-DATA-WH-002 | 数据插入与查询 | 功能 | P0 |
| TC-DATA-WH-003 | 行级安全（多租户隔离） | 安全 | P0 |
| TC-DATA-WH-004 | SQL 注入防御 | 安全 | P0 |
| TC-DATA-WH-005 | Schema 变更（ALTER TABLE） | 功能 | P1 |
| TC-DATA-WH-006 | 聚合查询（GROUP BY/HAVING） | 功能 | P1 |
| TC-DATA-WH-007 | 多表联查（JOIN） | 功能 | P1 |
| TC-DATA-WH-008 | 空表/空值边界处理 | 功能 | P2 |

---

## 数据平台 — 标签测试 (8)

| 编号 | 描述 | 类型 | 优先级 |
|------|------|------|--------|
| TC-DATA-TAG-001 | 标签创建与分类 | 功能 | P0 |
| TC-DATA-TAG-002 | 标签附加到实体 | 功能 | P0 |
| TC-DATA-TAG-003 | 标签层级关系（父子标签） | 功能 | P0 |
| TC-DATA-TAG-004 | 按标签查询实体 | 功能 | P1 |
| TC-DATA-TAG-005 | 标签治理（审批流） | 功能 | P1 |
| TC-DATA-TAG-006 | 标签批量操作 | 功能 | P1 |
| TC-DATA-TAG-007 | 重复标签检测 | 安全 | P2 |
| TC-DATA-TAG-008 | 标签删除影响分析 | 功能 | P2 |

---

## 数据平台 — 分析测试 (8)

| 编号 | 描述 | 类型 | 优先级 |
|------|------|------|--------|
| TC-DATA-ANA-001 | 仪表板 API 调用 | 功能 | P0 |
| TC-DATA-ANA-002 | 聚合计算正确性 | 功能 | P0 |
| TC-DATA-ANA-003 | 数据导出（CSV/JSON） | 功能 | P0 |
| TC-DATA-ANA-004 | 时间序列聚合 | 功能 | P1 |
| TC-DATA-ANA-005 | 多维度交叉分析 | 功能 | P1 |
| TC-DATA-ANA-006 | 权限过滤（用户只看授权数据） | 安全 | P1 |
| TC-DATA-ANA-007 | 大数据量分页 | 性能 | P2 |
| TC-DATA-ANA-008 | 空数据集边界处理 | 功能 | P2 |

---

## AI Agent — 生命周期测试 (8)

| 编号 | 描述 | 类型 | 优先级 |
|------|------|------|--------|
| TC-AI-LCY-001 | Agent 创建 | 功能 | P0 |
| TC-AI-LCY-002 | Agent 状态转换（创建→运行→停止） | 功能 | P0 |
| TC-AI-LCY-003 | Agent 删除与清理 | 功能 | P0 |
| TC-AI-LCY-004 | 资源限制（最大并发 Agent 数） | 安全 | P1 |
| TC-AI-LCY-005 | Agent 配置更新 | 功能 | P1 |
| TC-AI-LCY-006 | Agent 异常恢复 | 功能 | P1 |
| TC-AI-LCY-007 | 非法状态转换拒绝 | 安全 | P2 |
| TC-AI-LCY-008 | Agent 超时自动停止 | 功能 | P2 |

---

## AI Agent — 认证上下文测试 (8)

| 编号 | 描述 | 类型 | 优先级 |
|------|------|------|--------|
| TC-AI-AUTH-001 | Agent 继承用户 SSO Token | 功能 | P0 |
| TC-AI-AUTH-002 | Agent 权限不超过用户权限 | 安全 | P0 |
| TC-AI-AUTH-003 | 权限提升攻击防御 | 安全 | P0 |
| TC-AI-AUTH-004 | Token 过期后 Agent 操作拒绝 | 安全 | P0 |
| TC-AI-AUTH-005 | 多角色用户权限合并 | 功能 | P1 |
| TC-AI-AUTH-006 | 权限上下文传递（Agent→子服务） | 功能 | P1 |
| TC-AI-AUTH-007 | 匿名用户 Agent 限制 | 安全 | P1 |
| TC-AI-AUTH-008 | 权限缓存一致性 | 功能 | P2 |

---

## AI Agent — 数据访问测试 (8)

| 编号 | 描述 | 类型 | 优先级 |
|------|------|------|--------|
| TC-AI-DAT-001 | 权限范围内数据查询 | 功能 | P0 |
| TC-AI-DAT-002 | 越权查询拒绝 | 安全 | P0 |
| TC-AI-DAT-003 | PII 自动脱敏 | 安全 | P0 |
| TC-AI-DAT-004 | 数据检索结果准确性 | 功能 | P0 |
| TC-AI-DAT-005 | 多数据源聚合查询 | 功能 | P1 |
| TC-AI-DAT-006 | 查询结果缓存 | 功能 | P1 |
| TC-AI-DAT-007 | 数据访问审计记录 | 安全 | P1 |
| TC-AI-DAT-008 | 大结果集截断处理 | 功能 | P2 |

---

## AI Agent — 安全护栏测试 (8)

| 编号 | 描述 | 类型 | 优先级 |
|------|------|------|--------|
| TC-AI-SAF-001 | Prompt 注入检测（直接注入） | 安全 | P0 |
| TC-AI-SAF-002 | Prompt 注入检测（间接注入） | 安全 | P0 |
| TC-AI-SAF-003 | 系统提示词泄漏防御 | 安全 | P0 |
| TC-AI-SAF-004 | 幻觉检测（事实核查） | 安全 | P0 |
| TC-AI-SAF-005 | 敏感输出过滤 | 安全 | P1 |
| TC-AI-SAF-006 | 操作审计日志完整性 | 功能 | P1 |
| TC-AI-SAF-007 | 速率限制（防滥用） | 安全 | P1 |
| TC-AI-SAF-008 | 安全事件告警 | 功能 | P2 |

---

## AI Agent — E2E 集成测试 (8)

| 编号 | 描述 | 类型 | 优先级 |
|------|------|------|--------|
| TC-AI-INT-001 | 完整链路：登录→Agent→查询→响应 | E2E | P0 |
| TC-AI-INT-002 | 学生查成绩 E2E（权限范围） | E2E | P0 |
| TC-AI-INT-003 | 教师查班级数据 E2E（行级安全） | E2E | P0 |
| TC-AI-INT-004 | 攻击链路：注入→权限提升→数据泄漏 | E2E | P0 |
| TC-AI-INT-005 | 认证服务故障时 Agent 降级 | E2E | P1 |
| TC-AI-INT-006 | 数据服务故障时 Agent 降级 | E2E | P1 |
| TC-AI-INT-007 | 并发用户 Agent 隔离 | E2E | P1 |
| TC-AI-INT-008 | 全链路审计日志验证 | E2E | P2 |

---

## 优先级说明 / Priority

| 优先级 | 说明 | 数量 |
|--------|------|------|
| P0 | 核心功能 + 安全，必须通过 | 60 |
| P1 | 重要功能，应该通过 | 53 |
| P2 | 增强功能，可选通过 | 25 |

## 执行命令 / Commands

```bash
# 激活虚拟环境
python3 -m venv venv
source venv/bin/activate

# 运行所有测试
pytest tests/ -v

# 按领域运行
pytest tests/test_auth/ -v          # 认证 (54)
pytest tests/test_data/ -v          # 数据 (44)
pytest tests/test_ai/ -v            # AI Agent (40)

# 按优先级运行
pytest tests/ -v -m P0              # 核心用例 (60)
pytest tests/ -v -m "P0 or P1"     # 核心 + 重要 (113)

# 按类型运行
pytest tests/ -v -m integration     # 集成测试
pytest tests/ -v -m security        # 安全测试

# 覆盖率
pytest tests/ --cov=src --cov-report=html
```

---

*文档版本: 1.0*
