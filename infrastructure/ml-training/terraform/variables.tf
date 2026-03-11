variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "ml_team_email" {
  description = "Email address for ML team alerts"
  type        = string
}

variable "use_vpc" {
  description = "Whether to use VPC for SageMaker training"
  type        = bool
  default     = false
}