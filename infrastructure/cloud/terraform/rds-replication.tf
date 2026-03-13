# Primary TimescaleDB instance in us-east-1
resource "aws_db_instance" "timescaledb_primary" {
  provider = aws.us-east-1
  
  identifier     = "weather-impact-timescaledb-primary"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = var.timescaledb_instance_class
  
  allocated_storage     = var.timescaledb_allocated_storage
  max_allocated_storage = var.timescaledb_allocated_storage * 2
  storage_type          = "gp3"
  storage_encrypted     = true
  
  db_name  = "weather_db"
  username = "weather_admin"
  password = random_password.timescaledb_password.result
  
  vpc_security_group_ids = [aws_security_group.timescaledb_primary.id]
  db_subnet_group_name   = aws_db_subnet_group.timescaledb_primary.name
  
  backup_retention_period = 30
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  multi_az               = true
  publicly_accessible    = false
  skip_final_snapshot    = false
  final_snapshot_identifier = "weather-impact-timescaledb-final-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"
  
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  
  performance_insights_enabled = true
  performance_insights_retention_period = 7
  
  tags = merge(local.common_tags, {
    Name = "TimescaleDB Primary"
    Role = "Primary"
  })
}

# Read replica in us-west-2 for cross-region failover
resource "aws_db_instance" "timescaledb_replica_west" {
  provider = aws.us-west-2
  
  identifier     = "weather-impact-timescaledb-replica-west"
  replicate_source_db = aws_db_instance.timescaledb_primary.arn
  
  instance_class = var.timescaledb_instance_class
  
  vpc_security_group_ids = [aws_security_group.timescaledb_replica_west.id]
  
  backup_retention_period = 7
  skip_final_snapshot    = true
  
  multi_az               = true
  publicly_accessible    = false
  
  enabled_cloudwatch_logs_exports = ["postgresql"]
  
  performance_insights_enabled = true
  performance_insights_retention_period = 7
  
  tags = merge(local.common_tags, {
    Name = "TimescaleDB Replica West"
    Role = "ReadReplica"
    Region = "us-west-2"
  })
}

# Read replica in us-east-2 for additional redundancy
resource "aws_db_instance" "timescaledb_replica_central" {
  provider = aws.us-central-1
  
  identifier     = "weather-impact-timescaledb-replica-central"
  replicate_source_db = aws_db_instance.timescaledb_primary.arn
  
  instance_class = var.timescaledb_instance_class
  
  vpc_security_group_ids = [aws_security_group.timescaledb_replica_central.id]
  
  backup_retention_period = 7
  skip_final_snapshot    = true
  
  multi_az               = true
  publicly_accessible    = false
  
  enabled_cloudwatch_logs_exports = ["postgresql"]
  
  performance_insights_enabled = true
  performance_insights_retention_period = 7
  
  tags = merge(local.common_tags, {
    Name = "TimescaleDB Replica Central"
    Role = "ReadReplica"
    Region = "us-east-2"
  })
}

# Security groups
resource "aws_security_group" "timescaledb_primary" {
  provider = aws.us-east-1
  
  name        = "timescaledb-primary-sg"
  description = "Security group for TimescaleDB primary instance"
  vpc_id      = module.vpc_northeast.vpc_id
  
  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [module.vpc_northeast.vpc_cidr_block]
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = merge(local.common_tags, {
    Name = "TimescaleDB Primary SG"
  })
}

resource "aws_security_group" "timescaledb_replica_west" {
  provider = aws.us-west-2
  
  name        = "timescaledb-replica-west-sg"
  description = "Security group for TimescaleDB replica in us-west-2"
  vpc_id      = module.vpc_pacific.vpc_id
  
  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [module.vpc_pacific.vpc_cidr_block]
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = merge(local.common_tags, {
    Name = "TimescaleDB Replica West SG"
  })
}

resource "aws_security_group" "timescaledb_replica_central" {
  provider = aws.us-central-1
  
  name        = "timescaledb-replica-central-sg"
  description = "Security group for TimescaleDB replica in us-east-2"
  vpc_id      = module.vpc_midwest.vpc_id
  
  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [module.vpc_midwest.vpc_cidr_block]
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = merge(local.common_tags, {
    Name = "TimescaleDB Replica Central SG"
  })
}

# DB subnet groups
resource "aws_db_subnet_group" "timescaledb_primary" {
  provider = aws.us-east-1
  
  name       = "timescaledb-primary-subnet-group"
  subnet_ids = module.vpc_northeast.database_subnets
  
  tags = merge(local.common_tags, {
    Name = "TimescaleDB Primary Subnet Group"
  })
}

# Random password for database
resource "random_password" "timescaledb_password" {
  length  = 32
  special = true
}

# Store password in Secrets Manager
resource "aws_secretsmanager_secret" "timescaledb_password" {
  provider = aws.us-east-1
  
  name = "weather-impact/timescaledb/password"
  
  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "timescaledb_password" {
  provider = aws.us-east-1
  
  secret_id     = aws_secretsmanager_secret.timescaledb_password.id
  secret_string = random_password.timescaledb_password.result
}

# CloudWatch alarms for replication lag
resource "aws_cloudwatch_metric_alarm" "replica_lag_west" {
  provider = aws.us-west-2
  
  alarm_name          = "timescaledb-replica-west-lag"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "ReplicaLag"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 300000  # 5 minutes in milliseconds
  alarm_description   = "Alert when replica lag exceeds 5 minutes"
  
  dimensions = {
    DBInstanceIdentifier = aws_db_instance.timescaledb_replica_west.id
  }
  
  alarm_actions = [aws_sns_topic.database_alerts.arn]
  
  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "replica_lag_central" {
  provider = aws.us-central-1
  
  alarm_name          = "timescaledb-replica-central-lag"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "ReplicaLag"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 300000  # 5 minutes in milliseconds
  alarm_description   = "Alert when replica lag exceeds 5 minutes"
  
  dimensions = {
    DBInstanceIdentifier = aws_db_instance.timescaledb_replica_central.id
  }
  
  alarm_actions = [aws_sns_topic.database_alerts.arn]
  
  tags = local.common_tags
}

# SNS topic for database alerts
resource "aws_sns_topic" "database_alerts" {
  provider = aws.us-east-1
  
  name = "weather-impact-database-alerts"
  
  tags = local.common_tags
}

# Route53 health checks for automatic failover
resource "aws_route53_health_check" "timescaledb_primary" {
  type              = "CLOUDWATCH_METRIC"
  cloudwatch_alarm_name = aws_cloudwatch_metric_alarm.primary_cpu.alarm_name
  cloudwatch_alarm_region = "us-east-1"
  insufficient_data_health_status = "Unhealthy"
  
  tags = merge(local.common_tags, {
    Name = "TimescaleDB Primary Health"
  })
}

resource "aws_cloudwatch_metric_alarm" "primary_cpu" {
  provider = aws.us-east-1
  
  alarm_name          = "timescaledb-primary-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 90
  alarm_description   = "Alert when primary CPU exceeds 90%"
  
  dimensions = {
    DBInstanceIdentifier = aws_db_instance.timescaledb_primary.id
  }
  
  alarm_actions = [aws_sns_topic.database_alerts.arn]
  
  tags = local.common_tags
}