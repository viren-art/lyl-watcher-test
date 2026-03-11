resource "aws_route53_zone" "main" {
  name = "weather-impact.com"
  
  tags = local.common_tags
}

resource "aws_route53_health_check" "northeast" {
  fqdn              = "api-ne.weather-impact.com"
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = 3
  request_interval  = 30
  
  tags = merge(local.common_tags, {
    Region = "Northeast"
  })
}

resource "aws_route53_health_check" "midwest" {
  fqdn              = "api-mw.weather-impact.com"
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = 3
  request_interval  = 30
  
  tags = merge(local.common_tags, {
    Region = "Midwest"
  })
}

resource "aws_route53_health_check" "western" {
  fqdn              = "api-we.weather-impact.com"
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = 3
  request_interval  = 30
  
  tags = merge(local.common_tags, {
    Region = "Western"
  })
}

resource "aws_route53_health_check" "pacific" {
  fqdn              = "api-pa.weather-impact.com"
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = 3
  request_interval  = 30
  
  tags = merge(local.common_tags, {
    Region = "Pacific"
  })
}

resource "aws_route53_record" "api_geolocation_northeast" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.weather-impact.com"
  type    = "A"
  
  geolocation_routing_policy {
    continent = "NA"
    country   = "US"
    subdivision = "NY"
  }
  
  set_identifier = "northeast"
  health_check_id = aws_route53_health_check.northeast.id
  
  alias {
    name                   = module.eks_northeast.cluster_endpoint
    zone_id                = module.eks_northeast.cluster_arn
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "api_geolocation_midwest" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.weather-impact.com"
  type    = "A"
  
  geolocation_routing_policy {
    continent = "NA"
    country   = "US"
    subdivision = "IL"
  }
  
  set_identifier = "midwest"
  health_check_id = aws_route53_health_check.midwest.id
  
  alias {
    name                   = module.eks_midwest.cluster_endpoint
    zone_id                = module.eks_midwest.cluster_arn
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "api_geolocation_western" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.weather-impact.com"
  type    = "A"
  
  geolocation_routing_policy {
    continent = "NA"
    country   = "US"
    subdivision = "CA"
  }
  
  set_identifier = "western"
  health_check_id = aws_route53_health_check.western.id
  
  alias {
    name                   = module.eks_western.cluster_endpoint
    zone_id                = module.eks_western.cluster_arn
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "api_geolocation_pacific" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.weather-impact.com"
  type    = "A"
  
  geolocation_routing_policy {
    continent = "NA"
    country   = "US"
    subdivision = "WA"
  }
  
  set_identifier = "pacific"
  health_check_id = aws_route53_health_check.pacific.id
  
  alias {
    name                   = module.eks_pacific.cluster_endpoint
    zone_id                = module.eks_pacific.cluster_arn
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "api_latency_northeast" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api-latency.weather-impact.com"
  type    = "A"
  
  latency_routing_policy {
    region = "us-east-1"
  }
  
  set_identifier = "northeast-latency"
  health_check_id = aws_route53_health_check.northeast.id
  
  alias {
    name                   = module.eks_northeast.cluster_endpoint
    zone_id                = module.eks_northeast.cluster_arn
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "api_latency_midwest" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api-latency.weather-impact.com"
  type    = "A"
  
  latency_routing_policy {
    region = "us-east-2"
  }
  
  set_identifier = "midwest-latency"
  health_check_id = aws_route53_health_check.midwest.id
  
  alias {
    name                   = module.eks_midwest.cluster_endpoint
    zone_id                = module.eks_midwest.cluster_arn
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "api_latency_western" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api-latency.weather-impact.com"
  type    = "A"
  
  latency_routing_policy {
    region = "us-west-1"
  }
  
  set_identifier = "western-latency"
  health_check_id = aws_route53_health_check.western.id
  
  alias {
    name                   = module.eks_western.cluster_endpoint
    zone_id                = module.eks_western.cluster_arn
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "api_latency_pacific" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api-latency.weather-impact.com"
  type    = "A"
  
  latency_routing_policy {
    region = "us-west-2"
  }
  
  set_identifier = "pacific-latency"
  health_check_id = aws_route53_health_check.pacific.id
  
  alias {
    name                   = module.eks_pacific.cluster_endpoint
    zone_id                = module.eks_pacific.cluster_arn
    evaluate_target_health = true
  }
}