output "eks_cluster_endpoints" {
  description = "EKS cluster endpoints for all regions"
  value = {
    northeast = module.eks_northeast.cluster_endpoint
    midwest   = module.eks_midwest.cluster_endpoint
    western   = module.eks_western.cluster_endpoint
    pacific   = module.eks_pacific.cluster_endpoint
  }
}

output "vpc_ids" {
  description = "VPC IDs for all regions"
  value = {
    northeast = module.vpc_northeast.vpc_id
    midwest   = module.vpc_midwest.vpc_id
    western   = module.vpc_western.vpc_id
    pacific   = module.vpc_pacific.vpc_id
  }
}

output "route53_zone_id" {
  description = "Route53 hosted zone ID"
  value       = aws_route53_zone.main.zone_id
}

output "route53_nameservers" {
  description = "Route53 nameservers"
  value       = aws_route53_zone.main.name_servers
}