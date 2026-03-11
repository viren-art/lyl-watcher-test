# AI Weather Impact & BESS Location Optimization System

## Feature F4: Multi-Region Weather Prediction Dashboard

Interactive web dashboard displaying weather forecasts, grid impact heat maps, and risk alerts for 5 Phase 1 regions with mobile-responsive design and WCAG 2.1 AA accessibility.

## Architecture

### Frontend Components
- **Dashboard Components** (`frontend/src/components/dashboard/`)
  - `RegionSelector.jsx` - Region selection dropdown
  - `WeatherCard.jsx` - Weather metric display cards
  - `HourlyForecast.jsx` - 24-hour forecast timeline
  - `GridImpactHeatMap.jsx` - Grid impact visualization
  - `RegionComparison.jsx` - Side-by-side region comparison
  - `AlertPanel.jsx` - Real-time alert notifications

- **Map Components** (`frontend/src/components/maps/`)
  - `RegionMap.jsx` - Interactive geographic visualization with region boundaries

### Backend API
- **GraphQL API** (`backend/src/api/graphql/`)
  - `schema.js` - GraphQL type definitions
  - `resolvers.js` - Query resolvers for weather, grid, and multi-region data
  - `server.js` - Apollo Server configuration

## Setup Instructions

### Prerequisites
- Node.js 18+
- PostgreSQL 16+ with TimescaleDB extension
- Kafka 3.6+
- Python 3.10+ (for ML models)

### Backend Setup
bash
cd backend
npm install
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your database credentials and API keys

# Initialize database
npm run migrate

# Start services
npm run dev

### Frontend Setup
bash
cd frontend
npm install

# Configure environment
echo "REACT_APP_API_URL=http://localhost:3000" > .env
echo "REACT_APP_GRAPHQL_URL=http://localhost:3000/api/v1/graphql" >> .env

# Start development server
npm run dev

### Docker Setup (Recommended)
bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Access services
# - Backend API: http://localhost:3000
# - GraphQL Playground: http://localhost:3000/api/v1/graphql
# - Frontend: http://localhost:3001

## API Endpoints

### REST API
- `POST /api/v1/weather/predict` - Generate weather forecast
- `GET /api/v1/weather/current/:regionId` - Get current weather
- `POST /api/v1/grid/impact-analysis` - Analyze grid impact
- `GET /api/v1/grid/regions` - List all regions

### GraphQL API
graphql
# Get multi-region weather data
query {
  multiRegionWeather(regionIds: [1, 2, 3]) {
    gridRegionId
    regionName
    currentWeather {
      temperature
      windSpeed
      precipitation
    }
    forecast24h {
      timestamp
      temperature
      condition
    }
    gridImpact {
      severity
      stressIndex
      outageProbability
    }
    alerts {
      severity
      title
      message
    }
  }
}

# Compare regions
query {
  multiRegionComparison(regionIds: [1, 2]) {
    regions {
      regionName
    }
    metrics {
      name
      unit
      values {
        gridRegionId
        value
        delta
      }
    }
  }
}

## Testing

### Backend Tests
bash
cd backend
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:integration   # Integration tests only

### Frontend Tests
bash
cd frontend
npm test                   # Run component tests

### Test Coverage
- Target: 85% code coverage
- Current coverage reports in `backend/coverage/` and `frontend/coverage/`

## Accessibility Features

### WCAG 2.1 AA Compliance
- ✅ Keyboard navigation support
- ✅ ARIA labels on interactive elements
- ✅ Color contrast ratios ≥4.5:1
- ✅ Focus indicators on all focusable elements
- ✅ Screen reader compatible
- ✅ Responsive design (mobile, tablet, desktop)

### Browser Support
- Chrome 120+
- Firefox 121+
- Safari 17+
- Edge 120+

## Performance Metrics

### Target NFRs
- **Response Time**: <3 seconds for weather predictions (NFR-001)
- **Throughput**: Support 50+ concurrent requests (NFR-002)
- **Uptime**: 99.5% availability (NFR-003)
- **Accuracy**: ≥85% weather prediction accuracy (NFR-006)

### Monitoring
- Prometheus metrics: `/metrics`
- Health check: `/health`
- GraphQL playground: `/api/v1/graphql` (dev only)

## Security

### Authentication
- OAuth 2.0 with JWT tokens
- Multi-factor authentication (MFA) support
- Role-based access control (RBAC)

### Data Protection
- TLS 1.3 for data in transit
- AES-256 encryption at rest
- API rate limiting (1,000 requests/hour per tier)

## Deployment

### Production Build
bash
# Backend
cd backend
npm run build
npm start

# Frontend
cd frontend
npm run build
npm run preview

### Environment Variables
See `.env.example` for required configuration:
- Database credentials
- JWT secrets
- API keys
- SMTP configuration

## Troubleshooting

### Common Issues

**GraphQL queries fail with authentication error**
- Ensure JWT token is included in Authorization header
- Check token expiry (1 hour default)
- Verify user has access to requested regions

**Map not rendering**
- Check browser console for errors
- Verify Mapbox GL JS is loaded
- Ensure region boundary data is available

**Weather predictions timeout**
- Check Python ML service is running
- Verify TimescaleDB has historical data
- Review prediction service logs

## License
Proprietary - All rights reserved

## Support
For technical support, contact: support@gridai.platform