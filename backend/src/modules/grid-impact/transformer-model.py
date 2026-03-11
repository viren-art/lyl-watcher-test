import torch
import torch.nn as nn
import numpy as np
import mlflow
import mlflow.pytorch
import logging
from typing import Dict, List, Tuple, Optional
import json

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class MultiHeadAttention(nn.Module):
    """Multi-head attention mechanism for grid impact correlation"""
    
    def __init__(self, d_model: int, num_heads: int, dropout: float = 0.1):
        super().__init__()
        assert d_model % num_heads == 0, "d_model must be divisible by num_heads"
        
        self.d_model = d_model
        self.num_heads = num_heads
        self.d_k = d_model // num_heads
        
        self.W_q = nn.Linear(d_model, d_model)
        self.W_k = nn.Linear(d_model, d_model)
        self.W_v = nn.Linear(d_model, d_model)
        self.W_o = nn.Linear(d_model, d_model)
        
        self.dropout = nn.Dropout(dropout)
        self.scale = torch.sqrt(torch.FloatTensor([self.d_k]))
        
    def forward(self, query, key, value, mask=None):
        batch_size = query.shape[0]
        
        # Linear projections
        Q = self.W_q(query)
        K = self.W_k(key)
        V = self.W_v(value)
        
        # Reshape for multi-head attention
        Q = Q.view(batch_size, -1, self.num_heads, self.d_k).permute(0, 2, 1, 3)
        K = K.view(batch_size, -1, self.num_heads, self.d_k).permute(0, 2, 1, 3)
        V = V.view(batch_size, -1, self.num_heads, self.d_k).permute(0, 2, 1, 3)
        
        # Scaled dot-product attention
        energy = torch.matmul(Q, K.permute(0, 1, 3, 2)) / self.scale.to(query.device)
        
        if mask is not None:
            energy = energy.masked_fill(mask == 0, -1e10)
        
        attention = torch.softmax(energy, dim=-1)
        attention = self.dropout(attention)
        
        x = torch.matmul(attention, V)
        x = x.permute(0, 2, 1, 3).contiguous()
        x = x.view(batch_size, -1, self.d_model)
        
        return self.W_o(x), attention


class PositionalEncoding(nn.Module):
    """Positional encoding for temporal sequences"""
    
    def __init__(self, d_model: int, max_len: int = 5000):
        super().__init__()
        
        pe = torch.zeros(max_len, d_model)
        position = torch.arange(0, max_len, dtype=torch.float).unsqueeze(1)
        div_term = torch.exp(torch.arange(0, d_model, 2).float() * (-np.log(10000.0) / d_model))
        
        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)
        
        pe = pe.unsqueeze(0)
        self.register_buffer('pe', pe)
        
    def forward(self, x):
        return x + self.pe[:, :x.size(1)]


class TransformerEncoderLayer(nn.Module):
    """Single transformer encoder layer"""
    
    def __init__(self, d_model: int, num_heads: int, d_ff: int, dropout: float = 0.1):
        super().__init__()
        
        self.self_attention = MultiHeadAttention(d_model, num_heads, dropout)
        self.feed_forward = nn.Sequential(
            nn.Linear(d_model, d_ff),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(d_ff, d_model)
        )
        
        self.norm1 = nn.LayerNorm(d_model)
        self.norm2 = nn.LayerNorm(d_model)
        self.dropout = nn.Dropout(dropout)
        
    def forward(self, x, mask=None):
        # Self-attention with residual connection
        attn_output, _ = self.self_attention(x, x, x, mask)
        x = self.norm1(x + self.dropout(attn_output))
        
        # Feed-forward with residual connection
        ff_output = self.feed_forward(x)
        x = self.norm2(x + self.dropout(ff_output))
        
        return x


class GridImpactTransformer(nn.Module):
    """
    Transformer-based model for predicting grid impact from weather patterns.
    Correlates weather events with grid performance metrics.
    """
    
    def __init__(
        self,
        weather_features: int = 10,
        grid_features: int = 8,
        d_model: int = 256,
        num_heads: int = 8,
        num_layers: int = 6,
        d_ff: int = 1024,
        dropout: float = 0.1,
        max_seq_len: int = 168  # 7 days of hourly data
    ):
        super().__init__()
        
        self.weather_features = weather_features
        self.grid_features = grid_features
        self.d_model = d_model
        
        # Input embeddings
        self.weather_embedding = nn.Linear(weather_features, d_model)
        self.grid_embedding = nn.Linear(grid_features, d_model)
        
        # Positional encoding
        self.pos_encoding = PositionalEncoding(d_model, max_seq_len)
        
        # Transformer encoder layers
        self.encoder_layers = nn.ModuleList([
            TransformerEncoderLayer(d_model, num_heads, d_ff, dropout)
            for _ in range(num_layers)
        ])
        
        # Output heads
        self.impact_head = nn.Sequential(
            nn.Linear(d_model, 128),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Linear(64, 1),
            nn.Sigmoid()  # Impact probability 0-1
        )
        
        self.severity_head = nn.Sequential(
            nn.Linear(d_model, 128),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(128, 4)  # LOW, MEDIUM, HIGH, CRITICAL
        )
        
        self.load_prediction_head = nn.Sequential(
            nn.Linear(d_model, 128),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(128, 1)  # Predicted load in MW
        )
        
        self.dropout = nn.Dropout(dropout)
        
    def forward(self, weather_data, grid_data, mask=None):
        """
        Args:
            weather_data: (batch_size, seq_len, weather_features)
            grid_data: (batch_size, seq_len, grid_features)
            mask: Optional attention mask
        
        Returns:
            Dict with impact_probability, severity_logits, predicted_load
        """
        batch_size, seq_len, _ = weather_data.shape
        
        # Embed inputs
        weather_embedded = self.weather_embedding(weather_data)
        grid_embedded = self.grid_embedding(grid_data)
        
        # Combine weather and grid features
        x = weather_embedded + grid_embedded
        x = self.pos_encoding(x)
        x = self.dropout(x)
        
        # Pass through transformer encoder
        for layer in self.encoder_layers:
            x = layer(x, mask)
        
        # Use last timestep for predictions
        x_last = x[:, -1, :]
        
        # Generate predictions
        impact_prob = self.impact_head(x_last)
        severity_logits = self.severity_head(x_last)
        predicted_load = self.load_prediction_head(x_last)
        
        return {
            'impact_probability': impact_prob,
            'severity_logits': severity_logits,
            'predicted_load': predicted_load,
            'embeddings': x_last
        }


