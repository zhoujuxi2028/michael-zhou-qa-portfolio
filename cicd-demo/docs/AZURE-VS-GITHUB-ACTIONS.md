# Azure Pipelines vs GitHub Actions — FAQ

> 基于本项目 `pipeline.yml` → `azure-pipelines.yml` 的实际翻译经验总结。

## 1. Pipeline 概念对比

| 概念 | GitHub Actions | Azure Pipelines | 备注 |
|------|---------------|-----------------|------|
| 配置文件 | `.github/workflows/*.yml` | `azure-pipelines.yml` | Azure 默认单文件，可用 `extends` 拆分 |
| 触发器 | `on: push/pull_request` | `trigger:` / `pr:` | 路径过滤语法一致 |
| 手动触发 | `workflow_dispatch` + `inputs` | `parameters:` | Azure 参数类型更丰富（object, step list） |
| 并发控制 | `concurrency: group + cancel-in-progress` | Environment Exclusive Lock | Azure 在环境级别控制，非流水线级别 |
| 层级结构 | `jobs:` (flat) | `stages: > jobs: > steps:` | Azure 显式 stage 层级，可视化更清晰 |
| 依赖关系 | `needs:` | `dependsOn:` | 都是 DAG 拓扑 |
| Runner | `runs-on: ubuntu-latest` | `pool: vmImage: 'ubuntu-latest'` | 都支持自托管 Runner/Agent |
| 条件执行 | `if: ${{ expression }}` | `condition: expression` | Azure 用 `eq()`/`ne()`/`and()`/`or()` 函数 |
| 复用 | Reusable Workflows / Composite Actions | Templates (`extends`, `template`) | Azure 模板更灵活，支持参数化 stage/job/step |
| 矩阵构建 | `strategy.matrix` | `strategy.matrix` | 语法略不同，功能一致 |

## 2. 环境与审批

| 功能 | GitHub Actions | Azure Pipelines |
|------|---------------|-----------------|
| 环境定义 | Settings → Environments | Pipelines → Environments |
| 审批门 | Environment protection rules | Approvals & Checks (更丰富) |
| 审批选项 | Required reviewers | Approvals, Business Hours, Exclusive Lock, Template Check, Branch Control |
| 部署 Job | 普通 `job` + `environment:` | `deployment` job（专用类型） |
| 部署策略 | 无内置 | `runOnce` / `rolling` / `canary` |
| 部署历史 | Environment → Deployments | Environment → 完整部署历史 + 资源追踪 |

## 3. 变量与密钥

| 功能 | GitHub Actions | Azure Pipelines |
|------|---------------|-----------------|
| 密钥存储 | Repository/Org Secrets | Variable Groups (可连 Key Vault) |
| 密钥轮换 | 手动更新 | Key Vault 自动轮换 |
| 引用语法 | `${{ secrets.NAME }}` | `$(variableName)` |
| 环境变量 | `env:` at job/step | `variables:` at pipeline/stage/job |
| 输出传递 | `$GITHUB_OUTPUT` + `needs.job.outputs` | `##vso[task.setvariable]` + `dependencies.job.outputs` |
| 运行时变量 | 不支持 | `##vso[task.setvariable variable=x]isOutput=true` |

## 4. 产物与测试

| 功能 | GitHub Actions | Azure Pipelines |
|------|---------------|-----------------|
| 上传产物 | `actions/upload-artifact@v4` | `PublishPipelineArtifact@1` |
| 测试报告 | 第三方 Action | 内置 `PublishTestResults@2`（Test Tab） |
| 代码覆盖率 | 第三方 Action | 内置 `PublishCodeCoverageResults@2` |
| 产物保留 | `retention-days` 参数 | Retention Policy（项目级别） |
| SARIF 上传 | `github/codeql-action/upload-sarif` | 无原生等价（用第三方扩展） |

## 5. YAML 语法对比

### 触发器

```yaml
# GitHub Actions                    # Azure Pipelines
on:                                  trigger:
  push:                                branches:
    branches: [main]                     include: [main]
    paths: ['cicd-demo/**']            paths:
                                         include: ['cicd-demo/**']
```

### Job 定义

