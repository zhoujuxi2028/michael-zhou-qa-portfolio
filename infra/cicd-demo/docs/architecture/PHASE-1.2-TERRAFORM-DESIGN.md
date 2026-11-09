# Phase 1.2 - Infrastructure as Code 设计文档

**版本**: 1.0
**创建日期**: 2026-02-27
**状态**: 📝 设计完成，待实施
**预计工时**: 4小时
**依赖**: Phase 1.1 完成 ✅

---

## 📋 目录

- [设计目标](#设计目标)
- [架构设计](#架构设计)
- [文件结构](#文件结构)
- [技术方案](#技术方案)
- [多环境策略](#多环境策略)
- [Localstack集成](#localstack集成)
- [实施步骤](#实施步骤)
- [验收标准](#验收标准)
- [面试价值](#面试价值)

---

## 🎯 设计目标

### 核心目标

1. **Infrastructure as Code** - 所有基础设施通过代码定义和管理
2. **多环境支持** - 支持 dev/staging/production 三个环境
3. **本地开发** - 使用 Localstack 模拟 AWS 服务
4. **云可扩展** - 代码可无缝迁移到真实 AWS
5. **最佳实践** - 遵循 Terraform 和 IaC 最佳实践

### 技术要求

- ✅ Terraform >= 1.0
- ✅ 模块化设计
- ✅ 变量参数化
- ✅ 状态管理
- ✅ 环境隔离
- ✅ 代码复用

---

## 🏛️ 架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                  Terraform Configuration                     │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │  main.tf   │  │variables.tf│  │ outputs.tf │            │
│  │  (资源定义) │  │  (参数)    │  │  (输出)    │            │
│  └────────────┘  └────────────┘  └────────────┘            │
│                                                               │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │provider.tf │  │ backend.tf │  │  README.md │            │
│  │ (Provider) │  │  (状态)    │  │   (文档)   │            │
│  └────────────┘  └────────────┘  └────────────┘            │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           environments/ (环境配置)                   │    │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐    │    │
│  │  │dev.tfvars  │  │staging.tfvars│ │prod.tfvars │    │    │
│  │  └────────────┘  └────────────┘  └────────────┘    │    │
│  └─────────────────────────────────────────────────────┘    │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                 Provider: Localstack (开发)                  │
│                 Provider: AWS (生产)                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │    S3      │  │  DynamoDB  │  │    ECR     │            │
│  │  (存储)    │  │  (状态锁)  │  │  (镜像)    │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

### 分层设计

```
Layer 1: Configuration Layer
  ├── Variables (输入参数)
  ├── Environments (环境配置)
  └── Outputs (输出结果)

Layer 2: Resource Layer
  ├── Storage Resources (S3 buckets)
  ├── Database Resources (DynamoDB tables)
  └── Registry Resources (ECR repositories)

Layer 3: Provider Layer
  ├── Localstack (本地开发)
  └── AWS (生产部署)
```

---

## 📂 文件结构

### 目录树

```
terraform/
├── main.tf                    # 主配置文件 (~200 lines)
│   ├── S3 Bucket for artifacts
│   ├── DynamoDB for state locking
│   └── ECR for Docker images
│
├── variables.tf               # 变量定义 (~100 lines)
│   ├── 环境变量 (environment)
│   ├── 项目名称 (project_name)
│   ├── AWS区域 (aws_region)
│   └── 资源标签 (tags)
│
├── outputs.tf                 # 输出定义 (~50 lines)
│   ├── S3 bucket names
│   ├── DynamoDB table names
│   └── ECR repository URLs
│
├── provider.tf                # Provider配置 (~40 lines)
│   ├── Localstack provider
│   ├── AWS provider
│   └── Version constraints
│
├── backend.tf                 # 状态管理 (~30 lines)
│   ├── Local backend (dev)
│   └── S3 backend (prod)
│
├── README.md                  # 使用文档 (~200 lines)
│   ├── 快速开始
│   ├── 环境切换
│   ├── 常用命令
│   └── 故障排查
│
├── modules/                   # 可复用模块 (预留)
│   └── .gitkeep
│
└── environments/              # 环境配置
    ├── dev.tfvars            # 开发环境 (~30 lines)
    ├── staging.tfvars        # 预发环境 (~30 lines)
    └── production.tfvars     # 生产环境 (~30 lines)
```

---

## 🔧 技术方案

### 1. main.tf - 主配置文件

**设计原则**:
- 使用本地 provider 模拟 AWS
- 资源命名包含环境标识
- 支持环境变量控制
- 添加合理的标签

**主要资源**:

```hcl
# S3 Bucket - 用于存储测试报告和artifacts
resource "aws_s3_bucket" "artifacts" {
  bucket = "${var.project_name}-${var.environment}-artifacts"

  tags = merge(
    var.common_tags,
    {
      Name        = "${var.project_name}-artifacts"
      Environment = var.environment
      Purpose     = "Store test reports and CI/CD artifacts"
    }
  )
}

# S3 Bucket - 用于存储 Terraform 状态（生产环境）
resource "aws_s3_bucket" "terraform_state" {
  bucket = "${var.project_name}-${var.environment}-tfstate"

  tags = merge(
    var.common_tags,
    {
      Name        = "${var.project_name}-tfstate"
      Environment = var.environment
      Purpose     = "Store Terraform state files"
    }
  )
}

# DynamoDB Table - 用于 Terraform 状态锁
resource "aws_dynamodb_table" "terraform_locks" {
  name           = "${var.project_name}-${var.environment}-tf-locks"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  tags = merge(
    var.common_tags,
    {
      Name        = "${var.project_name}-locks"
      Environment = var.environment
      Purpose     = "Terraform state locking"
    }
  )
}

# ECR Repository - 用于存储 Docker 镜像
resource "aws_ecr_repository" "app" {
  name                 = "${var.project_name}-${var.environment}"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = merge(
    var.common_tags,
    {
      Name        = "${var.project_name}-ecr"
      Environment = var.environment
      Purpose     = "Store Docker images"
    }
  )
}
```

**资源命名规范**:
```
格式: {project_name}-{environment}-{resource_type}
示例:
  - qa-portfolio-dev-artifacts (S3)
  - qa-portfolio-staging-tf-locks (DynamoDB)
  - qa-portfolio-production (ECR)
```

---

### 2. variables.tf - 变量定义

**变量分类**:

#### 必需变量 (Required)
```hcl
variable "environment" {
  description = "Environment name (dev/staging/production)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be dev, staging, or production."
  }
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "qa-portfolio"
}
```

#### 可选变量 (Optional)
```hcl
variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "use_localstack" {
  description = "Use Localstack for local development"
  type        = bool
  default     = true
}

variable "localstack_endpoint" {
  description = "Localstack endpoint URL"
  type        = string
  default     = "http://localhost:4566"
}
```

#### 标签变量 (Tags)
```hcl
variable "common_tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default = {
    Project     = "QA Portfolio"
    ManagedBy   = "Terraform"
    Repository  = "michael-zhou-qa-portfolio"
    Component   = "CICD-Demo"
  }
}
```

---

### 3. outputs.tf - 输出定义

**输出分类**:

#### 存储相关
```hcl
output "artifacts_bucket_name" {
  description = "Name of the S3 bucket for artifacts"
  value       = aws_s3_bucket.artifacts.id
}

output "artifacts_bucket_arn" {
  description = "ARN of the S3 bucket for artifacts"
  value       = aws_s3_bucket.artifacts.arn
}

output "tfstate_bucket_name" {
  description = "Name of the S3 bucket for Terraform state"
  value       = aws_s3_bucket.terraform_state.id
}
```

#### 数据库相关
```hcl
output "dynamodb_table_name" {
  description = "Name of the DynamoDB table for state locking"
  value       = aws_dynamodb_table.terraform_locks.name
}

output "dynamodb_table_arn" {
  description = "ARN of the DynamoDB table"
  value       = aws_dynamodb_table.terraform_locks.arn
}
```

#### 镜像仓库相关
```hcl
output "ecr_repository_url" {
  description = "URL of the ECR repository"
  value       = aws_ecr_repository.app.repository_url
}

output "ecr_repository_arn" {
  description = "ARN of the ECR repository"
  value       = aws_ecr_repository.app.arn
}
```

#### 环境信息
```hcl
output "environment" {
  description = "Current environment"
  value       = var.environment
}

output "provider_type" {
  description = "Provider type (localstack or aws)"
  value       = var.use_localstack ? "localstack" : "aws"
}
```

---

### 4. provider.tf - Provider配置

**设计思路**:
- 使用条件表达式支持本地和云端切换
- Localstack用于本地开发
- AWS用于生产部署

```hcl
terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# AWS Provider配置
provider "aws" {
  region = var.aws_region

  # Localstack配置（开发环境）
  skip_credentials_validation = var.use_localstack
  skip_requesting_account_id  = var.use_localstack
  skip_metadata_api_check     = var.use_localstack
  s3_use_path_style           = var.use_localstack

  # 当使用Localstack时，覆盖所有端点
  dynamic "endpoints" {
    for_each = var.use_localstack ? [1] : []
    content {
      s3         = var.localstack_endpoint
      dynamodb   = var.localstack_endpoint
      ecr        = var.localstack_endpoint
      iam        = var.localstack_endpoint
      sts        = var.localstack_endpoint
    }
  }

  # 默认标签
  default_tags {
    tags = var.common_tags
  }
}
```

**环境切换逻辑**:
```
if use_localstack == true:
    → 使用 Localstack endpoints
    → 跳过 AWS 凭证验证
    → 使用 path-style S3 URLs
else:
    → 使用真实 AWS endpoints
    → 需要 AWS 凭证
    → 使用标准 S3 URLs
```

---

### 5. backend.tf - 状态管理

**设计策略**:
- 开发环境：本地状态文件
- 预发/生产：S3 + DynamoDB 远程状态

```hcl
# 开发环境：使用本地状态
# 注释掉 backend 配置即可

# 生产环境：使用远程状态
# 取消注释以下配置：

# terraform {
#   backend "s3" {
#     bucket         = "qa-portfolio-production-tfstate"
#     key            = "terraform.tfstate"
#     region         = "us-east-1"
#     dynamodb_table = "qa-portfolio-production-tf-locks"
#     encrypt        = true
#   }
# }
```

**状态文件位置**:
```
开发环境:
  ./terraform.tfstate
  ./terraform.tfstate.backup

生产环境:
  s3://qa-portfolio-production-tfstate/terraform.tfstate
```

---

## 🌍 多环境策略

### 环境配置文件

#### dev.tfvars - 开发环境
```hcl
environment         = "dev"
project_name        = "qa-portfolio"
aws_region          = "us-east-1"
use_localstack      = true
localstack_endpoint = "http://localhost:4566"

common_tags = {
  Project     = "QA Portfolio"
  Environment = "Development"
  ManagedBy   = "Terraform"
  Repository  = "michael-zhou-qa-portfolio"
  Component   = "CICD-Demo"
  Owner       = "DevOps Team"
  CostCenter  = "Development"
}
```

#### staging.tfvars - 预发环境
```hcl
environment         = "staging"
project_name        = "qa-portfolio"
aws_region          = "us-east-1"
use_localstack      = false  # 使用真实AWS

common_tags = {
  Project     = "QA Portfolio"
  Environment = "Staging"
  ManagedBy   = "Terraform"
  Repository  = "michael-zhou-qa-portfolio"
  Component   = "CICD-Demo"
  Owner       = "DevOps Team"
  CostCenter  = "Testing"
}
```

#### production.tfvars - 生产环境
```hcl
environment         = "production"
project_name        = "qa-portfolio"
aws_region          = "us-east-1"
use_localstack      = false  # 使用真实AWS

common_tags = {
  Project     = "QA Portfolio"
  Environment = "Production"
  ManagedBy   = "Terraform"
  Repository  = "michael-zhou-qa-portfolio"
  Component   = "CICD-Demo"
  Owner       = "DevOps Team"
  CostCenter  = "Production"
  Compliance  = "Required"
}
```

### 环境切换命令

```bash
# 开发环境（Localstack）
terraform plan -var-file=environments/dev.tfvars
terraform apply -var-file=environments/dev.tfvars

# 预发环境（真实AWS）
terraform plan -var-file=environments/staging.tfvars
terraform apply -var-file=environments/staging.tfvars

# 生产环境（真实AWS）
terraform plan -var-file=environments/production.tfvars
terraform apply -var-file=environments/production.tfvars
```

---

## 🐳 Localstack集成

### 什么是Localstack？

Localstack是一个完全功能的本地AWS云栈，可以在本地机器上模拟AWS服务，无需实际AWS账号。

### 为什么使用Localstack？

✅ **优势**:
- 💰 零成本：完全免费，无需AWS账号
- ⚡ 快速：本地运行，响应速度快
- 🔒 安全：数据不离开本地
- 🧪 测试友好：可随意创建/删除资源
- 📚 学习：熟悉AWS服务和Terraform

❌ **限制**:
- 功能简化：不是100%完整的AWS实现
- 性能差异：与真实AWS有差异
- 无法完全替代生产环境测试

### Localstack部署方案

#### 方式1: Docker Compose (推荐)

创建 `docker-compose.localstack.yml`:

```yaml
version: '3.8'

services:
  localstack:
    image: localstack/localstack:latest
    container_name: qa-portfolio-localstack
    ports:
      - "4566:4566"  # LocalStack Gateway
      - "4510-4559:4510-4559"  # External services port range
    environment:
      - SERVICES=s3,dynamodb,ecr,iam,sts
      - DEBUG=1
      - DATA_DIR=/tmp/localstack/data
      - DOCKER_HOST=unix:///var/run/docker.sock
      - HOST_TMP_FOLDER=${TMPDIR}
    volumes:
      - "${TMPDIR:-/tmp}/localstack:/tmp/localstack"
      - "/var/run/docker.sock:/var/run/docker.sock"
    networks:
      - devops-network

networks:
  devops-network:
    name: qa-portfolio-network
    driver: bridge
```

**启动命令**:
```bash
docker-compose -f docker-compose.localstack.yml up -d
```

#### 方式2: Docker 命令

```bash
docker run -d \
  --name qa-portfolio-localstack \
  -p 4566:4566 \
  -e SERVICES=s3,dynamodb,ecr \
  -e DEBUG=1 \
  localstack/localstack:latest
```

### Localstack验证

```bash
# 检查Localstack状态
curl http://localhost:4566/_localstack/health | jq

# 测试S3
aws --endpoint-url=http://localhost:4566 s3 mb s3://test-bucket
aws --endpoint-url=http://localhost:4566 s3 ls

# 测试DynamoDB
aws --endpoint-url=http://localhost:4566 dynamodb list-tables
```

---

## 📋 实施步骤

### Step 1: 启动Localstack (5分钟)

```bash
# 创建docker-compose文件
cd cicd-demo
cat > docker-compose.localstack.yml << 'EOF'
# ... (上面的docker-compose配置) ...
EOF

# 启动Localstack
docker-compose -f docker-compose.localstack.yml up -d

# 验证
curl http://localhost:4566/_localstack/health
```

### Step 2: 创建Terraform文件 (2小时)

```bash
cd terraform

# 创建文件的顺序：
# 1. provider.tf - Provider配置
# 2. variables.tf - 变量定义
# 3. main.tf - 资源定义
# 4. outputs.tf - 输出定义
# 5. backend.tf - 状态管理
```

### Step 3: 创建环境配置 (30分钟)

```bash
cd terraform/environments

# 创建三个环境配置文件
# 1. dev.tfvars
# 2. staging.tfvars
# 3. production.tfvars
```

### Step 4: 初始化和验证 (30分钟)

```bash
cd terraform

# 初始化Terraform
terraform init

# 格式化代码
terraform fmt -recursive

# 验证配置
terraform validate

# 查看执行计划（开发环境）
terraform plan -var-file=environments/dev.tfvars

# 应用配置
terraform apply -var-file=environments/dev.tfvars -auto-approve
```

### Step 5: 测试环境切换 (15分钟)

```bash
# 测试不同环境
terraform plan -var-file=environments/dev.tfvars
terraform plan -var-file=environments/staging.tfvars
terraform plan -var-file=environments/production.tfvars

# 查看输出
terraform output

# 验证资源创建
aws --endpoint-url=http://localhost:4566 s3 ls
aws --endpoint-url=http://localhost:4566 dynamodb list-tables
```

### Step 6: 编写文档 (30分钟)

```bash
cd terraform

# 创建README.md
# 包含：
# - 快速开始
# - 环境切换
# - 常用命令
# - 故障排查
```

### Step 7: 清理测试资源 (可选)

```bash
# 销毁资源
terraform destroy -var-file=environments/dev.tfvars -auto-approve

# 停止Localstack
docker-compose -f docker-compose.localstack.yml down
```

---

## ✅ 验收标准

### 功能验收

#### 1. Terraform基础
- [ ] `terraform init` 成功执行
- [ ] `terraform validate` 无错误
- [ ] `terraform fmt` 代码格式正确
- [ ] 无Terraform警告

#### 2. 资源创建
- [ ] S3 bucket创建成功（artifacts）
- [ ] S3 bucket创建成功（tfstate）
- [ ] DynamoDB table创建成功（locks）
- [ ] ECR repository创建成功

#### 3. 环境切换
- [ ] dev.tfvars配置正确
- [ ] staging.tfvars配置正确
- [ ] production.tfvars配置正确
- [ ] 可以在不同环境间切换

#### 4. Localstack集成
- [ ] Localstack容器运行正常
- [ ] Terraform连接Localstack成功
- [ ] 资源在Localstack中可见
- [ ] 可以使用AWS CLI查询资源

#### 5. 输出验证
- [ ] 所有output正确显示
- [ ] Bucket名称符合命名规范
- [ ] ARN格式正确

### 质量验收

#### 代码质量
```bash
# 代码格式检查
terraform fmt -check -recursive

# 配置验证
terraform validate

# 安全扫描（可选）
tfsec .
```

#### 文档完整性
- [ ] README.md包含所有必需章节
- [ ] 命令示例可执行
- [ ] 故障排查指南完整

### 性能验收

- [ ] `terraform plan` 执行时间 < 30秒
- [ ] `terraform apply` 执行时间 < 2分钟
- [ ] Localstack响应时间 < 1秒

---

## 🎓 面试价值

### 技术亮点

#### 1. Infrastructure as Code最佳实践
> "我使用Terraform实现基础设施即代码，采用模块化设计，支持多环境部署。所有基础设施变更都经过代码审查和版本控制，确保可追溯性和一致性。"

**讨论要点**:
- 为什么选择Terraform？（声明式、云无关、社区支持）
- IaC的优势？（版本控制、可复用、自动化、文档化）
- 与CloudFormation/ARM/Pulumi对比？

#### 2. 多环境管理策略
> "我设计了三层环境策略：dev使用Localstack本地开发（成本$0），staging使用AWS进行集成测试，production严格的变更控制。每个环境有独立的tfvars配置文件，通过变量隔离环境差异。"

**讨论要点**:
- 环境隔离策略
- 配置管理方法
- 环境晋升流程

#### 3. 本地开发环境（Localstack）
> "为了降低开发成本和提高开发效率，我集成了Localstack模拟AWS服务。开发人员可以在本地完整测试基础设施代码，无需AWS账号，部署时间从分钟级降到秒级。"

**讨论要点**:
- 本地开发的重要性
- Localstack vs 真实AWS
- 成本优化策略

#### 4. 状态管理
> "我配置了Terraform状态管理：开发环境使用本地状态（快速迭代），生产环境使用S3+DynamoDB远程状态（团队协作、状态锁定）。这确保了多人协作时的状态一致性。"

**讨论要点**:
- 为什么需要远程状态？
- 状态锁的作用
- 状态灾难恢复

#### 5. 资源命名和标签
> "我建立了统一的资源命名规范：`{project}-{env}-{resource}`，并且使用标签进行资源分类和成本追踪。这使得资源管理更加规范，成本归属清晰。"

**讨论要点**:
- 命名规范的重要性
- 标签策略
- 成本分配方法

### 可扩展性讨论

#### 场景1: 扩展到真实AWS
**面试官**: "如果要部署到真实AWS，需要改什么？"

**回答**:
"只需要三个步骤：
1. 修改tfvars：`use_localstack = false`
2. 配置AWS凭证：`aws configure`
3. 应用配置：`terraform apply -var-file=environments/production.tfvars`

代码完全不需要改动，这就是IaC和Provider抽象的优势。"

#### 场景2: 添加新的AWS服务
**面试官**: "如何添加RDS数据库？"

**回答**:
"在main.tf中添加resource块：
```hcl
resource 'aws_db_instance' 'main' {
  # 配置参数
}
```
因为采用了模块化设计，添加新资源不影响现有资源。"

#### 场景3: 多区域部署
**面试官**: "如何支持多区域部署？"

**回答**:
"可以使用Provider别名：
```hcl
provider 'aws' {
  alias  = 'us_east'
  region = 'us-east-1'
}
provider 'aws' {
  alias  = 'eu_west'
  region = 'eu-west-1'
}
```
然后在资源中指定provider。"

---

## 🚨 风险和注意事项

### 技术风险

| 风险 | 等级 | 影响 | 缓解措施 |
|------|------|------|----------|
| Localstack与AWS差异 | 🟡 中 | 本地测试不完全准确 | 在staging环境再次验证 |
| Docker资源占用 | 🟠 低 | Localstack占用内存 | 定期清理容器 |
| 状态文件冲突 | 🟡 中 | 多人协作时状态不一致 | 使用远程状态和锁 |
| 版本兼容性 | 🟠 低 | Terraform版本差异 | 使用version constraints |

### 实施风险

| 风险 | 概率 | 应对方案 |
|------|------|----------|
| Localstack启动失败 | 中 | 检查Docker和端口占用 |
| Terraform初始化慢 | 高 | 使用mirror或缓存 |
| AWS凭证问题 | 低 | 使用Localstack避免 |
| 文档编写耗时 | 高 | 使用模板加速 |

### 最佳实践

✅ **DO 推荐**:
- 使用变量参数化所有配置
- 添加合理的资源标签
- 编写清晰的注释
- 使用`.tfvars`管理环境差异
- 定期运行`terraform fmt`
- 使用远程状态（生产环境）

❌ **DON'T 避免**:
- 硬编码敏感信息
- 手动修改状态文件
- 跳过`terraform plan`
- 忽略Terraform警告
- 直接在生产环境测试
- 不使用版本控制

---

## 📚 参考资料

### Terraform官方文档
- [Terraform入门](https://www.terraform.io/intro)
- [AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [变量和输出](https://www.terraform.io/language/values)
- [状态管理](https://www.terraform.io/language/state)

### Localstack文档
- [Localstack快速开始](https://docs.localstack.cloud/getting-started/)
- [支持的服务](https://docs.localstack.cloud/user-guide/aws/feature-coverage/)
- [Terraform集成](https://docs.localstack.cloud/user-guide/integrations/terraform/)

### 最佳实践
- [Terraform Best Practices](https://www.terraform-best-practices.com/)
- [AWS Tagging Best Practices](https://docs.aws.amazon.com/general/latest/gr/aws_tagging.html)

---

## 📝 附录

### A. 完整命令速查表

```bash
# === Localstack管理 ===
docker-compose -f docker-compose.localstack.yml up -d     # 启动
docker-compose -f docker-compose.localstack.yml down      # 停止
docker-compose -f docker-compose.localstack.yml logs -f   # 查看日志

# === Terraform基础 ===
terraform init                    # 初始化
terraform fmt -recursive          # 格式化
terraform validate                # 验证
terraform plan                    # 预览变更
terraform apply                   # 应用变更
terraform destroy                 # 销毁资源
terraform output                  # 查看输出

# === 环境切换 ===
terraform plan -var-file=environments/dev.tfvars         # 开发环境
terraform plan -var-file=environments/staging.tfvars     # 预发环境
terraform plan -var-file=environments/production.tfvars  # 生产环境

# === AWS CLI (Localstack) ===
aws --endpoint-url=http://localhost:4566 s3 ls
aws --endpoint-url=http://localhost:4566 dynamodb list-tables
aws --endpoint-url=http://localhost:4566 ecr describe-repositories

# === 清理 ===
terraform destroy -var-file=environments/dev.tfvars -auto-approve
docker-compose -f docker-compose.localstack.yml down -v
rm -rf .terraform terraform.tfstate*
```

### B. 故障排查清单

**问题1: Terraform init失败**
```bash
# 检查网络连接
terraform init -upgrade

# 使用国内镜像
export TF_REGISTRY_MIRROR=https://registry.terraform-mirror.cn
```

**问题2: Localstack无法连接**
```bash
# 检查容器状态
docker ps | grep localstack

# 检查端口占用
lsof -i :4566

# 重启Localstack
docker restart qa-portfolio-localstack
```

**问题3: 资源创建失败**
```bash
# 查看详细日志
terraform apply -var-file=environments/dev.tfvars -auto-approve

# 检查Localstack日志
docker logs qa-portfolio-localstack

# 验证配置
terraform validate
```

---

**设计文档版本**: 1.0
**最后更新**: 2026-02-27
**状态**: ✅ 设计完成，待实施
**预计实施时间**: 4小时

---

## 🎯 下一步行动

**准备好开始实施了吗？**

1. ✅ 设计文档已完成
2. ⏭️ 开始创建Terraform文件
3. ⏭️ 启动Localstack
4. ⏭️ 初始化和测试

**回复 "开始实施" 或告诉我您的想法！** 🚀
