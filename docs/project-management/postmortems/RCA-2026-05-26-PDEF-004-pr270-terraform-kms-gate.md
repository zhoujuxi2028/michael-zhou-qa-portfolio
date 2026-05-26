# PDEF-004: PR #270 Terraform 安全门禁命中 AVD-AWS-0132 并触发双失败 — RCA

**缺陷 ID**: PDEF-004  
**严重度**: P2 Medium  
**发现日期**: 2026-05-26  
**修复日期**: 2026-05-26  
**影响范围**: `cicd-demo/terraform`、`.github/workflows/cicd-demo-terraform.yml`（`Terraform Security` / `Terraform Gate`）

---

## 1. 问题描述

PR #270（`copilot/optimize-cicd-demo`）在同一次 CI run #26407541306 内出现两次失败：

1. `CICD Demo / Terraform Security`（job #77793636094）失败  
2. `CICD Demo / Terraform Gate`（job #77793658029）因 `needs.security != success` 继发失败

失败日志关键证据：

- `AVD-AWS-0132 (HIGH): Bucket does not encrypt data with a customer managed key`
- 命中位置：
  - `cicd-demo/terraform/main.tf:52-61`
  - `cicd-demo/terraform/main.tf:128-136`

---

## 2. 根本原因（Root Cause）

`main.tf` 中两个 S3 桶的默认加密使用 `AES256`（SSE-S3），而 `cicd-demo-terraform.yml` 的 Trivy 安全门禁定义为 `severity: CRITICAL,HIGH + exit-code: 1`。  
Trivy 规则 `AVD-AWS-0132` 要求使用 Customer Managed Key（CMK）形态的 SSE-KMS。  
因此 `Terraform Security` 失败后，聚合闸口 `Terraform Gate` 按设计失败，表现为“同次 CI 两个红 job”。

---

## 3. 修复方案

在 `cicd-demo/terraform/main.tf` 做最小必要修复：

- 新增 `aws_kms_key.s3` 与 `aws_kms_alias.s3`
- 将两个 S3 加密配置统一改为：
  - `sse_algorithm = "aws:kms"`
  - `kms_master_key_id = aws_kms_key.s3.arn`

该修复直接消除 `AVD-AWS-0132`，并使 `Terraform Gate` 恢复为可通过状态。

---

## 4. 验证

- [x] `terraform fmt -check -recursive -diff`（Docker `hashicorp/terraform:1.7.5`）通过
- [x] `terraform init -backend=false && terraform validate`（Docker `hashicorp/terraform:1.7.5`）通过
- [x] 本地复现 Trivy 失败证据（变更前）：`AVD-AWS-0132` ×2
- [ ] 推送后在 PR CI 验证 `CICD Demo / Terraform Security` 与 `CICD Demo / Terraform Gate` 转绿

---

## 5. 预防措施（Preventive Actions）

| 编号 | 行动 | 责任人 | 状态 |
|------|------|--------|------|
| PA-1 | 在 Terraform 新增/修改 S3 资源时，评审项加入“是否使用 CMK（SSE-KMS）” | QA + Reviewer | 🟡 |
| PA-2 | 保留 `Terraform Security` 为 Required Check，禁止以 `trivyignore` 临时豁免 HIGH | Repo Owner | 🟡 |
| PA-3 | 在 `cicd-demo` 相关文档补充“Trivy AVD-AWS-0132 基线要求” | QA | 🟡 |

---

## 6. 关联链接

- PR: https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/pull/270
- 失败 run: https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/actions/runs/26407541306
- 失败 job:
  - https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/actions/runs/26407541306/job/77793636094
  - https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/actions/runs/26407541306/job/77793658029
- 缺陷登记主表: `docs/project-management/defect-tracking/defect-register.md`

---

**作者**: Copilot Agent  
**版本**: v1.0
