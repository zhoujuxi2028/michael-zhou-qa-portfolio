# Development Environment Configuration
# This configuration uses Localstack for local development

# ==============================================================================
# Environment Configuration
# ==============================================================================

environment  = "dev"
project_name = "qa-portfolio"
aws_region   = "us-east-1"

# ==============================================================================
# Localstack Configuration
# ==============================================================================

use_localstack      = true
localstack_endpoint = "http://localhost:4566"

# ==============================================================================
# Resource Configuration
# ==============================================================================

enable_versioning = false # Not needed for local development
enable_encryption = false # Not needed for local development
retention_days    = 7     # Short retention for development

# ==============================================================================
# Tags
# ==============================================================================

common_tags = {
  Project     = "QAPortfolio"
  Environment = "dev"
  ManagedBy   = "Terraform"
  Component   = "CICD"
}

additional_tags = {}
