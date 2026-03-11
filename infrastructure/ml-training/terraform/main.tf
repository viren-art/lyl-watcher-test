# SageMaker Training Infrastructure

terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# S3 Bucket for ML artifacts
resource "aws_s3_bucket" "ml_artifacts" {
  bucket = "weather-impact-ml-${var.environment}"
  
  tags = {
    Name        = "ML Training Artifacts"
    Environment = var.environment
    Project     = "WeatherImpact"
  }
}

resource "aws_s3_bucket_versioning" "ml_artifacts" {
  bucket = aws_s3_bucket.ml_artifacts.id
  
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "ml_artifacts" {
  bucket = aws_s3_bucket.ml_artifacts.id
  
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# IAM Role for SageMaker
resource "aws_iam_role" "sagemaker_execution" {
  name = "weather-impact-sagemaker-execution-${var.environment}"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "sagemaker.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "sagemaker_full_access" {
  role       = aws_iam_role.sagemaker_execution.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSageMakerFullAccess"
}

resource "aws_iam_role_policy" "sagemaker_s3_access" {
  name = "sagemaker-s3-access"
  role = aws_iam_role.sagemaker_execution.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          "${aws_s3_bucket.ml_artifacts.arn}",
          "${aws_s3_bucket.ml_artifacts.arn}/*"
        ]
      }
    ]
  })
}

# ECR Repository for custom training images
resource "aws_ecr_repository" "weather_lstm_training" {
  name                 = "weather-impact/weather-lstm-training"
  image_tag_mutability = "MUTABLE"
  
  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_repository" "grid_transformer_training" {
  name                 = "weather-impact/grid-transformer-training"
  image_tag_mutability = "MUTABLE"
  
  image_scanning_configuration {
    scan_on_push = true
  }
}

# CloudWatch Log Group for training jobs
resource "aws_cloudwatch_log_group" "sagemaker_training" {
  name              = "/aws/sagemaker/TrainingJobs/weather-impact-${var.environment}"
  retention_in_days = 30
}

# SNS Topic for training alerts
resource "aws_sns_topic" "ml_team_alerts" {
  name = "weather-impact-ml-alerts-${var.environment}"
}

resource "aws_sns_topic_subscription" "ml_team_email" {
  topic_arn = aws_sns_topic.ml_team_alerts.arn
  protocol  = "email"
  endpoint  = var.ml_team_email
}

# CloudWatch Alarms
resource "aws_cloudwatch_metric_alarm" "low_model_accuracy" {
  alarm_name          = "weather-impact-low-model-accuracy-${var.environment}"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ModelAccuracy"
  namespace           = "WeatherImpact/MLTraining"
  period              = 300
  statistic           = "Average"
  threshold           = 0.85
  alarm_description   = "Alert when model accuracy falls below 85%"
  alarm_actions       = [aws_sns_topic.ml_team_alerts.arn]
}

resource "aws_cloudwatch_metric_alarm" "training_failure" {
  alarm_name          = "weather-impact-training-failure-${var.environment}"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "TrainingFailures"
  namespace           = "WeatherImpact/MLTraining"
  period              = 300
  statistic           = "Sum"
  threshold           = 1
  alarm_description   = "Alert on training job failures"
  alarm_actions       = [aws_sns_topic.ml_team_alerts.arn]
}

# VPC for SageMaker (optional, for secure training)
resource "aws_vpc" "sagemaker_vpc" {
  count = var.use_vpc ? 1 : 0
  
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  tags = {
    Name = "weather-impact-sagemaker-vpc-${var.environment}"
  }
}

resource "aws_subnet" "sagemaker_private" {
  count = var.use_vpc ? 2 : 0
  
  vpc_id            = aws_vpc.sagemaker_vpc[0].id
  cidr_block        = "10.0.${count.index + 1}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]
  
  tags = {
    Name = "weather-impact-sagemaker-private-${count.index + 1}"
  }
}

resource "aws_security_group" "sagemaker_training" {
  count = var.use_vpc ? 1 : 0
  
  name        = "weather-impact-sagemaker-training-${var.environment}"
  description = "Security group for SageMaker training jobs"
  vpc_id      = aws_vpc.sagemaker_vpc[0].id
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}

# Outputs
output "sagemaker_execution_role_arn" {
  value = aws_iam_role.sagemaker_execution.arn
}

output "ml_artifacts_bucket" {
  value = aws_s3_bucket.ml_artifacts.bucket
}

output "weather_lstm_ecr_repository" {
  value = aws_ecr_repository.weather_lstm_training.repository_url
}

output "grid_transformer_ecr_repository" {
  value = aws_ecr_repository.grid_transformer_training.repository_url
}