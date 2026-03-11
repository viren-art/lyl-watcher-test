import sys
import json
import numpy as np
import argparse
import mlflow
import mlflow.tensorflow
import mlflow.pytorch
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def train_weather_lstm(training_data, job_id):
    """Train LSTM model for weather forecasting"""
    import tensorflow as tf
    from tensorflow.keras.models import Sequential
    from tensorflow.keras.layers import LSTM, Dense, Dropout
    from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint
    
    logger.info(f"Training weather LSTM model, job_id: {job_id}")
    
    # Prepare data
    X_train = np.array(training_data['training']['features'])
    y_train = np.array(training_data['training']['targets'])
    X_val = np.array(training_data['validation']['features'])
    y_val = np.array(training_data['validation']['targets'])
    
    sequence_length = training_data['sequenceLength']
    forecast_horizon = training_data['forecastHorizon']
    n_features = len(training_data['features'])
    
    # Reshape for LSTM [samples, timesteps, features]
    X_train = X_train.reshape(-1, sequence_length, n_features)
    X_val = X_val.reshape(-1, sequence_length, n_features)
    
    # Start MLflow run
    with mlflow.start_run(run_name=f"weather_lstm_{job_id}"):
        # Log parameters
        mlflow.log_param("model_type", "weather_lstm")
        mlflow.log_param("sequence_length", sequence_length)
        mlflow.log_param("forecast_horizon", forecast_horizon)
        mlflow.log_param("n_features", n_features)
        mlflow.log_param("job_id", job_id)
        
        # Build model
        model = Sequential([
            LSTM(128, return_sequences=True, input_shape=(sequence_length, n_features)),
            Dropout(0.2),
            LSTM(64, return_sequences=True),
            Dropout(0.2),
            LSTM(32),
            Dropout(0.2),
            Dense(forecast_horizon * n_features)
        ])
        
        model.compile(
            optimizer='adam',
            loss='mse',
            metrics=['mae']
        )
        
        mlflow.log_param("total_params", model.count_params())
        
        # Callbacks
        early_stopping = EarlyStopping(
            monitor='val_loss',
            patience=10,
            restore_best_weights=True
        )
        
        # Train model
        history = model.fit(
            X_train, y_train,
            validation_data=(X_val, y_val),
            epochs=100,
            batch_size=32,
            callbacks=[early_stopping],
            verbose=1
        )
        
        # Evaluate
        val_loss, val_mae = model.evaluate(X_val, y_val, verbose=0)
        
        # Calculate accuracy (inverse of normalized MAE)
        accuracy = max(0, 1 - val_mae)
        
        # Log metrics
        mlflow.log_metric("val_loss", val_loss)
        mlflow.log_metric("val_mae", val_mae)
        mlflow.log_metric("accuracy", accuracy)
        mlflow.log_metric("final_epoch", len(history.history['loss']))
        
        # Save model
        model_version = f"v{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        mlflow.tensorflow.log_model(model, "model")
        
        # Register model
        model_uri = f"runs:/{mlflow.active_run().info.run_id}/model"
        mlflow.register_model(model_uri, "weather_lstm")
        
        logger.info(f"Model trained successfully. Accuracy: {accuracy:.4f}")
        
        return {
            "modelType": "weather_lstm",
            "modelVersion": model_version,
            "accuracy": float(accuracy),
            "valLoss": float(val_loss),
            "valMae": float(val_mae),
            "epochs": len(history.history['loss']),
            "mlflowRunId": mlflow.active_run().info.run_id
        }


