module "eks_northeast" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.0"
  
  providers = {
    aws = aws.us-east-1
  }
  
  cluster_name    = "weather-impact-northeast"
  cluster_version = var.eks_cluster_version
  
  vpc_id     = module.vpc_northeast.vpc_id
  subnet_ids = module.vpc_northeast.private_subnets
  
  cluster_endpoint_public_access = true
  cluster_endpoint_private_access = true
  
  cluster_addons = {
    coredns = {
      most_recent = true
    }
    kube-proxy = {
      most_recent = true
    }
    vpc-cni = {
      most_recent = true
    }
    aws-ebs-csi-driver = {
      most_recent = true
    }
  }
  
  eks_managed_node_groups = {
    general = {
      name = "general-purpose"
      
      instance_types = var.eks_node_instance_types
      capacity_type  = "ON_DEMAND"
      
      min_size     = var.eks_min_nodes
      max_size     = var.eks_max_nodes
      desired_size = var.eks_min_nodes
      
      labels = {
        role = "general"
      }
      
      taints = []
      
      update_config = {
        max_unavailable_percentage = 33
      }
    }
    
    ml_workloads = {
      name = "ml-workloads"
      
      instance_types = ["p3.2xlarge", "p3.8xlarge"]
      capacity_type  = "SPOT"
      
      min_size     = 0
      max_size     = 10
      desired_size = 0
      
      labels = {
        role = "ml"
        workload = "gpu"
      }
      
      taints = [{
        key    = "nvidia.com/gpu"
        value  = "true"
        effect = "NoSchedule"
      }]
    }
  }
  
  tags = merge(local.common_tags, {
    Region = "Northeast"
  })
}

module "eks_midwest" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.0"
  
  providers = {
    aws = aws.us-central-1
  }
  
  cluster_name    = "weather-impact-midwest"
  cluster_version = var.eks_cluster_version
  
  vpc_id     = module.vpc_midwest.vpc_id
  subnet_ids = module.vpc_midwest.private_subnets
  
  cluster_endpoint_public_access = true
  cluster_endpoint_private_access = true
  
  cluster_addons = {
    coredns = {
      most_recent = true
    }
    kube-proxy = {
      most_recent = true
    }
    vpc-cni = {
      most_recent = true
    }
    aws-ebs-csi-driver = {
      most_recent = true
    }
  }
  
  eks_managed_node_groups = {
    general = {
      name = "general-purpose"
      
      instance_types = var.eks_node_instance_types
      capacity_type  = "ON_DEMAND"
      
      min_size     = var.eks_min_nodes
      max_size     = var.eks_max_nodes
      desired_size = var.eks_min_nodes
      
      labels = {
        role = "general"
      }
    }
  }
  
  tags = merge(local.common_tags, {
    Region = "Midwest"
  })
}

module "eks_western" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.0"
  
  providers = {
    aws = aws.us-west-1
  }
  
  cluster_name    = "weather-impact-western"
  cluster_version = var.eks_cluster_version
  
  vpc_id     = module.vpc_western.vpc_id
  subnet_ids = module.vpc_western.private_subnets
  
  cluster_endpoint_public_access = true
  cluster_endpoint_private_access = true
  
  cluster_addons = {
    coredns = {
      most_recent = true
    }
    kube-proxy = {
      most_recent = true
    }
    vpc-cni = {
      most_recent = true
    }
    aws-ebs-csi-driver = {
      most_recent = true
    }
  }
  
  eks_managed_node_groups = {
    general = {
      name = "general-purpose"
      
      instance_types = var.eks_node_instance_types
      capacity_type  = "ON_DEMAND"
      
      min_size     = var.eks_min_nodes
      max_size     = var.eks_max_nodes
      desired_size = var.eks_min_nodes
      
      labels = {
        role = "general"
      }
    }
  }
  
  tags = merge(local.common_tags, {
    Region = "Western"
  })
}

module "eks_pacific" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.0"
  
  providers = {
    aws = aws.us-west-2
  }
  
  cluster_name    = "weather-impact-pacific"
  cluster_version = var.eks_cluster_version
  
  vpc_id     = module.vpc_pacific.vpc_id
  subnet_ids = module.vpc_pacific.private_subnets
  
  cluster_endpoint_public_access = true
  cluster_endpoint_private_access = true
  
  cluster_addons = {
    coredns = {
      most_recent = true
    }
    kube-proxy = {
      most_recent = true
    }
    vpc-cni = {
      most_recent = true
    }
    aws-ebs-csi-driver = {
      most_recent = true
    }
  }
  
  eks_managed_node_groups = {
    general = {
      name = "general-purpose"
      
      instance_types = var.eks_node_instance_types
      capacity_type  = "ON_DEMAND"
      
      min_size     = var.eks_min_nodes
      max_size     = var.eks_max_nodes
      desired_size = var.eks_min_nodes
      
      labels = {
        role = "general"
      }
    }
  }
  
  tags = merge(local.common_tags, {
    Region = "Pacific"
  })
}