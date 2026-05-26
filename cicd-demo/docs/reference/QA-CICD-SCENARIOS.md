# QA Scenarios in CI/CD Pipelines

在 CI/CD 流水线中，QA 的价值不是“最后上线前测一下”，而是把质量检查拆成一组可执行的场景卡片：什么时候触发、用什么工具、失败时如何处理、产出什么证据。本文档按实际应用场景组织，便于直接映射到 GitHub Actions、Azure Pipelines、GitLab CI 或 Jenkins。

## 如何使用本文档

| 用法 | 说明 |
|------|------|
| 设计流水线 | 从“最小可落地版本”开始，先做 PR 门禁、自动化回归、安全扫描和产物归档。 |
| 评审现有流水线 | 逐项检查每个场景是否有触发条件、质量门禁、失败处理和证据产物。 |
| 面试或项目讲解 | 先讲场景目标，再讲工具选择，最后讲失败后的工程闭环。 |
| 企业落地 | 根据系统风险分级选择场景，不必一次性实现全部高级能力。 |

---

## 场景 1：PR 准入门禁（Pull Request Quality Gate）

**适用时机**：开发提交 PR、合并到 `main` 前。

| 项目 | 操作建议 |
|------|----------|
| 推荐工具 | GitHub branch protection、Azure DevOps Branch Policies、ESLint、SonarQube、npm audit、Trivy、CodeQL |
| 质量门禁 | Lint 通过；关键测试通过；无 Critical/High 漏洞；至少 1 人 review；不能绕过必需检查 |
| 输出产物 | PR checks、review comments、SARIF 报告、测试摘要、构建日志 |
| 失败处理 | 阻止合并；把失败原因定位到具体规则、测试或漏洞；修复后重新触发 PR 检查 |
| Demo 映射 | `cicd-demo-pr.yml`（lint + unit tests + Docker build + 安全扫描）、`security-scan.yml`、`codeql-analysis.yml` |

**重点**：PR 门禁是最早、最便宜的质量控制点。不要把所有问题留到 staging 或生产前才发现。

## 场景 2：快速 CI 反馈（Fast Feedback Pipeline）

**适用时机**：每次 push、PR 更新、开发自测。

| 项目 | 操作建议 |
|------|----------|
| 推荐工具 | npm scripts、ESLint、pytest/JUnit/Jest、Cypress component test、GitHub Actions matrix |
| 质量门禁 | 安装依赖可复现；静态检查通过；快速测试在几分钟内完成；失败时能明确指出责任模块 |
| 输出产物 | 控制台日志、JUnit XML、coverage report、失败截图或短视频 |
| 失败处理 | 优先修复快速反馈失败；不要继续触发重型 E2E 或部署阶段 |
| Demo 映射 | `npm run lint`、`npm test`、`npm run test:cypress`、`npm run test:newman` |

**执行原则**：快速 CI 不追求覆盖所有风险，而是尽快发现明显问题，避免浪费后续环境和人力。

## 场景 3：容器化回归测试（Containerized Regression）

**适用时机**：夜间回归、手动演示、发布候选版本验证。

| 项目 | 操作建议 |
|------|----------|
| 推荐工具 | Docker Compose、Cypress、Newman、Playwright、JUnit reporter、HTML reporter |
| 质量门禁 | 容器可重复构建；测试容器完整执行；核心 API/UI 用例全部通过；失败时保留证据 |
| 输出产物 | Cypress videos/screenshots、Newman HTML report、JUnit XML、Docker logs |
| 失败处理 | 下载 artifact；先判断是环境问题、测试数据问题还是产品缺陷；必要时隔离 flaky case |
| Demo 映射 | `docker-tests.yml`、`docker-compose.yml`、`Dockerfile.newman`、Cypress + Newman artifacts |

**重点**：容器化的目标是减少“本地能过、CI 失败”的环境差异，让测试结果更可信。

## 场景 4：API、契约与集成验证（API / Contract / Integration）

**适用时机**：后端接口变更、微服务依赖变更、第三方 API 升级。

| 项目 | 操作建议 |
|------|----------|
| 推荐工具 | Postman/Newman、REST Assured、Karate、Pact、Spring Cloud Contract、WireMock |
| 质量门禁 | API 状态码、响应结构、关键字段、错误处理、向后兼容性通过；契约不破坏消费者 |
| 输出产物 | Newman HTML/JUnit 报告、contract verification report、mock server logs |
| 失败处理 | 若是 API 行为变更，先确认是否 breaking change；同步更新契约、消费者测试和版本说明 |
| Demo 映射 | `postman/api-collection.json`、`postman/environment.json`、`npm run test:newman` |

**重点**：API 自动化测试验证“接口是否工作”，契约测试验证“服务之间是否还能协作”，两者不要混为一谈。

## 场景 5：安全与供应链扫描（Security and Supply Chain）

**适用时机**：PR、push、每日定时扫描、发布前安全检查。

