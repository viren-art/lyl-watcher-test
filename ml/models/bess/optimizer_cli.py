#!/usr/bin/env python3
"""
CLI wrapper for BESS Location Optimizer.
Called by Node.js backend service.
"""

import argparse
import json
import sys
from bess_optimizer import BessLocationOptimizer


def main():
    parser = argparse.ArgumentParser(description='BESS Location Optimizer')
    parser.add_argument('--grid-region-id', type=int, required=True)
    parser.add_argument('--capacity-mwh', type=float, required=True)
    parser.add_argument('--budget-usd', type=float, default=None)
    parser.add_argument('--constraints', type=str, default=None)
    parser.add_argument('--db-host', type=str, required=True)
    parser.add_argument('--db-port', type=int, default=5432)
    parser.add_argument('--db-name', type=str, required=True)
    parser.add_argument('--db-user', type=str, required=True)
    parser.add_argument('--db-password', type=str, required=True)
    
    args = parser.parse_args()
    
    # Database configuration
    db_config = {
        'host': args.db_host,
        'port': args.db_port,
        'database': args.db_name,
        'user': args.db_user,
        'password': args.db_password
    }
    
    # Parse constraints if provided
    constraints = None
    if args.constraints:
        try:
            constraints = json.loads(args.constraints)
        except json.JSONDecodeError:
            print(json.dumps({'error': 'Invalid constraints JSON'}), file=sys.stderr)
            sys.exit(1)
    
    # Initialize optimizer
    optimizer = BessLocationOptimizer(db_config)
    
    # Run optimization
    try:
        recommendations = optimizer.optimize_locations(
            grid_region_id=args.grid_region_id,
            capacity_mwh=args.capacity_mwh,
            budget_usd=args.budget_usd,
            constraints=constraints
        )
        
        # Output JSON to stdout
        print(json.dumps(recommendations, indent=2))
        
    except Exception as e:
        print(json.dumps({'error': str(e)}), file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()