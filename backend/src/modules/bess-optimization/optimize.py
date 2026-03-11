import sys
import json
import argparse
from rl_optimizer import BESSOptimizer

def main():
    parser = argparse.ArgumentParser(description='BESS Location Optimization')
    parser.add_argument('--num_recommendations', type=int, default=10)
    parser.add_argument('--model_path', type=str, default=None)
    args = parser.parse_args()
    
    # Read input from stdin
    input_data = json.load(sys.stdin)
    
    grid_region_data = input_data['grid_region_data']
    candidate_locations = input_data['candidate_locations']
    
    # Initialize optimizer
    optimizer = BESSOptimizer(model_path=args.model_path)
    
    # Run optimization
    recommendations = optimizer.optimize_locations(
        grid_region_data,
        candidate_locations,
        num_recommendations=args.num_recommendations
    )
    
    # Output results
    output = {
        'recommendations': recommendations,
        'model_version': 'bess_rl_v1.0'
    }
    
    print(json.dumps(output))

if __name__ == '__main__':
    main()