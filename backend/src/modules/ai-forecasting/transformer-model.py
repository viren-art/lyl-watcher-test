import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
import numpy as np
import mlflow
import mlflow.tensorflow
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class WeatherTransformerModel:
    def __init__(self, sequence_length=24, features=6, forecast_hours=24, 
                 d_model=128, num_heads=8, num_layers=4):
        """
        Transformer model for weather forecasting with spatial-temporal attention
        
        Args:
            sequence_length: Number of historical hours
            features: Number of weather features
            forecast_hours: Number of hours to forecast
            d_model: Dimension of model embeddings
            num_heads: Number of attention heads
            num_layers: Number of transformer layers
        """
        self.sequence_length = sequence_length
        self.features = features
        self.forecast_hours = forecast_hours
        self.d_model = d_model
        self.num_heads = num_heads
        self.num_layers = num_layers
        self.model = None
        self.scaler_params = None
    
    def positional_encoding(self, length, depth):
        """Generate positional encodings for temporal information"""
        depth = depth / 2
        positions = np.arange(length)[:, np.newaxis]
        depths = np.arange(depth)[np.newaxis, :] / depth
        
        angle_rates = 1 / (10000**depths)
        angle_rads = positions * angle_rates
        
        pos_encoding = np.concatenate([
            np.sin(angle_rads),
            np.cos(angle_rads)
        ], axis=-1)
        
        return tf.cast(pos_encoding, dtype=tf.float32)
    
    def build_model(self):
        """Build Transformer architecture"""
        inputs = keras.Input(shape=(self.sequence_length, self.features))
        
        # Input projection to d_model dimensions
        x = layers.Dense(self.d_model)(inputs)
        
        # Add positional encoding
        pos_encoding = self.positional_encoding(self.sequence_length, self.d_model)
        x = x + pos_encoding
        
        # Transformer encoder layers
        for _ in range(self.num_layers):
            # Multi-head attention
            attention_output = layers.MultiHeadAttention(
                num_heads=self.num_heads,
                key_dim=self.d_model // self.num_heads,
                dropout=0.1
            )(x, x)
            
            # Add & Norm
            x = layers.LayerNormalization(epsilon=1e-6)(x + attention_output)
            
            # Feed-forward network
            ffn = keras.Sequential([
                layers.Dense(self.d_model * 4, activation='relu'),
                layers.Dropout(0.1),
                layers.Dense(self.d_model)
            ])
            ffn_output = ffn(x)
            
            # Add & Norm
            x = layers.LayerNormalization(epsilon=1e-6)(x + ffn_output)
        
        # Global average pooling
        x = layers.GlobalAveragePooling1D()(x)
        
        # Decoder for forecast generation
        x = layers.Dense(256, activation='relu')(x)
        x = layers.Dropout(0.2)(x)
        x = layers.Dense(128, activation='relu')(x)
        
        # Output layer
        outputs = layers.Dense(self.forecast_hours * self.features)(x)
        outputs = layers.Reshape((self.forecast_hours, self.features))(outputs)
        
        self.model = keras.Model(inputs=inputs, outputs=outputs)
        
        # Compile with custom loss
        self.model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=0.0001),
            loss='huber',
            metrics=['mae', 'mse']
        )
        
        logger.info(f"Built Transformer model with {self.model.count_params()} parameters")
        return self.model
    
    def normalize_data(self, data, fit=False):
        """Normalize using z-score normalization"""
        if fit or self.scaler_params is None:
            self.scaler_params = {
                'mean': np.mean(data, axis=(0, 1)),
                'std': np.std(data, axis=(0, 1))
            }
        
        normalized = (data - self.scaler_params['mean']) / (
            self.scaler_params['std'] + 1e-8
        )
        return normalized
    
    def denormalize_data(self, normalized_data):
        """Denormalize predictions"""
        return normalized_data * self.scaler_params['std'] + self.scaler_params['mean']
    
    def prepare_sequences(self, data):
        """Prepare sequences for training"""
        X, y = [], []
        
        for i in range(len(data) - self.sequence_length - self.forecast_hours):
            X.append(data[i:i + self.sequence_length])
            y.append(data[i + self.sequence_length:i + self.sequence_length + self.forecast_hours])
        
        return np.array(X), np.array(y)
    
    def train(self, training_data, validation_data, epochs=100, batch_size=64):
        """Train the Transformer model"""
        if self.model is None:
            self.build_model()
        
        # Normalize
        X_train_norm = self.normalize_data(training_data, fit=True)
        X_val_norm = self.normalize_data(validation_data, fit=False)
        
        # Prepare sequences
        X_train, y_train = self.prepare_sequences(X_train_norm)
        X_val, y_val = self.prepare_sequences(X_val_norm)
        
        logger.info(f"Training Transformer - Train: {X_train.shape}, Val: {X_val.shape}")
        
        # MLflow tracking
        with mlflow.start_run(run_name=f"weather_transformer_{datetime.now().strftime('%Y%m%d_%H%M%S')}"):
            mlflow.log_params({
                'model_type': 'transformer',
                'd_model': self.d_model,
                'num_heads': self.num_heads,
                'num_layers': self.num_layers,
                'epochs': epochs,
                'batch_size': batch_size,
            })
            
            callbacks = [
                keras.callbacks.EarlyStopping(
                    monitor='val_loss',
                    patience=15,
                    restore_best_weights=True
                ),
                keras.callbacks.ReduceLROnPlateau(
                    monitor='val_loss',
                    factor=0.5,
                    patience=7,
                    min_lr=1e-7
                ),
            ]
            
            history = self.model.fit(
                X_train, y_train,
                validation_data=(X_val, y_val),
                epochs=epochs,
                batch_size=batch_size,
                callbacks=callbacks,
                verbose=1
            )
            
            mlflow.log_metrics({
                'final_val_loss': history.history['val_loss'][-1],
                'final_val_mae': history.history['val_mae'][-1],
            })
            
            mlflow.tensorflow.log_model(self.model, "model")
        
        return history
    
    def predict(self, input_sequence):
        """Generate forecast with uncertainty estimation"""
        if self.model is None:
            raise ValueError("Model not trained")
        
        input_norm = self.normalize_data(
            input_sequence.reshape(1, self.sequence_length, self.features)
        )
        
        # Ensemble predictions for uncertainty
        predictions = []
        for _ in range(50):
            pred = self.model(input_norm, training=True)
            predictions.append(pred.numpy())
        
        predictions = np.array(predictions)
        mean_pred = np.mean(predictions, axis=0)
        std_pred = np.std(predictions, axis=0)
        
        mean_denorm = self.denormalize_data(mean_pred[0])
        std_denorm = self.denormalize_data(std_pred[0])
        
        return {
            'predictions': mean_denorm,
            'confidence_intervals': {
                'lower': mean_denorm - 1.96 * std_denorm,
                'upper': mean_denorm + 1.96 * std_denorm,
            },
            'uncertainty': std_denorm,
        }