#!/usr/bin/env python3
import sys
import json
import numpy as np
import argparse
from lstm_model import WeatherLSTMModel

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--model-path', required=True)
    parser.add_argument('--forecast-hours', type=int, default=24)
    args = parser.parse_args()
    
    # Load model
    model = WeatherLSTMModel(
        sequence_length=24,
        features=6,
        forecast_hours=args.forecast_hours
    )
    model.load_model(args.model_path)
    
    # Read input from stdin
    input_data = json.load(sys.stdin)
    features = np.array(input_data['features'])
    
    # Generate prediction
    result = model.predict(features)
    
    # Output result as JSON
    output = {
        'predictions': result['predictions'].tolist(),
        'confidence_intervals': {
            'lower': result['confidence_intervals']['lower'].tolist(),
            'upper': result['confidence_intervals']['upper'].tolist(),
        },
        'uncertainty': result['uncertainty'].tolist(),
        'modelVersion': '1.0.0',
    }
    
    print(json.dumps(output))

if __name__ == '__main__':
    main()