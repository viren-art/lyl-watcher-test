-- ============================================================================
-- SPATIAL INDEX OPTIMIZATIONS FOR BESS LOCATION QUERIES
-- ============================================================================

-- Create spatial index on bess_locations coordinates (if not exists)
CREATE INDEX IF NOT EXISTS idx_bess_locations_coordinates 
ON bess_locations USING GIST(coordinates);

-- Create spatial index on substations location (if not exists)
CREATE INDEX IF NOT EXISTS idx_substations_location 
ON substations USING GIST(location);

-- Create spatial index on transmission_lines geometry (if not exists)
CREATE INDEX IF NOT EXISTS idx_transmission_lines_geometry 
ON transmission_lines USING GIST(line_geometry);

-- Create spatial index on grid_regions boundary (if not exists)
CREATE INDEX IF NOT EXISTS idx_grid_regions_boundary 
ON grid_regions USING GIST(boundary_polygon);

-- Create composite index for common BESS queries
CREATE INDEX IF NOT EXISTS idx_bess_locations_region_score 
ON bess_locations(grid_region_id, optimization_score DESC, deployment_priority ASC);

-- Create composite index for substation proximity queries
CREATE INDEX IF NOT EXISTS idx_substations_region_capacity 
ON substations(grid_region_id, capacity_mw DESC);

-- Analyze tables to update statistics for query planner
ANALYZE bess_locations;
ANALYZE substations;
ANALYZE transmission_lines;
ANALYZE grid_regions;

-- Add comments for documentation
COMMENT ON INDEX idx_bess_locations_coordinates IS 'Spatial index for fast proximity queries on BESS locations';
COMMENT ON INDEX idx_substations_location IS 'Spatial index for substation proximity calculations';
COMMENT ON INDEX idx_bess_locations_region_score IS 'Composite index for ranking BESS recommendations by region';