| 项目 | 操作建议 |
|------|----------|
| 推荐工具 | npm audit、Trivy、CodeQL、OWASP Dependency-Check、GitHub Security、SBOM 工具 |
| 质量门禁 | 无 Critical/High 漏洞；无明文密钥；镜像基础层无高危漏洞；IaC 无高危错误配置 |
| 输出产物 | SARIF、JSON 扫描结果、安全摘要、SBOM、忽略项说明 |
| 失败处理 | Critical/High 默认阻断；无法立即修复时必须记录风险接受理由、负责人和过期时间 |
| Demo 映射 | `security-scan.yml`（Trivy/npm audit）、`codeql-analysis.yml`（代码语义 SAST）、`npm run security:audit`、`npm run security:scan`、`security/trivy-config.yaml` |

**重点**：安全扫描不是只在上线前跑一次。依赖漏洞会在代码不变的情况下新披露，所以需要定时扫描。

## 场景 6：IaC、Kubernetes 与 Helm 配置校验

**适用时机**：Terraform、Kubernetes manifest、Helm chart、环境配置变更。

| 项目 | 操作建议 |
|------|----------|
| 推荐工具 | `terraform fmt/validate/plan`、`helm lint/template`、`kubectl dry-run`、kubeconform、Trivy config |
| 质量门禁 | Terraform plan 可解释；Helm 模板可渲染；K8s 资源符合 schema；没有高危权限或网络暴露 |
| 输出产物 | Terraform plan、Helm rendered manifests、IaC scan report、dry-run logs |
| 失败处理 | 阻止部署；先修复配置或权限问题；对环境差异明确记录在 values/tfvars 中 |
| Demo 映射 | `terraform/`、`k8s/`、`helm/qa-portfolio/`、`security/trivy-config.yaml` |

**重点**：基础设施代码也需要 QA。配置错误造成的事故不一定比代码缺陷更小。

## 场景 7：部署前验证（Pre-deployment Verification）

**适用时机**：部署到 dev、staging、production 前。

| 项目 | 操作建议 |
|------|----------|
| 推荐工具 | environment checks、manual approval、smoke tests、health checks、deployment checklist |
| 质量门禁 | 目标环境可用；配置完整；依赖服务连通；数据库迁移脚本已验证；关键 smoke test 通过 |
| 输出产物 | 环境检查日志、部署摘要、approval record、smoke test report |
| 失败处理 | 停止部署；明确是环境、配置、依赖还是版本问题；修复后重新执行部署前验证 |
| Demo 映射 | `scripts/validate-environment.sh`、`cicd-demo-deploy.yml`（staging auto-deploy + production 手动审批） |

**重点**：部署前验证关注“是否可以安全部署”，不是重复执行完整回归。

## 场景 8：发布、灰度与回滚验证（Release and Rollback）

**适用时机**：staging 验证通过后、生产发布、灰度放量、紧急回滚。

| 项目 | 操作建议 |
|------|----------|
| 推荐工具 | Helm rollback、ArgoCD sync/rollback、blue-green、canary、feature flags、synthetic probes |
| 质量门禁 | 新版本健康检查通过；错误率和延迟不劣化；核心业务探针通过；回滚路径已验证 |
| 输出产物 | release notes、deployment history、ArgoCD sync status、rollback test result、canary metrics |
| 失败处理 | 自动或手动回滚；冻结继续放量；保留现场指标和日志用于 RCA |
| Demo 映射 | `helm/qa-portfolio/`、`gitops/argocd/`、`scripts/deploy-helm.sh` |

**重点**：发布验证必须包含“失败后怎么退回去”。只有部署成功，没有回滚验证，闭环是不完整的。

## 场景 9：生产质量反馈（Runtime Quality Feedback）

**适用时机**：生产运行期间、发布后观察窗口、SLO/SLA 评审。

| 项目 | 操作建议 |
|------|----------|
| 推荐工具 | Prometheus、Grafana、AlertManager、Sentry、ELK/Loki、synthetic monitoring |
| 质量门禁 | 错误率、延迟、可用性、资源使用率符合 SLO；关键告警可触发；仪表盘可定位问题 |
| 输出产物 | Grafana dashboard、alert history、incident timeline、postmortem/RCA |
| 失败处理 | 触发告警；评估是否回滚；记录事故时间线、根因、修复项和预防措施 |
| Demo 映射 | `monitoring/`、`monitoring/MONITORING.md`、Grafana dashboards、Prometheus values |

**重点**：生产监控不是运维附属品，而是 CI/CD 质量闭环的最后一环。运行时数据应反向影响测试策略和发布门禁。

## 场景 10：Flaky Test 治理（Flaky Test Governance）

**适用时机**：CI 出现不稳定失败、测试可信度下降、发布决策受干扰时。

