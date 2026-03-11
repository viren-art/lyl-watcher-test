import sys
import json
import numpy as np
import torch
import argparse
from transformer_model import GridImpactPredictor

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--model-path', type=str, required=True)
    args = parser.parse_args()
    
    # Read input from stdin
    input_data = json.loads(sys.stdin.read())
    
    # Initialize predictor
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    predictor = GridImpactPredictor(model_path=args.model_path, device=device)
    
    # Convert input to numpy arrays
    weather_data = np.array(input_data['weather'], dtype=np.float32)
    grid_data = np.array(input_data['grid'], dtype=np.float32)
    
    # Add batch dimension
    weather_data = np.expand_dims(weather_data, axis=0)
    grid_data = np.expand_dims(grid_data, axis=0)
    
    # Generate prediction
    prediction = predictor.predict(weather_data, grid_data)
    
    # Calculate stress index
    stress_index = predictor.calculate_stress_index(prediction)
    prediction['stress_index'] = stress_index
    
    # Output result
    print(json.dumps(prediction))

if __name__ == '__main__':
    main()