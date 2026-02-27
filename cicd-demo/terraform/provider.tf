# Terraform Provider Configuration
# This file configures the AWS provider to work with both Localstack (local development)
# and real AWS (staging/production)

terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# AWS Provider Configuration
# Supports both Localstack (local) and AWS (cloud) through variables
provider "aws" {
  region = var.aws_region

  # Localstack Configuration (for local development)
  # These settings are enabled when use_localstack = true
  skip_credentials_validation = var.use_localstack
  skip_requesting_account_id  = var.use_localstack
  skip_metadata_api_check     = var.use_localstack
  s3_use_path_style           = var.use_localstack

  # Dynamic endpoint configuration for Localstack
  # When use_localstack is true, all AWS service calls are redirected to Localstack
  dynamic "endpoints" {
    for_each = var.use_localstack ? [1] : []
    content {
      s3       = var.localstack_endpoint
      dynamodb = var.localstack_endpoint
      ecr      = var.localstack_endpoint
      iam      = var.localstack_endpoint
      sts      = var.localstack_endpoint
    }
  }

  # Default tags applied to all resources
  # These tags are automatically added to every AWS resource created
  default_tags {
    tags = var.common_tags
  }
}
