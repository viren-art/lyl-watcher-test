terraform {
  required_version = ">= 1.5.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
  }
  
  backend "s3" {
    bucket         = "weather-impact-terraform-state"
    key            = "multi-region/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}

provider "aws" {
  region = var.primary_region
  
  default_tags {
    tags = {
      Project     = "WeatherImpact"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

provider "aws" {
  alias  = "us-east-1"
  region = "us-east-1"
}

provider "aws" {
  alias  = "us-central-1"
  region = "us-east-2"
}

provider "aws" {
  alias  = "us-west-1"
  region = "us-west-1"
}

provider "aws" {
  alias  = "us-west-2"
  region = "us-west-2"
}

locals {
  regions = {
    northeast = {
      code       = "NE"
      aws_region = "us-east-1"
      azs        = ["us-east-1a", "us-east-1b", "us-east-1c"]
    }
    midwest = {
      code       = "MW"
      aws_region = "us-east-2"
      azs        = ["us-east-2a", "us-east-2b", "us-east-2c"]
    }
    western = {
      code       = "WE"
      aws_region = "us-west-1"
      azs        = ["us-west-1a", "us-west-1b"]
    }
    southern = {
      code       = "SO"
      aws_region = "us-east-2"
      azs        = ["us-east-2a", "us-east-2b", "us-east-2c"]
    }
    pacific = {
      code       = "PA"
      aws_region = "us-west-2"
      azs        = ["us-west-2a", "us-west-2b", "us-west-2c"]
    }
  }
  
  common_tags = {
    Project     = "WeatherImpact"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}