class GridImpactPredictor:
    """High-level interface for grid impact prediction"""
    
    def __init__(self, model_path: Optional[str] = None, device: str = 'cpu'):
        self.device = torch.device(device)
        self.model = None
        self.scaler_weather = None
        self.scaler_grid = None
        
        if model_path:
            self.load_model(model_path)
        else:
            self.model = GridImpactTransformer().to(self.device)
            
    def load_model(self, model_path: str):
        """Load trained model from MLflow"""
        try:
            checkpoint = torch.load(model_path, map_location=self.device)
            self.model = GridImpactTransformer(**checkpoint['model_config']).to(self.device)
            self.model.load_state_dict(checkpoint['model_state_dict'])
            self.scaler_weather = checkpoint.get('scaler_weather')
            self.scaler_grid = checkpoint.get('scaler_grid')
            self.model.eval()
            logger.info(f"Loaded model from {model_path}")
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise
            
    def preprocess_data(
        self,
        weather_data: np.ndarray,
        grid_data: np.ndarray
    ) -> Tuple[torch.Tensor, torch.Tensor]:
        """Normalize and convert data to tensors"""
        
        # Normalize if scalers available
        if self.scaler_weather is not None:
            weather_data = self.scaler_weather.transform(
                weather_data.reshape(-1, weather_data.shape[-1])
            ).reshape(weather_data.shape)
            
        if self.scaler_grid is not None:
            grid_data = self.scaler_grid.transform(
                grid_data.reshape(-1, grid_data.shape[-1])
            ).reshape(grid_data.shape)
        
        # Convert to tensors
        weather_tensor = torch.FloatTensor(weather_data).to(self.device)
        grid_tensor = torch.FloatTensor(grid_data).to(self.device)
        
        return weather_tensor, grid_tensor
        
    def predict(
        self,
        weather_data: np.ndarray,
        grid_data: np.ndarray,
        return_confidence: bool = True
    ) -> Dict:
        """
        Generate grid impact predictions
        
        Args:
            weather_data: (batch_size, seq_len, weather_features)
            grid_data: (batch_size, seq_len, grid_features)
            return_confidence: Whether to include confidence scores
            
        Returns:
            Dictionary with predictions and metadata
        """
        self.model.eval()
        
        with torch.no_grad():
            # Preprocess
            weather_tensor, grid_tensor = self.preprocess_data(weather_data, grid_data)
            
            # Predict
            outputs = self.model(weather_tensor, grid_tensor)
            
            # Extract predictions
            impact_prob = outputs['impact_probability'].cpu().numpy()
            severity_logits = outputs['severity_logits'].cpu().numpy()
            predicted_load = outputs['predicted_load'].cpu().numpy()
            
            # Convert severity logits to class and confidence
            severity_probs = torch.softmax(outputs['severity_logits'], dim=-1).cpu().numpy()
            severity_class = np.argmax(severity_probs, axis=-1)
            severity_confidence = np.max(severity_probs, axis=-1)
            
            severity_labels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
            
            results = {
                'impact_probability': float(impact_prob[0, 0]),
                'severity': severity_labels[severity_class[0]],
                'severity_confidence': float(severity_confidence[0]),
                'predicted_load_mw': float(predicted_load[0, 0]),
                'model_version': 'transformer_v1.0'
            }
            
            if return_confidence:
                results['confidence_score'] = float(
                    (severity_confidence[0] + (1 - abs(impact_prob[0, 0] - 0.5) * 2)) / 2
                )
            
            return results
            
    def predict_batch(
        self,
        weather_data_list: List[np.ndarray],
        grid_data_list: List[np.ndarray]
    ) -> List[Dict]:
        """Batch prediction for multiple regions"""
        
        results = []
        for weather_data, grid_data in zip(weather_data_list, grid_data_list):
            result = self.predict(weather_data, grid_data)
            results.append(result)
            
        return results
        
    def calculate_stress_index(self, prediction: Dict) -> int:
        """
        Calculate grid stress index (0-100) from prediction
        
        Combines impact probability, severity, and load prediction
        """
        impact_weight = 0.4
        severity_weight = 0.4
        load_weight = 0.2
        
        severity_scores = {'LOW': 25, 'MEDIUM': 50, 'HIGH': 75, 'CRITICAL': 100}
        
        stress_index = (
            prediction['impact_probability'] * 100 * impact_weight +
            severity_scores[prediction['severity']] * severity_weight +
            min(prediction['predicted_load_mw'] / 1000, 1.0) * 100 * load_weight
        )
        
        return int(np.clip(stress_index, 0, 100))