```yaml
# GitHub Actions                    # Azure Pipelines
jobs:                                stages:
  build:                               - stage: Build
    runs-on: ubuntu-latest               jobs:
    needs: lint                            - job: BuildJob
    steps:                                   pool:
      - uses: actions/checkout@v4              vmImage: 'ubuntu-latest'
      - run: npm ci                        dependsOn: Lint
                                           steps:
                                             - checkout: self
                                             - script: npm ci
```

### 条件执行

```yaml
# GitHub Actions                    # Azure Pipelines
if: ${{ always() }}                  condition: always()
if: ${{ failure() }}                 condition: failed()
if: ${{ success() }}                 condition: succeeded()
if: ${{ github.ref == '...' }}       condition: eq(variables['Build.SourceBranch'], '...')
```

### 产物上传

```yaml
# GitHub Actions                    # Azure Pipelines
- uses: actions/upload-artifact@v4   - task: PublishPipelineArtifact@1
  with:                                inputs:
    name: my-artifact                    artifactName: 'my-artifact'
    path: ./dist                         targetPath: ./dist
    retention-days: 14
```

### 部署 Job

```yaml
# GitHub Actions                    # Azure Pipelines
deploy:                              - stage: Deploy
  runs-on: ubuntu-latest               jobs:
  needs: test                            - deployment: DeployJob
  environment: dev                         environment: 'dev'
  steps:                                   strategy:
    - run: echo "deploying"                  runOnce:
                                               deploy:
                                                 steps:
                                                   - script: echo "deploying"
```

## 6. Azure DevOps 独有功能

| 功能 | 说明 | GitHub 对应 |
|------|------|------------|
| **Boards** | 工作项跟踪（Agile/Scrum/CMMI） | GitHub Issues + Projects |
| **Test Plans** | 手动测试管理、测试套件 | 无原生等价 |
| **Artifacts Feeds** | NuGet/npm/Maven/Python 私有仓库 | GitHub Packages |
| **Service Connections** | 连接 Azure/AWS/Docker Registry/K8s | Secrets + 第三方 Action |
| **Deployment Groups** | 物理机/VM 部署代理 | 无等价（需自建） |
| **Release Pipelines (Classic)** | GUI 拖拽式发布管道 | 无等价 |
| **Gates** | 部署前自动检查（Azure Monitor, REST API） | 无原生等价 |
| **YAML Templates** | 参数化复用 stage/job/step | Reusable Workflows（较弱） |
| **Environments 资源** | 追踪 K8s namespace, VM 资源 | 仅记录部署历史 |

## 7. FAQ

### Q: 两个平台核心概念能 1:1 映射吗？

> 可以。stages/jobs/steps、environment gates、artifact publishing 都能直接翻译（见本项目 `pipeline.yml` → `azure-pipelines.yml`），迁移成本很低。

### Q: 两个平台怎么选？

> 如果团队已经在 Azure 生态（Azure AD、Key Vault、Boards），选 Azure DevOps 可以获得更完整的 ALM 体验。如果是开源项目或 GitHub 原生团队，GitHub Actions 的社区 Action 生态更丰富。

### Q: Azure DevOps 有什么 GitHub Actions 没有的？

> 三点：一是 Environments 的 Approvals & Checks 更细粒度，支持工作时间限制、独占锁、模板合规检查；二是 Variable Groups + Key Vault 集成实现密钥自动轮换；三是 YAML Templates 可以参数化复用整个 stage，比 GitHub 的 Reusable Workflows 更灵活。

### Q: 怎么管理 CI/CD 密钥？

> GitHub 用 Repository Secrets + Environment Secrets，Azure 用 Variable Groups 链接 Key Vault。Key Vault 的优势是密钥自动轮换和集中审计，适合企业合规要求。

### Q: 如何从 GitHub Actions 迁移到 Azure Pipelines？

> 核心步骤：`trigger` 对应 `on.push`，`jobs` 包进 `stages`，`needs` 改 `dependsOn`，Action 替换成 Task（`checkout` → `checkout: self`，`setup-node` → `NodeTool@0`，`upload-artifact` → `PublishPipelineArtifact@1`），secrets 迁移到 Variable Groups。
