-- Weather predictions table
CREATE TABLE weather_predictions (
  prediction_id     VARCHAR(100) PRIMARY KEY,
  grid_region_id    INT NOT NULL REFERENCES grid_regions(grid_region_id),
  forecast_start    TIMESTAMPTZ NOT NULL,
  forecast_end      TIMESTAMPTZ NOT NULL,
  data              JSONB NOT NULL,
  model_version     VARCHAR(50) NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_weather_predictions_region_time ON weather_predictions(grid_region_id, forecast_start DESC);
CREATE INDEX idx_weather_predictions_created ON weather_predictions(created_at DESC);

-- Weather observations table (actual weather data)
CREATE TABLE weather_observations (
  observation_id    BIGSERIAL PRIMARY KEY,
  grid_region_id    INT NOT NULL REFERENCES grid_regions(grid_region_id),
  temperature       NUMERIC(5,2),
  humidity          NUMERIC(5,2),
  pressure          NUMERIC(7,2),
  wind_speed        NUMERIC(5,2),
  wind_direction    NUMERIC(5,2),
  cloud_cover       NUMERIC(5,2),
  precipitation     NUMERIC(6,2),
  timestamp         TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_weather_observations_region_time ON weather_observations(grid_region_id, timestamp DESC);

-- Prediction accuracy tracking
CREATE TABLE prediction_accuracy (
  accuracy_id           BIGSERIAL PRIMARY KEY,
  prediction_id         VARCHAR(100) NOT NULL REFERENCES weather_predictions(prediction_id),
  overall_accuracy      NUMERIC(5,4) NOT NULL,
  temperature_accuracy  NUMERIC(5,4),
  precipitation_accuracy NUMERIC(5,4),
  wind_speed_accuracy   NUMERIC(5,4),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_prediction_accuracy_prediction ON prediction_accuracy(prediction_id);
CREATE INDEX idx_prediction_accuracy_created ON prediction_accuracy(created_at DESC);