
-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Facilities table
CREATE TABLE facilities (
    id SERIAL PRIMARY KEY,
    facility_number VARCHAR(50) UNIQUE,
    description TEXT,
    category_code VARCHAR(20),
    location GEOMETRY(POINT, 4326),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Explosive sites table
CREATE TABLE explosive_sites (
    id SERIAL PRIMARY KEY,
    facility_id INTEGER REFERENCES facilities(id),
    net_explosive_weight DECIMAL,
    k_factor DECIMAL DEFAULT 50,
    hazard_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Safety arcs table
CREATE TABLE safety_arcs (
    id SERIAL PRIMARY KEY,
    explosive_site_id INTEGER REFERENCES explosive_sites(id),
    arc_geometry GEOMETRY(POLYGON, 4326),
    distance DECIMAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projects table
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    description TEXT,
    coordinate_system VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- License management
CREATE TABLE licenses (
    id SERIAL PRIMARY KEY,
    license_key VARCHAR(255) UNIQUE,
    organization_name VARCHAR(255),
    tier VARCHAR(50),
    valid_until TIMESTAMP,
    max_users INTEGER,
    features JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit trail
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    action VARCHAR(100),
    resource_type VARCHAR(50),
    resource_id INTEGER,
    changes JSONB,
    ip_address INET,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Usage metrics
CREATE TABLE usage_metrics (
    id SERIAL PRIMARY KEY,
    license_id INTEGER REFERENCES licenses(id),
    metric_type VARCHAR(50),
    value INTEGER,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Offline sync tracking
CREATE TABLE sync_status (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(255),
    last_sync TIMESTAMP,
    sync_type VARCHAR(50),
    status VARCHAR(50),
    details JSONB
);

-- Map layers
CREATE TABLE map_layers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    source_type VARCHAR(50),
    provider VARCHAR(100),
    layer_config JSONB,
    is_active BOOLEAN DEFAULT true
);

-- User preferences
CREATE TABLE user_preferences (
    user_id INTEGER PRIMARY KEY,
    default_coordinate_system VARCHAR(50),
    default_map_provider VARCHAR(100),
    ui_settings JSONB,
    notification_settings JSONB
);

-- Analysis results
CREATE TABLE analysis_results (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id),
    analysis_type VARCHAR(100),
    input_parameters JSONB,
    result_geometry GEOMETRY,
    result_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Scheduled tasks
CREATE TABLE scheduled_tasks (
    id SERIAL PRIMARY KEY,
    task_type VARCHAR(100),
    frequency VARCHAR(50),
    last_run TIMESTAMP,
    next_run TIMESTAMP,
    parameters JSONB,
    status VARCHAR(50)
);

-- Create indexes
CREATE INDEX idx_facilities_location ON facilities USING GIST(location);
CREATE INDEX idx_safety_arcs_geometry ON safety_arcs USING GIST(arc_geometry);
CREATE INDEX idx_sync_status_device ON sync_status(device_id);
CREATE INDEX idx_analysis_results_project ON analysis_results(project_id);
CREATE INDEX idx_explosive_sites_facility ON explosive_sites(facility_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_usage_metrics_recorded ON usage_metrics(recorded_at);

-- Create materialized view for frequently accessed analysis data
CREATE MATERIALIZED VIEW analysis_summary AS
SELECT 
    p.name as project_name,
    COUNT(ar.id) as analysis_count,
    MAX(ar.created_at) as last_analysis,
    jsonb_agg(DISTINCT ar.analysis_type) as analysis_types
FROM projects p
LEFT JOIN analysis_results ar ON p.id = ar.project_id
GROUP BY p.id, p.name
WITH DATA;

CREATE UNIQUE INDEX idx_analysis_summary ON analysis_summary (project_name);

-- Add automatic refresh function
CREATE OR REPLACE FUNCTION refresh_analysis_summary()
RETURNS TRIGGER AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY analysis_summary;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER refresh_analysis_summary_trigger
AFTER INSERT OR UPDATE OR DELETE ON analysis_results
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_analysis_summary();

-- Add database maintenance function
CREATE OR REPLACE FUNCTION maintain_database()
RETURNS void AS $$
BEGIN
    -- Vacuum analyze tables
    VACUUM ANALYZE facilities;
    VACUUM ANALYZE explosive_sites;
    VACUUM ANALYZE safety_arcs;
    VACUUM ANALYZE analysis_results;
    
    -- Refresh materialized views
    REFRESH MATERIALIZED VIEW CONCURRENTLY analysis_summary;
    
    -- Update statistics
    ANALYZE facilities;
    ANALYZE explosive_sites;
    ANALYZE safety_arcs;
    ANALYZE analysis_results;
END;
$$ LANGUAGE plpgsql;

-- Add validation triggers
CREATE OR REPLACE FUNCTION validate_explosive_site() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.net_explosive_weight <= 0 THEN
        RAISE EXCEPTION 'Net explosive weight must be positive';
    END IF;
    IF NEW.k_factor <= 0 THEN
        RAISE EXCEPTION 'K-factor must be positive';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER explosive_site_validation
    BEFORE INSERT OR UPDATE ON explosive_sites
    FOR EACH ROW
    EXECUTE FUNCTION validate_explosive_site();
