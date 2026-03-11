import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np
import mlflow
import mlflow.pytorch
import logging
import json
from collections import deque
import random

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class BESSLocationNetwork(nn.Module):
    """Deep Q-Network for BESS location optimization"""
    
    def __init__(self, state_dim, action_dim, hidden_dims=[512, 256, 128]):
        super(BESSLocationNetwork, self).__init__()
        
        layers = []
        prev_dim = state_dim
        
        for hidden_dim in hidden_dims:
            layers.extend([
                nn.Linear(prev_dim, hidden_dim),
                nn.LayerNorm(hidden_dim),
                nn.ReLU(),
                nn.Dropout(0.2)
            ])
            prev_dim = hidden_dim
        
        layers.append(nn.Linear(prev_dim, action_dim))
        
        self.network = nn.Sequential(*layers)
        
    def forward(self, state):
        return self.network(state)


class ReplayBuffer:
    """Experience replay buffer for RL training"""
    
    def __init__(self, capacity=100000):
        self.buffer = deque(maxlen=capacity)
    
    def push(self, state, action, reward, next_state, done):
        self.buffer.append((state, action, reward, next_state, done))
    
    def sample(self, batch_size):
        batch = random.sample(self.buffer, batch_size)
        states, actions, rewards, next_states, dones = zip(*batch)
        return (
            torch.FloatTensor(states),
            torch.LongTensor(actions),
            torch.FloatTensor(rewards),
            torch.FloatTensor(next_states),
            torch.FloatTensor(dones)
        )
    
    def __len__(self):
        return len(self.buffer)


