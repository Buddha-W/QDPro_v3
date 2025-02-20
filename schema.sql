
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
