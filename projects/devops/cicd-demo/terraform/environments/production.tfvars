# Production Environment Configuration
# This configuration uses real AWS services for production deployment

# ==============================================================================
# Environment Configuration
# ==============================================================================

environment  = "production"
project_name = "qa-portfolio"
aws_region   = "us-east-1"

# ==============================================================================
# AWS Configuration (not Localstack)
# ==============================================================================

use_localstack = false # Use real AWS

# ==============================================================================
# Resource Configuration
# ==============================================================================

enable_versioning = true # Critical for data recovery
enable_encryption = true # Required for security compliance
retention_days    = 30   # Standard 30-day retention

# ==============================================================================
# Tags
# ==============================================================================

common_tags = {
  Project     = "QA Portfolio"
  Environment = "Production"
  ManagedBy   = "Terraform"
  Repository  = "michael-zhou-qa-portfolio"
  Component   = "CICD-Demo"
  Owner       = "DevOps Team"
  CostCenter  = "Production"
  Purpose     = "Production workload and live system"
  Compliance  = "Required"
}

additional_tags = {
  Criticality  = "High"
  BackupPolicy = "daily"
  Monitoring   = "24/7"
  SLA          = "99.9%"
}
