import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
import numpy as np
import mlflow
import mlflow.tensorflow
from datetime import datetime, timedelta
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class WeatherLSTMModel:
    def __init__(self, sequence_length=24, features=6, forecast_hours=24):
        """
        LSTM model for weather forecasting
        
        Args:
            sequence_length: Number of historical hours to use for prediction
            features: Number of weather features (temp, wind, precip, humidity, solar, pressure)
            forecast_hours: Number of hours to forecast ahead
        """
        self.sequence_length = sequence_length
        self.features = features
        self.forecast_hours = forecast_hours
        self.model = None
        self.scaler_params = None
        
    def build_model(self):
        """Build LSTM architecture with attention mechanism"""
        inputs = keras.Input(shape=(self.sequence_length, self.features))
        
        # First LSTM layer with return sequences
        x = layers.LSTM(128, return_sequences=True, dropout=0.2)(inputs)
        x = layers.BatchNormalization()(x)
        
        # Second LSTM layer
        x = layers.LSTM(64, return_sequences=True, dropout=0.2)(x)
        x = layers.BatchNormalization()(x)
        
        # Attention mechanism
        attention = layers.Dense(1, activation='tanh')(x)
        attention = layers.Flatten()(attention)
        attention = layers.Activation('softmax')(attention)
        attention = layers.RepeatVector(64)(attention)
        attention = layers.Permute([2, 1])(attention)
        
        # Apply attention
        x = layers.Multiply()([x, attention])
        x = layers.Lambda(lambda x: tf.reduce_sum(x, axis=1))(x)
        
        # Dense layers for forecast
        x = layers.Dense(128, activation='relu')(x)
        x = layers.Dropout(0.3)(x)
        x = layers.Dense(64, activation='relu')(x)
        
        # Output layer: forecast_hours * features
        outputs = layers.Dense(self.forecast_hours * self.features)(x)
        outputs = layers.Reshape((self.forecast_hours, self.features))(outputs)
        
        self.model = keras.Model(inputs=inputs, outputs=outputs)
        
        # Custom loss combining MSE and MAE
        def combined_loss(y_true, y_pred):
            mse = tf.reduce_mean(tf.square(y_true - y_pred))
            mae = tf.reduce_mean(tf.abs(y_true - y_pred))
            return 0.7 * mse + 0.3 * mae
        
        self.model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=0.001),
            loss=combined_loss,
            metrics=['mae', 'mse']
        )
        
        logger.info(f"Built LSTM model with {self.model.count_params()} parameters")
        return self.model
    
    def normalize_data(self, data, fit=False):
        """Normalize weather data using min-max scaling"""
        if fit or self.scaler_params is None:
            self.scaler_params = {
                'min': np.min(data, axis=(0, 1)),
                'max': np.max(data, axis=(0, 1))
            }
        
        normalized = (data - self.scaler_params['min']) / (
            self.scaler_params['max'] - self.scaler_params['min'] + 1e-8
        )
        return normalized
    
    def denormalize_data(self, normalized_data):
        """Denormalize predictions back to original scale"""
        return normalized_data * (
            self.scaler_params['max'] - self.scaler_params['min']
        ) + self.scaler_params['min']
    
    def prepare_sequences(self, data):
        """Prepare time series sequences for training"""
        X, y = [], []
        
        for i in range(len(data) - self.sequence_length - self.forecast_hours):
            X.append(data[i:i + self.sequence_length])
            y.append(data[i + self.sequence_length:i + self.sequence_length + self.forecast_hours])
        
        return np.array(X), np.array(y)
    
    def train(self, training_data, validation_data, epochs=50, batch_size=32):
        """Train the LSTM model with MLflow tracking"""
        if self.model is None:
            self.build_model()
        
        # Normalize data
        X_train_norm = self.normalize_data(training_data, fit=True)
        X_val_norm = self.normalize_data(validation_data, fit=False)
        
        # Prepare sequences
        X_train, y_train = self.prepare_sequences(X_train_norm)
        X_val, y_val = self.prepare_sequences(X_val_norm)
        
        logger.info(f"Training data shape: {X_train.shape}, {y_train.shape}")
        logger.info(f"Validation data shape: {X_val.shape}, {y_val.shape}")
        
        # MLflow tracking
        with mlflow.start_run(run_name=f"weather_lstm_{datetime.now().strftime('%Y%m%d_%H%M%S')}"):
            mlflow.log_params({
                'sequence_length': self.sequence_length,
                'features': self.features,
                'forecast_hours': self.forecast_hours,
                'epochs': epochs,
                'batch_size': batch_size,
            })
            
            # Callbacks
            callbacks = [
                keras.callbacks.EarlyStopping(
                    monitor='val_loss',
                    patience=10,
                    restore_best_weights=True
                ),
                keras.callbacks.ReduceLROnPlateau(
                    monitor='val_loss',
                    factor=0.5,
                    patience=5,
                    min_lr=1e-6
                ),
                keras.callbacks.ModelCheckpoint(
                    'models/weather_lstm_best.h5',
                    monitor='val_loss',
                    save_best_only=True
                )
            ]
            
            # Train model
            history = self.model.fit(
                X_train, y_train,
                validation_data=(X_val, y_val),
                epochs=epochs,
                batch_size=batch_size,
                callbacks=callbacks,
                verbose=1
            )
            
            # Log metrics
            final_val_loss = history.history['val_loss'][-1]
            final_val_mae = history.history['val_mae'][-1]
            
            mlflow.log_metrics({
                'final_val_loss': final_val_loss,
                'final_val_mae': final_val_mae,
            })
            
            # Log model
            mlflow.tensorflow.log_model(self.model, "model")
            
            logger.info(f"Training completed. Val Loss: {final_val_loss:.4f}, Val MAE: {final_val_mae:.4f}")
        
        return history
    
    def predict(self, input_sequence):
        """Generate weather forecast with confidence intervals"""
        if self.model is None:
            raise ValueError("Model not trained or loaded")
        
        # Normalize input
        input_norm = self.normalize_data(input_sequence.reshape(1, self.sequence_length, self.features))
        
        # Generate predictions (Monte Carlo dropout for uncertainty)
        predictions = []
        for _ in range(100):  # 100 forward passes
            pred = self.model(input_norm, training=True)  # Enable dropout
            predictions.append(pred.numpy())
        
        predictions = np.array(predictions)
        
        # Calculate mean and confidence intervals
        mean_prediction = np.mean(predictions, axis=0)
        std_prediction = np.std(predictions, axis=0)
        
        # Denormalize
        mean_denorm = self.denormalize_data(mean_prediction[0])
        std_denorm = self.denormalize_data(std_prediction[0])
        
        # Calculate 95% confidence intervals
        lower_bound = mean_denorm - 1.96 * std_denorm
        upper_bound = mean_denorm + 1.96 * std_denorm
        
        return {
            'predictions': mean_denorm,
            'confidence_intervals': {
                'lower': lower_bound,
                'upper': upper_bound,
            },
            'uncertainty': std_denorm,
        }
    
    def evaluate_accuracy(self, test_data, actual_data):
        """Evaluate model accuracy against actual observations"""
        predictions = self.predict(test_data)['predictions']
        
        # Calculate metrics
        mae = np.mean(np.abs(predictions - actual_data))
        rmse = np.sqrt(np.mean((predictions - actual_data) ** 2))
        
        # Calculate accuracy percentage (within 10% tolerance)
        tolerance = 0.1
        accurate_predictions = np.abs(predictions - actual_data) <= (tolerance * np.abs(actual_data))
        accuracy = np.mean(accurate_predictions) * 100
        
        return {
            'mae': mae,
            'rmse': rmse,
            'accuracy_percentage': accuracy,
        }
    
    def save_model(self, path):
        """Save model and scaler parameters"""
        self.model.save(path)
        np.save(f"{path}_scaler.npy", self.scaler_params)
        logger.info(f"Model saved to {path}")
    
    def load_model(self, path):
        """Load model and scaler parameters"""
        self.model = keras.models.load_model(path)
        self.scaler_params = np.load(f"{path}_scaler.npy", allow_pickle=True).item()
        logger.info(f"Model loaded from {path}")