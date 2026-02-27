# Terraform Outputs Definition
# This file defines all output values that will be displayed after terraform apply

# ==============================================================================
# Environment Information
# ==============================================================================

output "environment" {
  description = "Current environment name"
  value       = var.environment
}

output "provider_type" {
  description = "Provider type being used (localstack or aws)"
  value       = var.use_localstack ? "localstack" : "aws"
}

output "region" {
  description = "AWS region"
  value       = var.aws_region
}

# ==============================================================================
# S3 Bucket Outputs - Artifacts
# ==============================================================================

output "artifacts_bucket_name" {
  description = "Name of the S3 bucket for artifacts storage"
  value       = aws_s3_bucket.artifacts.id
}

output "artifacts_bucket_arn" {
  description = "ARN of the S3 bucket for artifacts"
  value       = aws_s3_bucket.artifacts.arn
}

output "artifacts_bucket_region" {
  description = "Region of the artifacts bucket"
  value       = aws_s3_bucket.artifacts.region
}

output "artifacts_bucket_domain_name" {
  description = "Domain name of the artifacts bucket"
  value       = aws_s3_bucket.artifacts.bucket_domain_name
}

# ==============================================================================
# S3 Bucket Outputs - Terraform State
# ==============================================================================

output "tfstate_bucket_name" {
  description = "Name of the S3 bucket for Terraform state storage"
  value       = aws_s3_bucket.terraform_state.id
}

output "tfstate_bucket_arn" {
  description = "ARN of the Terraform state bucket"
  value       = aws_s3_bucket.terraform_state.arn
}

# ==============================================================================
# DynamoDB Table Outputs
# ==============================================================================

output "dynamodb_table_name" {
  description = "Name of the DynamoDB table for state locking"
  value       = aws_dynamodb_table.terraform_locks.name
}

output "dynamodb_table_arn" {
  description = "ARN of the DynamoDB table"
  value       = aws_dynamodb_table.terraform_locks.arn
}

# ==============================================================================
# ECR Repository Outputs
# ==============================================================================

# Note: ECR outputs are commented out as ECR is not supported in Localstack Community Edition
# Uncomment when deploying to real AWS

# output "ecr_repository_name" {
#   description = "Name of the ECR repository"
#   value       = aws_ecr_repository.app.name
# }
#
# output "ecr_repository_url" {
#   description = "URL of the ECR repository"
#   value       = aws_ecr_repository.app.repository_url
# }
#
# output "ecr_repository_arn" {
#   description = "ARN of the ECR repository"
#   value       = aws_ecr_repository.app.arn
# }
#
# output "ecr_registry_id" {
#   description = "Registry ID of the ECR repository"
#   value       = aws_ecr_repository.app.registry_id
# }

# ==============================================================================
# Resource Summary
# ==============================================================================

output "resource_summary" {
  description = "Summary of all created resources"
  value = {
    environment      = var.environment
    provider         = var.use_localstack ? "localstack" : "aws"
    artifacts_bucket = aws_s3_bucket.artifacts.id
    tfstate_bucket   = aws_s3_bucket.terraform_state.id
    dynamodb_table   = aws_dynamodb_table.terraform_locks.name
    versioning       = var.enable_versioning
    encryption       = var.enable_encryption
    retention_days   = var.retention_days
  }
}

# ==============================================================================
# Usage Instructions
# ==============================================================================

output "usage_instructions" {
  description = "Quick usage instructions"
  value       = <<-EOT

    ✅ Infrastructure Created Successfully!

    Environment: ${var.environment}
    Provider: ${var.use_localstack ? "Localstack (local)" : "AWS (cloud)"}
    Region: ${var.aws_region}

    📦 Resources Created:
    - S3 Artifacts: ${aws_s3_bucket.artifacts.id}
    - S3 TF State: ${aws_s3_bucket.terraform_state.id}
    - DynamoDB Lock: ${aws_dynamodb_table.terraform_locks.name}

    🔍 Verify Resources:
    ${var.use_localstack ? "aws --endpoint-url=http://localhost:4566 s3 ls" : "aws s3 ls"}
    ${var.use_localstack ? "aws --endpoint-url=http://localhost:4566 dynamodb list-tables" : "aws dynamodb list-tables"}

    📝 Next Steps:
    1. Configure backend for remote state (edit backend.tf)
    2. Store CI/CD artifacts in S3
    3. Enable ECR when deploying to real AWS (uncomment in main.tf)

  EOT
}
