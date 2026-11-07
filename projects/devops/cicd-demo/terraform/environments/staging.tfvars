# Staging Environment Configuration
# This configuration uses real AWS services for integration testing

# ==============================================================================
# Environment Configuration
# ==============================================================================

environment  = "staging"
project_name = "qa-portfolio"
aws_region   = "us-east-1"

# ==============================================================================
# AWS Configuration (not Localstack)
# ==============================================================================

use_localstack = false # Use real AWS

# ==============================================================================
# Resource Configuration
# ==============================================================================

enable_versioning = true # Enable for data safety
enable_encryption = true # Enable for security
retention_days    = 14   # Moderate retention for staging

# ==============================================================================
# Tags
# ==============================================================================

common_tags = {
  Project     = "QA Portfolio"
  Environment = "Staging"
  ManagedBy   = "Terraform"
  Repository  = "michael-zhou-qa-portfolio"
  Component   = "CICD-Demo"
  Owner       = "DevOps Team"
  CostCenter  = "Testing"
  Purpose     = "Integration testing and pre-production validation"
}

additional_tags = {
  AutoShutdown = "true" # For cost optimization
  BackupPolicy = "weekly"
}