| 项目 | 操作建议 |
|------|----------|
| 推荐工具 | Cypress `retries`、Jest `--testRetry`、GitHub Actions `retry-action`、自建 flaky tracker |
| 质量门禁 | Flaky rate < 2%；隔离区 case 不阻断主干；有 owner 和修复 SLA |
| 输出产物 | Flaky 清单（test name + 失败频率 + 负责人）、修复 PR、隔离标记 |
| 失败处理 | 标记为 flaky → 隔离 → 分配 owner → 48h 内修复或删除；不允许长期保留不稳定 case |
| Demo 映射 | Cypress `retries` 配置、Jest `--testRetry`、`cicd-demo-pr.yml` quality-gate job |

**重点**：Flaky test 的危害不在于失败本身，而在于团队开始忽略失败。治理的核心是"让 CI 重新可信"。

## 场景 11：测试数据管理（Test Data Management）

**适用时机**：多环境测试、敏感数据处理、测试隔离需求。

| 项目 | 操作建议 |
|------|----------|
| 推荐工具 | Faker.js / factory_boy、数据库 seeding 脚本、LocalStack（AWS 模拟）、数据脱敏工具 |
| 质量门禁 | 测试数据不含真实生产 PII；环境间数据隔离；每次 run 前可复现初始状态 |
| 输出产物 | seed 脚本、数据工厂配置、脱敏策略文档、环境变量清单 |
| 失败处理 | 数据污染时先隔离环境；回溯最后一次干净 seed；分析是测试数据问题还是产品缺陷 |
| Demo 映射 | `docker-compose.localstack.yml`（LocalStack AWS 模拟）、`postman/environment.json` |

**重点**：测试数据问题是"测试不可靠"的头号根因。好的测试数据策略让失败可复现、让 CI 可信赖。

---

## 最小可落地版本（MVP）

如果团队刚开始建设 CI/CD QA，建议先实现以下 5 项：

| 顺序 | 场景 | 最小实现 |
|------|------|----------|
| 1 | PR 准入门禁 | PR 上自动运行 lint、关键测试和安全扫描，失败阻止合并 |
| 2 | 快速 CI 反馈 | 每次 push 在 5-10 分钟内给出明确结果 |
| 3 | 容器化回归测试 | 每晚或手动运行 Cypress/Newman，并上传报告和视频 |
| 4 | 安全扫描 | npm audit + Trivy，Critical/High 漏洞阻断 |
| 5 | 产物归档 | 保存 JUnit、HTML report、截图、视频、扫描结果，便于追溯 |

## 企业级扩展路线

| 阶段 | 扩展能力 | 适用条件 |
|------|----------|----------|
| 基础阶段 | Lint、单元测试、API 测试、安全扫描、artifact 上传 | 单团队或小型项目 |
| 标准阶段 | 覆盖率门禁、契约测试、IaC 校验、staging smoke test、手动审批 | 多服务、多环境项目 |
| 成熟阶段 | 灰度发布、自动回滚、SLO 门禁、flaky test 治理、测试数据管理、测试趋势分析 | 高频发布或关键业务系统 |
| 高级阶段 | 混沌工程、性能基线自动比较、SBOM、镜像签名、策略即代码、合规审计追踪 | 企业级平台或强合规场景 |

## 评审清单

| 检查点 | 判断标准 |
|--------|----------|
| 触发条件清晰 | 知道每个检查是在 PR、push、schedule、manual 还是 deploy 时运行 |
| 门禁可量化 | 有明确 pass/fail 条件，而不是“看情况” |
| 失败可定位 | 日志、报告、截图、视频或扫描结果足以定位问题 |
| 产物可追溯 | 每次 pipeline run 都能找到对应测试和安全证据 |
| 风险有闭环 | 失败后有修复、豁免、回滚或 RCA 流程 |
| 与项目匹配 | 不是堆工具，而是覆盖当前系统最重要的风险 |

CI/CD QA 的成熟度不取决于工具数量，而取决于是否能在正确时机发现风险、阻断错误变更，并留下可追溯的质量证据。

## 常见反模式

| 反模式 | 危害 | 替代方案 |
|--------|------|----------|
| 只有 E2E，没有单元和 API 测试 | E2E 慢、脆、定位难；失败时不知道哪层出问题 | 遵循测试金字塔，E2E 只覆盖核心路径 |
| `continue-on-error: true` 或 `\|\| true` 掩盖失败 | CI 永远绿灯，质量数据失真 | 只在真正可选步骤上用；核心 job 必须真实失败 |
| 测试 flaky 但不处理，靠重试掩盖 | 团队开始忽略失败；CI 可信度崩塌 | 建立 Flaky Test 治理（场景 10）|
| 所有检查都在上线前运行 | 反馈周期太长；修复成本高 | 按触发时机分层（PR gate → commit → nightly → deploy）|
| 安全扫描只在发布前跑一次 | 依赖漏洞在代码不变时新披露，发现滞后 | PR + 每日定时扫描双轨 |
| 手动测试结果靠截图记录 | 不可重现、无法趋势分析、审计困难 | 自动化测试 + artifact 归档 + 结构化报告 |
| 把所有问题推给 staging 环境 | staging 成为瓶颈；问题积压 | PR gate 拦截明显问题；staging 专注集成验证 |
