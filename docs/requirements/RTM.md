# Requirements Traceability Matrix (RTM)

> 需求可追溯性矩阵 — 从需求到测试用例、工作流、缺陷的双向追溯

**项目：** michael-zhou-qa-portfolio  
**版本：** v1.0  
**更新日期：** 2026-05-24  
**维护人：** Michael Zhou

---

## 需求编号规范

```
[需求类型] - [模块] - [序号]

需求类型：
  FR  = Functional Requirement（功能需求）
  NFR = Non-Functional Requirement（非功能需求）

模块：
  CICD  = CI/CD Pipeline
  TEST  = Test Automation
  SEC   = Security
  INFRA = Infrastructure
  MON   = Monitoring
  OBS   = Observability

序号：3位流水号，如 001、002
```

**示例：** `FR-CICD-001`、`NFR-SEC-001`

---

## 1. 功能需求（FR）

### FR-CICD — CI/CD Pipeline

| 需求编号 | 需求描述 | 优先级 | Issue | 状态 | 测试用例 | Workflow | 备注 |
|----------|----------|--------|-------|------|----------|----------|------|
| FR-CICD-001 | 创建 PR trigger pipeline（`on: pull_request`） | P1 | [#242](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/242) | ❌ 未实现 | — | — | 缺独立 pr-pipeline.yml |
| FR-CICD-002 | PR pipeline 包含 lint、unit test、build、security scan | P1 | [#242](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/242) | ❌ 未实现 | — | — | 现有仅 security scan |
| FR-CICD-003 | Merge 后触发 deploy pipeline（`on: push to main`） | P1 | [#242](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/242) | ❌ 未实现 | — | — | 无 deploy.yml |
| FR-CICD-004 | Branch protection rule：PR 通过才允许 merge | P1 | [#242](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/242) | ❌ 未实现 | — | — | 需在 GitHub Settings 配置 |
| FR-CICD-005 | README 补充 PR→Merge→Deploy 流程图 | P2 | [#242](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/242) | ⚠️ 部分 | — | — | 有架构说明，缺流程图 |

### FR-TEST — Test Automation

| 需求编号 | 需求描述 | 优先级 | Issue | 状态 | 测试用例 | Workflow | 备注 |
|----------|----------|--------|-------|------|----------|----------|------|
| FR-TEST-001 | Cypress E2E 测试覆盖 API 端点 | P1 | — | ✅ 完成 | TC-01-001 ~ TC-01-007 | docker-tests.yml | 7个 API 测试 |
| FR-TEST-002 | Cypress UI 测试覆盖页面加载、链接、响应式 | P1 | — | ✅ 完成 | TC-02-001 ~ TC-02-009 | docker-tests.yml | 9个 UI 测试 |
| FR-TEST-003 | Newman API 测试覆盖 CRUD + 错误处理 | P1 | — | ✅ 完成 | TC-API-001 ~ TC-API-007 | docker-tests.yml | 18个断言 |
| FR-TEST-004 | 测试产物保留（截图、视频、报告） | P2 | — | ✅ 完成 | — | docker-tests.yml | 7天/30天 retention |

### FR-INFRA — Infrastructure

| 需求编号 | 需求描述 | 优先级 | Issue | 状态 | 测试用例 | Workflow | 备注 |
|----------|----------|--------|-------|------|----------|----------|------|
| FR-INFRA-001 | Terraform 管理 S3、DynamoDB（3个环境） | P1 | — | ✅ 完成 | — | — | dev/staging/production |
| FR-INFRA-002 | Kubernetes 12个资源清单部署（k3d） | P1 | — | ✅ 完成 | — | — | namespace 隔离 |
| FR-INFRA-003 | Helm Chart 参数化多环境部署 | P1 | — | ✅ 完成 | — | — | 8个模板文件 |
| FR-INFRA-004 | ArgoCD GitOps 自动同步（dev）/ 手动（staging） | P1 | — | ✅ 完成 | — | — | 自愈功能已启用 |

### FR-MON — Monitoring

| 需求编号 | 需求描述 | 优先级 | Issue | 状态 | 测试用例 | Workflow | 备注 |
|----------|----------|--------|-------|------|----------|----------|------|
| FR-MON-001 | Prometheus 指标采集 | P1 | — | ✅ 完成 | — | — | 7天保留，10Gi 存储 |
| FR-MON-002 | Grafana 仪表盘（集群概览 + 测试指标） | P1 | — | ✅ 完成 | — | — | 2个 Dashboard，14个面板 |
| FR-MON-003 | AlertManager 告警集成（Slack/PagerDuty） | P2 | — | ⚠️ 部分 | — | — | 已安装，未配置 receiver |

---

## 2. 非功能需求（NFR）

### NFR-SEC — Security

| 需求编号 | 需求描述 | 优先级 | Issue | 状态 | 测试用例 | Workflow | 备注 |
|----------|----------|--------|-------|------|----------|----------|------|
| NFR-SEC-001 | npm 依赖漏洞扫描（Moderate 级别阻断） | P1 | — | ✅ 完成 | — | security-scan.yml | npm audit |
| NFR-SEC-002 | 文件系统漏洞扫描（Trivy fs） | P1 | — | ✅ 完成 | — | security-scan.yml | CRITICAL gate |
| NFR-SEC-003 | 容器镜像漏洞扫描（Trivy image） | P1 | — | ✅ 完成 | — | security-scan.yml | SARIF → GitHub Security |
| NFR-SEC-004 | IaC 配置扫描（Trivy config，Terraform+K8s） | P1 | — | ✅ 完成 | — | security-scan.yml | CRITICAL gate |
| NFR-SEC-005 | Pre-commit hook 阻止不合规提交 | P2 | — | ✅ 完成 | — | — | Husky |

### NFR-OBS — Observability

| 需求编号 | 需求描述 | 优先级 | Issue | 状态 | 测试用例 | Workflow | 备注 |
|----------|----------|--------|-------|------|----------|----------|------|
| NFR-OBS-001 | 测试执行时间 < 30 分钟 | P1 | — | ✅ 完成 | — | docker-tests.yml | 实际 ~17s |
| NFR-OBS-002 | 日志聚合（Loki + Promtail） | P2 | — | ❌ 未实现 | — | — | Phase 2 规划中 |
| NFR-OBS-003 | 分布式追踪（Jaeger/Zipkin） | P3 | — | ❌ 未实现 | — | — | Phase 2 规划中 |

### NFR-PORT — Portfolio 仓库治理

| 需求编号 | 需求描述 | 优先级 | Issue | 状态 | 测试用例 | Workflow | 备注 |
|----------|----------|--------|-------|------|----------|----------|------|
| NFR-PORT-001 | README/CLAUDE.md workflow 引用必须与实际文件一致 | P1 | [#428](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/428) | ❌ 未实现 | — | — | 3个 workflow 不存在 |
| NFR-PORT-002 | CI workflow 必须配置 path filter，避免无关变更触发 | P1 | [#429](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/429) | ❌ 未实现 | — | repo-meta-ci.yml | 见 PREQ-001 扩展 |
| NFR-PORT-003 | CLAUDE.md 分支/状态信息必须与 git 实际状态一致 | P2 | [#430](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/430) | ❌ 未实现 | — | — | 9个已合并分支仍列在表中 |
| NFR-PORT-004 | commit-guard.yml 应过滤纯文档变更 | P2 | [#431](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/431) | ❌ 未实现 | — | commit-guard.yml | — |
| NFR-PORT-005 | CodeQL 分析应配置合理超时和缓存策略 | P1 | [#432](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/432) | ❌ 未实现 | — | codeql-analysis.yml | 当前 30min 无缓存 |
| NFR-PORT-006 | Dependabot 必须覆盖所有生态（含 Python pip） | P1 | [#433](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/433) | ❌ 未实现 | — | dependabot.yml | 7个 requirements.txt 未覆盖 |
| NFR-PORT-007 | 禁用的 workflow 应及时清理或重新启用 | P2 | [#434](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/434) | ❌ 未实现 | — | claude-code-review.yml | 禁用 >3个月 |

---

## 3. 测试用例清单

### Cypress E2E Tests

| 测试用例 ID | 测试名称 | 类型 | 关联需求 | 状态 |
|-------------|----------|------|----------|------|
| TC-01-001 | should retrieve all users | API | FR-TEST-001 | ✅ Pass |
| TC-01-002 | should retrieve a specific user by ID | API | FR-TEST-001 | ✅ Pass |
| TC-01-003 | should retrieve posts for a specific user | API | FR-TEST-001 | ✅ Pass |
| TC-01-004 | should create a new post | API | FR-TEST-001 | ✅ Pass |
| TC-01-005 | should update an existing post | API | FR-TEST-001 | ✅ Pass |
| TC-01-006 | should delete a post | API | FR-TEST-001 | ✅ Pass |
| TC-01-007 | should handle 404 for non-existent resource | API | FR-TEST-001 | ✅ Pass |
| TC-02-001 | should load the homepage successfully | UI | FR-TEST-002 | ✅ Pass |
| TC-02-002 | should have proper meta tags | UI | FR-TEST-002 | ✅ Pass |
| TC-02-003 | should have a working "Learn more" link | UI | FR-TEST-002 | ✅ Pass |
| TC-02-004 | should render correctly on mobile | Responsive | FR-TEST-002 | ✅ Pass |
| TC-02-005 | should render correctly on tablet | Responsive | FR-TEST-002 | ✅ Pass |
| TC-02-006 | should render correctly on desktop | Responsive | FR-TEST-002 | ✅ Pass |
| TC-02-007 | should load the page within acceptable time | Performance | FR-TEST-002, NFR-OBS-001 | ✅ Pass |
| TC-02-008 | should handle slow network conditions | Network | FR-TEST-002 | ✅ Pass |
| TC-02-009 | should demonstrate reusable test patterns | Pattern | FR-TEST-002 | ✅ Pass |

### Newman / Postman API Tests

| 测试用例 ID | 请求名称 | 断言数 | 关联需求 | 状态 |
|-------------|----------|--------|----------|------|
| TC-API-001 | Get All Users | 5 | FR-TEST-003 | ✅ Pass |
| TC-API-002 | Get User By ID | 3 | FR-TEST-003 | ✅ Pass |
| TC-API-003 | Get All Posts | 2 | FR-TEST-003 | ✅ Pass |
| TC-API-004 | Create New Post | 4 | FR-TEST-003 | ✅ Pass |
| TC-API-005 | Update Post | 2 | FR-TEST-003 | ✅ Pass |
| TC-API-006 | Delete Post | 1 | FR-TEST-003 | ✅ Pass |
| TC-API-007 | Test 404 Not Found | 2 | FR-TEST-003 | ✅ Pass |

---

## 4. 覆盖度汇总

| 模块 | 总需求数 | ✅ 完成 | ⚠️ 部分 | ❌ 未实现 | 覆盖率 |
|------|---------|--------|--------|---------|--------|
| FR-CICD | 5 | 0 | 1 | 4 | 0% |
| FR-TEST | 4 | 4 | 0 | 0 | 100% |
| FR-INFRA | 4 | 4 | 0 | 0 | 100% |
| FR-MON | 3 | 2 | 1 | 0 | 67% |
| NFR-SEC | 5 | 5 | 0 | 0 | 100% |
| NFR-OBS | 3 | 1 | 0 | 2 | 33% |
| **合计** | **24** | **16** | **2** | **6** | **67%** |

---

## 5. 变更记录

| 版本 | 日期 | 变更内容 | 变更人 |
|------|------|----------|--------|
| v1.0 | 2026-05-24 | 初版创建，覆盖 Phase 1 完整需求及 Issue #242 缺口分析 | Michael Zhou |

---

> **说明：** 本文档应随每次 Issue 创建/关闭、PR 合并、测试用例新增同步更新。
