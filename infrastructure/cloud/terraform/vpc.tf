module "vpc_northeast" {
  source = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"
  
  providers = {
    aws = aws.us-east-1
  }
  
  name = "weather-impact-vpc-northeast"
  cidr = "10.0.0.0/16"
  
  azs             = local.regions.northeast.azs
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
  database_subnets = ["10.0.201.0/24", "10.0.202.0/24", "10.0.203.0/24"]
  
  enable_nat_gateway   = true
  single_nat_gateway   = false
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  enable_vpn_gateway = false
  
  public_subnet_tags = {
    "kubernetes.io/role/elb" = "1"
  }
  
  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = "1"
  }
  
  tags = merge(local.common_tags, {
    Region = "Northeast"
  })
}

module "vpc_midwest" {
  source = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"
  
  providers = {
    aws = aws.us-central-1
  }
  
  name = "weather-impact-vpc-midwest"
  cidr = "10.1.0.0/16"
  
  azs             = local.regions.midwest.azs
  private_subnets = ["10.1.1.0/24", "10.1.2.0/24", "10.1.3.0/24"]
  public_subnets  = ["10.1.101.0/24", "10.1.102.0/24", "10.1.103.0/24"]
  database_subnets = ["10.1.201.0/24", "10.1.202.0/24", "10.1.203.0/24"]
  
  enable_nat_gateway   = true
  single_nat_gateway   = false
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  public_subnet_tags = {
    "kubernetes.io/role/elb" = "1"
  }
  
  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = "1"
  }
  
  tags = merge(local.common_tags, {
    Region = "Midwest"
  })
}

module "vpc_western" {
  source = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"
  
  providers = {
    aws = aws.us-west-1
  }
  
  name = "weather-impact-vpc-western"
  cidr = "10.2.0.0/16"
  
  azs             = local.regions.western.azs
  private_subnets = ["10.2.1.0/24", "10.2.2.0/24"]
  public_subnets  = ["10.2.101.0/24", "10.2.102.0/24"]
  database_subnets = ["10.2.201.0/24", "10.2.202.0/24"]
  
  enable_nat_gateway   = true
  single_nat_gateway   = false
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  public_subnet_tags = {
    "kubernetes.io/role/elb" = "1"
  }
  
  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = "1"
  }
  
  tags = merge(local.common_tags, {
    Region = "Western"
  })
}

module "vpc_pacific" {
  source = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"
  
  providers = {
    aws = aws.us-west-2
  }
  
  name = "weather-impact-vpc-pacific"
  cidr = "10.4.0.0/16"
  
  azs             = local.regions.pacific.azs
  private_subnets = ["10.4.1.0/24", "10.4.2.0/24", "10.4.3.0/24"]
  public_subnets  = ["10.4.101.0/24", "10.4.102.0/24", "10.4.103.0/24"]
  database_subnets = ["10.4.201.0/24", "10.4.202.0/24", "10.4.203.0/24"]
  
  enable_nat_gateway   = true
  single_nat_gateway   = false
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  public_subnet_tags = {
    "kubernetes.io/role/elb" = "1"
  }
  
  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = "1"
  }
  
  tags = merge(local.common_tags, {
    Region = "Pacific"
  })
}