def train_grid_transformer(training_data, job_id):
    """Train Transformer model for grid impact prediction"""
    import torch
    import torch.nn as nn
    from torch.utils.data import DataLoader, TensorDataset
    
    logger.info(f"Training grid transformer model, job_id: {job_id}")
    
    # Prepare data
    weather_features = np.array(training_data['weatherData']['features'])
    grid_features = np.array(training_data['gridData']['features'])
    targets = np.array(training_data['gridData']['targets'])
    
    # Combine features
    X = np.concatenate([weather_features, grid_features], axis=-1)
    y = targets
    
    # Split train/val
    split_idx = int(len(X) * 0.8)
    X_train, X_val = X[:split_idx], X[split_idx:]
    y_train, y_val = y[:split_idx], y[split_idx:]
    
    # Convert to tensors
    X_train_tensor = torch.FloatTensor(X_train)
    y_train_tensor = torch.FloatTensor(y_train)
    X_val_tensor = torch.FloatTensor(X_val)
    y_val_tensor = torch.FloatTensor(y_val)
    
    # Create dataloaders
    train_dataset = TensorDataset(X_train_tensor, y_train_tensor)
    val_dataset = TensorDataset(X_val_tensor, y_val_tensor)
    train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=32)
    
    # Start MLflow run
    with mlflow.start_run(run_name=f"grid_transformer_{job_id}"):
        mlflow.log_param("model_type", "grid_transformer")
        mlflow.log_param("sequence_length", training_data['sequenceLength'])
        mlflow.log_param("job_id", job_id)
        
        # Import transformer model
        from backend.src.modules.grid_impact.transformer_model import GridImpactTransformer
        
        input_dim = X.shape[-1]
        model = GridImpactTransformer(
            input_dim=input_dim,
            d_model=128,
            nhead=8,
            num_layers=4,
            output_dim=1
        )
        
        device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        model = model.to(device)
        
        criterion = nn.MSELoss()
        optimizer = torch.optim.Adam(model.parameters(), lr=0.001)
        
        # Training loop
        best_val_loss = float('inf')
        patience = 10
        patience_counter = 0
        
        for epoch in range(100):
            # Training
            model.train()
            train_loss = 0
            for batch_X, batch_y in train_loader:
                batch_X, batch_y = batch_X.to(device), batch_y.to(device)
                
                optimizer.zero_grad()
                outputs = model(batch_X)
                loss = criterion(outputs, batch_y)
                loss.backward()
                optimizer.step()
                
                train_loss += loss.item()
            
            train_loss /= len(train_loader)
            
            # Validation
            model.eval()
            val_loss = 0
            val_mae = 0
            with torch.no_grad():
                for batch_X, batch_y in val_loader:
                    batch_X, batch_y = batch_X.to(device), batch_y.to(device)
                    outputs = model(batch_X)
                    loss = criterion(outputs, batch_y)
                    val_loss += loss.item()
                    val_mae += torch.abs(outputs - batch_y).mean().item()
            
            val_loss /= len(val_loader)
            val_mae /= len(val_loader)
            
            logger.info(f"Epoch {epoch+1}: train_loss={train_loss:.4f}, val_loss={val_loss:.4f}")
            
            # Early stopping
            if val_loss < best_val_loss:
                best_val_loss = val_loss
                patience_counter = 0
                # Save best model
                torch.save(model.state_dict(), f'/tmp/grid_transformer_{job_id}.pt')
            else:
                patience_counter += 1
                if patience_counter >= patience:
                    logger.info(f"Early stopping at epoch {epoch+1}")
                    break
        
        # Load best model
        model.load_state_dict(torch.load(f'/tmp/grid_transformer_{job_id}.pt'))
        
        # Calculate accuracy
        accuracy = max(0, 1 - val_mae)
        
        # Log metrics
        mlflow.log_metric("val_loss", best_val_loss)
        mlflow.log_metric("val_mae", val_mae)
        mlflow.log_metric("accuracy", accuracy)
        
        # Save model
        model_version = f"v{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        mlflow.pytorch.log_model(model, "model")
        
        # Register model
        model_uri = f"runs:/{mlflow.active_run().info.run_id}/model"
        mlflow.register_model(model_uri, "grid_transformer")
        
        logger.info(f"Model trained successfully. Accuracy: {accuracy:.4f}")
        
        return {
            "modelType": "grid_transformer",
            "modelVersion": model_version,
            "accuracy": float(accuracy),
            "valLoss": float(best_val_loss),
            "valMae": float(val_mae),
            "mlflowRunId": mlflow.active_run().info.run_id
        }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--model-type', required=True, choices=['weather_lstm', 'grid_transformer'])
    parser.add_argument('--job-id', required=True)
    parser.add_argument('--mlflow-tracking-uri', default='http://localhost:5000')
    args = parser.parse_args()
    
    # Set MLflow tracking URI
    mlflow.set_tracking_uri(args.mlflow_tracking_uri)
    mlflow.set_experiment(f"{args.model_type}_training")
    
    # Read training data from stdin
    training_data = json.loads(sys.stdin.read())
    
    # Train model
    if args.model_type == 'weather_lstm':
        result = train_weather_lstm(training_data, args.job_id)
    elif args.model_type == 'grid_transformer':
        result = train_grid_transformer(training_data, args.job_id)
    else:
        raise ValueError(f"Unknown model type: {args.model_type}")
    
    # Output result
    print(json.dumps(result))


if __name__ == '__main__':
    main()