class BESSOptimizer:
    """Reinforcement Learning optimizer for BESS location selection"""
    
    def __init__(self, model_path=None):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        logger.info(f"Using device: {self.device}")
        
        # State: [weather_risk, grid_stress, load_variance, distance_to_substation, 
        #         land_cost, connection_cost, renewable_percentage, peak_demand,
        #         historical_outages, population_density, terrain_difficulty,
        #         environmental_constraints, existing_bess_proximity]
        self.state_dim = 13
        
        # Action: Select location from candidate grid (discretized)
        self.action_dim = 1000  # 1000 candidate locations per region
        
        self.policy_net = BESSLocationNetwork(self.state_dim, self.action_dim).to(self.device)
        self.target_net = BESSLocationNetwork(self.state_dim, self.action_dim).to(self.device)
        self.target_net.load_state_dict(self.policy_net.state_dict())
        self.target_net.eval()
        
        self.optimizer = optim.Adam(self.policy_net.parameters(), lr=0.0001)
        self.replay_buffer = ReplayBuffer(capacity=100000)
        
        # Hyperparameters
        self.gamma = 0.99  # Discount factor
        self.epsilon = 1.0  # Exploration rate
        self.epsilon_min = 0.01
        self.epsilon_decay = 0.995
        self.batch_size = 128
        self.target_update_freq = 10
        
        if model_path:
            self.load_model(model_path)
    
    def select_action(self, state, explore=True):
        """Select action using epsilon-greedy policy"""
        if explore and random.random() < self.epsilon:
            return random.randrange(self.action_dim)
        
        with torch.no_grad():
            state_tensor = torch.FloatTensor(state).unsqueeze(0).to(self.device)
            q_values = self.policy_net(state_tensor)
            return q_values.argmax().item()
    
    def calculate_reward(self, location_data, grid_impact, weather_risk):
        """
        Calculate reward for BESS location selection
        
        Reward components:
        - ROI improvement (40%)
        - Grid stability improvement (30%)
        - Weather risk mitigation (20%)
        - Implementation feasibility (10%)
        """
        
        # ROI component (normalized to 0-1)
        roi_score = min(location_data['projected_roi'] / 100.0, 1.0)
        
        # Grid stability component
        grid_stability = 1.0 - (grid_impact['stress_index'] / 100.0)
        load_reduction = location_data['peak_load_reduction'] / location_data['peak_demand']
        grid_score = (grid_stability + load_reduction) / 2.0
        
        # Weather risk mitigation
        weather_score = 1.0 - (weather_risk['severity_score'] / 100.0)
        outage_prevention = location_data['outage_prevention_score']
        weather_mitigation = (weather_score + outage_prevention) / 2.0
        
        # Implementation feasibility
        cost_efficiency = 1.0 - min(location_data['total_cost'] / 50000000, 1.0)  # $50M cap
        land_availability = 1.0 if location_data['land_available'] else 0.0
        environmental_ok = 1.0 if not location_data['environmental_constraints'] else 0.5
        feasibility = (cost_efficiency + land_availability + environmental_ok) / 3.0
        
        # Weighted reward
        reward = (
            0.40 * roi_score +
            0.30 * grid_score +
            0.20 * weather_mitigation +
            0.10 * feasibility
        )
        
        # Bonus for exceeding 20% ROI improvement threshold
        if location_data['roi_improvement'] >= 20.0:
            reward += 0.2
        
        # Penalty for high environmental impact
        if location_data['environmental_constraints']:
            reward -= 0.1
        
        return np.clip(reward, 0.0, 1.0)
    
    def train_step(self):
        """Perform one training step"""
        if len(self.replay_buffer) < self.batch_size:
            return None
        
        states, actions, rewards, next_states, dones = self.replay_buffer.sample(self.batch_size)
        
        states = states.to(self.device)
        actions = actions.to(self.device)
        rewards = rewards.to(self.device)
        next_states = next_states.to(self.device)
        dones = dones.to(self.device)
        
        # Current Q values
        current_q_values = self.policy_net(states).gather(1, actions.unsqueeze(1))
        
        # Target Q values
        with torch.no_grad():
            next_q_values = self.target_net(next_states).max(1)[0]
            target_q_values = rewards + (1 - dones) * self.gamma * next_q_values
        
        # Compute loss
        loss = nn.MSELoss()(current_q_values.squeeze(), target_q_values)
        
        # Optimize
        self.optimizer.zero_grad()
        loss.backward()
        torch.nn.utils.clip_grad_norm_(self.policy_net.parameters(), 1.0)
        self.optimizer.step()
        
        return loss.item()
    
    def update_target_network(self):
        """Update target network with policy network weights"""
        self.target_net.load_state_dict(self.policy_net.state_dict())
    
    def optimize_locations(self, grid_region_data, candidate_locations, num_recommendations=10):
        """
        Optimize BESS locations for a grid region
        
        Args:
            grid_region_data: Dict with region characteristics
            candidate_locations: List of candidate location dicts
            num_recommendations: Number of top locations to return
        
        Returns:
            List of optimized location recommendations
        """
        logger.info(f"Optimizing BESS locations for region {grid_region_data['region_id']}")
        
        # Evaluate each candidate location
        location_scores = []
        
        for idx, location in enumerate(candidate_locations):
            # Prepare state vector
            state = self._prepare_state(location, grid_region_data)
            
            # Get Q-value from policy network
            with torch.no_grad():
                state_tensor = torch.FloatTensor(state).unsqueeze(0).to(self.device)
                q_value = self.policy_net(state_tensor)[0, idx % self.action_dim].item()
            
            # Calculate comprehensive score
            roi_score = location['projected_roi']
            grid_impact_score = location['grid_impact_mitigation']
            weather_risk_score = location['weather_risk_mitigation']
            feasibility_score = location['implementation_feasibility']
            
            # Multi-criteria optimization score
            optimization_score = (
                0.35 * roi_score +
                0.25 * grid_impact_score +
                0.20 * weather_risk_score +
                0.15 * feasibility_score +
                0.05 * (q_value * 100)  # RL learned component
            )
            
            location_scores.append({
                'location_id': location['location_id'],
                'coordinates': location['coordinates'],
                'h3_index': location['h3_index'],
                'optimization_score': optimization_score,
                'projected_roi': roi_score,
                'roi_improvement': location['roi_improvement'],
                'grid_impact_mitigation': grid_impact_score,
                'weather_risk_mitigation': weather_risk_score,
                'implementation_feasibility': feasibility_score,
                'recommended_capacity_mwh': location['recommended_capacity_mwh'],
                'recommended_power_mw': location['recommended_power_mw'],
                'total_cost_usd': location['total_cost_usd'],
                'payback_years': location['payback_years'],
                'deployment_priority': 0,  # Will be set after ranking
                'justification': self._generate_justification(location, optimization_score)
            })
        
        # Sort by optimization score
        location_scores.sort(key=lambda x: x['optimization_score'], reverse=True)
        
        # Assign deployment priorities
        for idx, location in enumerate(location_scores[:num_recommendations]):
            location['deployment_priority'] = idx + 1
        
        logger.info(f"Top location score: {location_scores[0]['optimization_score']:.2f}")
        logger.info(f"Top location ROI improvement: {location_scores[0]['roi_improvement']:.2f}%")
        
        return location_scores[:num_recommendations]
    
    def _prepare_state(self, location, grid_data):
        """Prepare state vector for RL model"""
        return np.array([
            location.get('weather_risk_score', 0.5),
            location.get('grid_stress_score', 0.5),
            location.get('load_variance', 0.3),
            location.get('distance_to_substation_km', 5.0) / 50.0,  # Normalize
            location.get('land_cost_per_acre', 100000) / 1000000,  # Normalize
            location.get('connection_cost_usd', 1000000) / 10000000,  # Normalize
            grid_data.get('renewable_percentage', 30) / 100.0,
            grid_data.get('peak_demand_mw', 1000) / 5000.0,  # Normalize
            location.get('historical_outages', 5) / 50.0,  # Normalize
            location.get('population_density', 1000) / 10000.0,  # Normalize
            location.get('terrain_difficulty', 0.3),
            1.0 if location.get('environmental_constraints') else 0.0,
            location.get('existing_bess_proximity_km', 20) / 100.0  # Normalize
        ], dtype=np.float32)
    
    def _generate_justification(self, location, score):
        """Generate human-readable justification for location selection"""
        reasons = []
        
        if location['roi_improvement'] >= 25:
            reasons.append(f"Exceptional ROI improvement of {location['roi_improvement']:.1f}%")
        elif location['roi_improvement'] >= 20:
            reasons.append(f"Strong ROI improvement of {location['roi_improvement']:.1f}%")
        
        if location['grid_impact_mitigation'] >= 80:
            reasons.append("High grid stability enhancement potential")
        
        if location['weather_risk_mitigation'] >= 75:
            reasons.append("Significant weather risk mitigation capability")
        
        if location.get('distance_to_substation_km', 10) < 5:
            reasons.append("Optimal proximity to existing grid infrastructure")
        
        if location.get('land_available', False):
            reasons.append("Confirmed land availability")
        
        if not location.get('environmental_constraints', False):
            reasons.append("Minimal environmental constraints")
        
        if location.get('payback_years', 15) < 10:
            reasons.append(f"Rapid payback period of {location['payback_years']:.1f} years")
        
        return "; ".join(reasons) if reasons else "Balanced multi-criteria optimization"
    
    def save_model(self, path):
        """Save model checkpoint"""
        torch.save({
            'policy_net_state_dict': self.policy_net.state_dict(),
            'target_net_state_dict': self.target_net.state_dict(),
            'optimizer_state_dict': self.optimizer.state_dict(),
            'epsilon': self.epsilon
        }, path)
        logger.info(f"Model saved to {path}")
    
    def load_model(self, path):
        """Load model checkpoint"""
        checkpoint = torch.load(path, map_location=self.device)
        self.policy_net.load_state_dict(checkpoint['policy_net_state_dict'])
        self.target_net.load_state_dict(checkpoint['target_net_state_dict'])
        self.optimizer.load_state_dict(checkpoint['optimizer_state_dict'])
        self.epsilon = checkpoint.get('epsilon', self.epsilon_min)
        logger.info(f"Model loaded from {path}")


