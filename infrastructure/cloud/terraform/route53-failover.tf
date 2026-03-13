# Failover routing for database endpoints
resource "aws_route53_record" "timescaledb_primary_failover" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "db.weather-impact.com"
  type    = "CNAME"
  ttl     = 60
  
  failover_routing_policy {
    type = "PRIMARY"
  }
  
  set_identifier = "primary"
  health_check_id = aws_route53_health_check.timescaledb_primary.id
  
  records = [aws_db_instance.timescaledb_primary.address]
}

resource "aws_route53_record" "timescaledb_replica_failover" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "db.weather-impact.com"
  type    = "CNAME"
  ttl     = 60
  
  failover_routing_policy {
    type = "SECONDARY"
  }
  
  set_identifier = "secondary-west"
  
  records = [aws_db_instance.timescaledb_replica_west.address]
}

# Health check for replica promotion readiness
resource "aws_route53_health_check" "timescaledb_replica_west" {
  type              = "CLOUDWATCH_METRIC"
  cloudwatch_alarm_name = aws_cloudwatch_metric_alarm.replica_lag_west.alarm_name
  cloudwatch_alarm_region = "us-west-2"
  insufficient_data_health_status = "Unhealthy"
  
  tags = merge(local.common_tags, {
    Name = "TimescaleDB Replica West Health"
  })
}

# Lambda function for automated failover
resource "aws_lambda_function" "database_failover" {
  provider = aws.us-east-1
  
  filename      = "lambda/database-failover.zip"
  function_name = "weather-impact-database-failover"
  role          = aws_iam_role.lambda_failover.arn
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  timeout       = 300
  
  environment {
    variables = {
      PRIMARY_DB_INSTANCE = aws_db_instance.timescaledb_primary.id
      REPLICA_WEST_INSTANCE = aws_db_instance.timescaledb_replica_west.id
      REPLICA_CENTRAL_INSTANCE = aws_db_instance.timescaledb_replica_central.id
      SNS_TOPIC_ARN = aws_sns_topic.database_alerts.arn
    }
  }
  
  tags = local.common_tags
}

resource "aws_iam_role" "lambda_failover" {
  provider = aws.us-east-1
  
  name = "weather-impact-lambda-failover-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
  
  tags = local.common_tags
}

resource "aws_iam_role_policy" "lambda_failover_policy" {
  provider = aws.us-east-1
  
  name = "weather-impact-lambda-failover-policy"
  role = aws_iam_role.lambda_failover.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "rds:DescribeDBInstances",
          "rds:PromoteReadReplica",
          "rds:ModifyDBInstance"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = aws_sns_topic.database_alerts.arn
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# CloudWatch Event Rule to trigger failover on primary failure
resource "aws_cloudwatch_event_rule" "database_failover_trigger" {
  provider = aws.us-east-1
  
  name        = "weather-impact-database-failover-trigger"
  description = "Trigger database failover when primary fails"
  
  event_pattern = jsonencode({
    source = ["aws.rds"]
    detail-type = ["RDS DB Instance Event"]
    detail = {
      EventCategories = ["failure"]
      SourceIdentifier = [aws_db_instance.timescaledb_primary.id]
    }
  })
  
  tags = local.common_tags
}

resource "aws_cloudwatch_event_target" "database_failover_lambda" {
  provider = aws.us-east-1
  
  rule      = aws_cloudwatch_event_rule.database_failover_trigger.name
  target_id = "DatabaseFailoverLambda"
  arn       = aws_lambda_function.database_failover.arn
}

resource "aws_lambda_permission" "allow_cloudwatch_failover" {
  provider = aws.us-east-1
  
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.database_failover.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.database_failover_trigger.arn
}