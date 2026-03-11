variable "environment" {
  description = "Environment name (prod, staging, dev)"
  type        = string
  default     = "prod"
}

variable "primary_region" {
  description = "Primary AWS region"
  type        = string
  default     = "us-east-1"
}

variable "eks_cluster_version" {
  description = "Kubernetes version for EKS clusters"
  type        = string
  default     = "1.28"
}

variable "eks_node_instance_types" {
  description = "EC2 instance types for EKS worker nodes"
  type        = list(string)
  default     = ["c5.2xlarge", "c5.4xlarge"]
}

variable "eks_min_nodes" {
  description = "Minimum number of worker nodes per region"
  type        = number
  default     = 3
}

variable "eks_max_nodes" {
  description = "Maximum number of worker nodes per region"
  type        = number
  default     = 50
}

variable "timescaledb_instance_class" {
  description = "RDS instance class for TimescaleDB"
  type        = string
  default     = "db.r6g.2xlarge"
}

variable "timescaledb_allocated_storage" {
  description = "Allocated storage for TimescaleDB (GB)"
  type        = number
  default     = 1000
}

variable "kafka_instance_type" {
  description = "MSK broker instance type"
  type        = string
  default     = "kafka.m5.2xlarge"
}

variable "kafka_broker_count" {
  description = "Number of Kafka brokers per region"
  type        = number
  default     = 3
}

variable "enable_multi_region" {
  description = "Enable multi-region deployment"
  type        = bool
  default     = true
}

variable "customer_count_threshold" {
  description = "Customer count threshold for scaling"
  type        = number
  default     = 100
}