if __name__ == "__main__":
    # Example usage
    optimizer = BESSOptimizer()
    
    # Mock data for testing
    grid_region_data = {
        'region_id': 1,
        'renewable_percentage': 35,
        'peak_demand_mw': 2500
    }
    
    candidate_locations = [
        {
            'location_id': i,
            'coordinates': {'lat': 40.7 + i*0.01, 'lon': -74.0 + i*0.01},
            'h3_index': f'8928308280fffff',
            'weather_risk_score': np.random.uniform(0.3, 0.7),
            'grid_stress_score': np.random.uniform(0.4, 0.8),
            'load_variance': np.random.uniform(0.2, 0.5),
            'distance_to_substation_km': np.random.uniform(1, 15),
            'land_cost_per_acre': np.random.uniform(50000, 500000),
            'connection_cost_usd': np.random.uniform(500000, 5000000),
            'historical_outages': np.random.randint(1, 20),
            'population_density': np.random.uniform(500, 5000),
            'terrain_difficulty': np.random.uniform(0.1, 0.6),
            'environmental_constraints': np.random.choice([True, False]),
            'existing_bess_proximity_km': np.random.uniform(10, 50),
            'projected_roi': np.random.uniform(15, 35),
            'roi_improvement': np.random.uniform(18, 28),
            'grid_impact_mitigation': np.random.uniform(60, 95),
            'weather_risk_mitigation': np.random.uniform(65, 90),
            'implementation_feasibility': np.random.uniform(70, 95),
            'recommended_capacity_mwh': np.random.uniform(50, 200),
            'recommended_power_mw': np.random.uniform(25, 100),
            'total_cost_usd': np.random.uniform(10000000, 40000000),
            'payback_years': np.random.uniform(7, 15),
            'land_available': np.random.choice([True, False])
        }
        for i in range(100)
    ]
    
    recommendations = optimizer.optimize_locations(grid_region_data, candidate_locations, num_recommendations=10)
    
    print(f"\nTop 10 BESS Location Recommendations:")
    for rec in recommendations:
        print(f"\nPriority {rec['deployment_priority']}: Score {rec['optimization_score']:.2f}")
        print(f"  ROI: {rec['projected_roi']:.1f}% (Improvement: {rec['roi_improvement']:.1f}%)")
        print(f"  Capacity: {rec['recommended_capacity_mwh']:.0f} MWh / {rec['recommended_power_mw']:.0f} MW")
        print(f"  Justification: {rec['justification']}")