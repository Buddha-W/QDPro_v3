import os
import psycopg2
import traceback
import logging
import json
from typing import List, Dict, Optional, Any
from datetime import datetime

from fastapi import FastAPI, Request, Depends, HTTPException, status, BackgroundTasks, Form
from fastapi.responses import JSONResponse, HTMLResponse, RedirectResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# For QD calculations (placeholders if qd_engine is not fully implemented)
try:
    from qd_engine import get_engine, QDParameters, MaterialProperties, EnvironmentalConditions
except ImportError:
    # Mock qd_engine for now if not available
    class MockQDEngine:
        def calculate_esqd(self, quantity, material_props, env_conditions, k_factor):
            return quantity * k_factor  # Dummy calculation
        def generate_k_factor_rings(self, center_lat, center_lon, safe_distance):
            return [{"type": "Feature", "geometry": {"type": "Point", "coordinates": [center_lon, center_lat]}}]
    def get_engine(site_type): return MockQDEngine()

logger = logging.getLogger(__name__)

app = FastAPI()

# Middleware & Setup
@app.middleware("http")
async def error_handling_middleware(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as e:
        logger.error(f"Unhandled error: {str(e)}\n{traceback.format_exc()}")
        return JSONResponse(status_code=500, content={"error": "Internal server error", "detail": str(e)})

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
)

DATA_DIR = os.path.join(os.path.expanduser('~'), "data")
os.makedirs(DATA_DIR, exist_ok=True)

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="static/templates")

# Root Endpoint
@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    return templates.TemplateResponse("site_plan.html", {"request": request})

# Save/Load Project
@app.post("/api/save")
async def save_project(data: dict):
    try:
        with open("data/layer_data.json", "w") as f:
            json.dump(data, f, indent=2)
        logger.info(f"Project saved successfully at {datetime.now().isoformat()}")
        return {"status": "success", "message": "Data saved successfully"}
    except Exception as e:
        logger.error(f"Error saving project: {str(e)}")
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/api/load")
async def load_project():
    try:
        with open("data/layer_data.json", "r") as f:
            data = json.load(f)
        logger.info(f"Project loaded successfully at {datetime.now().isoformat()}")
        return data
    except FileNotFoundError:
        default_data = {"features": []}
        with open("data/layer_data.json", "w") as f:
            json.dump(default_data, f, indent=2)
        return default_data
    except Exception as e:
        logger.error(f"Error loading project: {str(e)}")
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/api/db_status")
async def db_status():
    """Return the database connection status"""
    try:
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()
        cur.execute("SELECT version()")
        version = cur.fetchone()[0]
        cur.close()
        conn.close()
        return {
            "status": "connected",
            "type": "PostgreSQL",
            "version": version,
            "message": "Database connection successful"
        }
    except Exception as e:
        logger.error(f"Database connection error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "message": f"Database connection failed: {str(e)}"
            }
        )

# Layer Persistence Endpoints
@app.get("/api/load-layers")
async def load_layers(location_id: Optional[int] = None):
    try:
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()
        if location_id:
            cur.execute("SELECT layer_config FROM map_layers WHERE location_id = %s AND is_active = TRUE", (location_id,))
        else:
            cur.execute("SELECT layer_config FROM map_layers WHERE is_active = TRUE")
        rows = cur.fetchall()
        features = []
        for row in rows:
            layer_config = row[0]
            if layer_config and "features" in layer_config:
                features.extend(layer_config["features"])
        return {"layers": {"type": "FeatureCollection", "features": features}}
    except Exception as e:
        logger.error(f"Error loading layers: {str(e)}")
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        if 'cur' in locals(): cur.close()
        if 'conn' in locals(): conn.close()

@app.post("/api/save-layers")
async def save_layers(request: Request, location_id: Optional[int] = None):
    conn = None
    cur = None
    try:
        data = await request.json()
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()
        layer_name = data.get("layer_name", "Default")
        layer_config = {"type": "FeatureCollection", "features": data.get("features", [])}
        
        # First check if the proper constraint exists
        try:
            # Check if the map_layers_name_key constraint exists
            cur.execute("""
                SELECT constraint_name FROM information_schema.table_constraints
                WHERE table_name = 'map_layers' AND constraint_name = 'map_layers_name_key'
            """)
            
            if cur.fetchone():
                # Drop the simple name constraint and add composite constraint
                cur.execute("ALTER TABLE map_layers DROP CONSTRAINT map_layers_name_key")
                try:
                    cur.execute("""
                        ALTER TABLE map_layers ADD CONSTRAINT map_layers_name_location_key 
                        UNIQUE (name, location_id)
                    """)
                    conn.commit()
                except psycopg2.Error as e:
                    # Constraint might already exist or other issue
                    conn.rollback()
                    logger.warning(f"Couldn't add composite constraint: {str(e)}")
        except psycopg2.Error as e:
            conn.rollback()
            logger.warning(f"Error checking constraints: {str(e)}")
        
        # Save layer logic
        if location_id:
            # First, check if a layer with this name and location_id exists
            cur.execute("""
                SELECT id FROM map_layers 
                WHERE name = %s AND location_id = %s AND is_active = TRUE
            """, (layer_name, location_id))
            
            existing = cur.fetchone()
            
            if existing:
                # Update existing layer
                cur.execute("""
                    UPDATE map_layers SET layer_config = %s
                    WHERE id = %s
                    RETURNING id
                """, (json.dumps(layer_config), existing[0]))
                layer_id = existing[0]
            else:
                # Insert new layer
                cur.execute("""
                    INSERT INTO map_layers (name, layer_config, location_id, is_active)
                    VALUES (%s, %s, %s, TRUE)
                    RETURNING id
                """, (layer_name, json.dumps(layer_config), location_id))
                layer_id = cur.fetchone()[0]
        else:
            # Without location_id, just insert a new layer
            # For layers without location_id, add a random suffix to ensure uniqueness
            if location_id is None:
                import random
                unique_name = f"{layer_name}_{random.randint(1000, 9999)}"
                layer_name = unique_name
                
            cur.execute("""
                INSERT INTO map_layers (name, layer_config, is_active)
                VALUES (%s, %s, TRUE)
                RETURNING id
            """, (layer_name, json.dumps(layer_config)))
            layer_id = cur.fetchone()[0]
            
        conn.commit()
        return {"status": "success", "message": f"Layer '{layer_name}' saved to DB with ID {layer_id}"}
            
    except Exception as e:
        if conn:
            conn.rollback()  # Explicitly rollback on error
        logger.error(f"Error saving layers: {str(e)}")
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        if cur: 
            cur.close()
        if conn: 
            conn.close()

# Location Endpoints
@app.get("/api/locations")
async def get_locations(include_deleted: bool = False):
    try:
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()
        
        # Simplified approach - always get all locations
        try:
            # First attempt to query with deleted filter if appropriate
            if not include_deleted:
                cur.execute("SELECT id, location_name, created_at FROM locations WHERE deleted = FALSE")
            else:
                cur.execute("SELECT id, location_name, created_at FROM locations")
                
        except psycopg2.Error as e:
            # If error occurs (likely missing deleted column), fallback to simpler query
            logger.warning(f"Initial locations query failed: {str(e)}, falling back to simpler query")
            cur.execute("SELECT id, location_name, created_at FROM locations")
            
        rows = cur.fetchall()
        locations = [{"id": r[0], "name": r[1], "created_at": str(r[2])} for r in rows]
        return {"locations": locations}
    except Exception as e:
        logger.error(f"Database error in /api/locations: {str(e)}")
        return JSONResponse(status_code=500, content={"error": "Failed to fetch locations"})
    finally:
        if 'cur' in locals(): cur.close()
        if 'conn' in locals(): conn.close()

@app.post("/api/create_location")
async def create_location_api(request: Request):
    data = await request.json()
    location_name = data.get("location_name", "Untitled")
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO locations (location_name) VALUES (%s) RETURNING id, location_name",
            (location_name,)
        )
        row = cur.fetchone()
        conn.commit()
        return {"id": row[0], "name": row[1]}
    except Exception as e:
        logger.error(f"Error creating location: {str(e)}")
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        cur.close()
        conn.close()

@app.get("/api/load_location/{location_id}")
async def load_location(location_id: int):
    try:
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()
        
        # First check if location exists, with more relaxed constraints
        cur.execute("SELECT id, location_name FROM locations WHERE id = %s", (location_id,))
        row = cur.fetchone()
        
        if not row:
            logger.warning(f"Location {location_id} not found")
            return JSONResponse(status_code=404, content={"error": "Location not found"})
            
        location_name = row[1]
        logger.info(f"Loading location: {location_id} - {location_name}")
        
        # Get all layers associated with this location
        cur.execute("SELECT layer_config FROM map_layers WHERE location_id = %s AND is_active = TRUE", (location_id,))
        layers_data = cur.fetchall()
        
        # Process the layers
        features = []
        for layer_row in layers_data:
            if layer_row[0] and 'features' in layer_row[0]:
                features.extend(layer_row[0]['features'])
        
        facilities = []
        qdArcs = []
        analysis = []
        
        # Return with the location data
        return {
            "location_id": location_id, 
            "name": location_name,
            "layers": {
                "type": "FeatureCollection",
                "features": features
            },
            "facilities": facilities,
            "qdArcs": qdArcs, 
            "analysis": analysis
        }
    except Exception as e:
        logger.error(f"Error loading location: {str(e)}\n{traceback.format_exc()}")
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        if 'cur' in locals(): cur.close()
        if 'conn' in locals(): conn.close()

# QD Calculation Endpoints
class QDCalculationRequest(BaseModel):
    quantity: float
    lat: float
    lng: float
    k_factor: float = 40
    site_type: str = "DOD"
    material_type: str = "General Explosive"
    sensitivity: float = 0.5
    det_velocity: float = 6000
    tnt_equiv: float = 1.0
    temperature: float = 298
    pressure: float = 101.325
    humidity: float = 50
    confinement_factor: float = 0.0

class QDAnalysisRequest(BaseModel):
    feature_id: str
    location_id: Optional[int] = None
    site_type: str = "DOD"
    quantity: float
    k_factor: float = 40
    features_to_analyze: List[Dict] = []
    material_props: Optional[Dict] = None
    env_conditions: Optional[Dict] = None

class ReportGenerationRequest(BaseModel):
    title: str
    analysis_id: str
    location_id: Optional[int] = None
    include_map: bool = True
    map_snapshot: Optional[str] = None

@app.post("/api/analyze-qd")
async def analyze_qd(request: QDAnalysisRequest):
    try:
        qd_engine = get_engine(request.site_type)
        
        # Set up material properties and environmental conditions
        material_props = MaterialProperties(
            sensitivity=request.material_props.get('sensitivity', 1.0) if request.material_props else 1.0,
            det_velocity=request.material_props.get('det_velocity', 6000) if request.material_props else 6000,
            tnt_equiv=request.material_props.get('tnt_equiv', 1.0) if request.material_props else 1.0
        )
        
        env_conditions = EnvironmentalConditions(
            temperature=request.env_conditions.get('temperature', 298) if request.env_conditions else 298,
            pressure=request.env_conditions.get('pressure', 101.325) if request.env_conditions else 101.325,
            humidity=request.env_conditions.get('humidity', 50) if request.env_conditions else 50,
            confinement_factor=request.env_conditions.get('confinement_factor', 0.0) if request.env_conditions else 0.0
        )
        
        # Calculate safe distance
        safe_distance = qd_engine.calculate_safe_distance(
            quantity=request.quantity,
            material_props=material_props,
            env_conditions=env_conditions
        )
        
        # Generate analysis results
        feature = next((f for f in request.features_to_analyze if f.get('id') == request.feature_id), None)
        if not feature:
            return JSONResponse(status_code=404, content={"error": "Feature not found"})
            
        # Get coordinates for center of analysis
        center = None
        if feature.get('geometry', {}).get('type') == 'Point':
            center = feature['geometry']['coordinates']
        elif feature.get('geometry', {}).get('type') == 'Polygon':
            # Calculate centroid for polygon
            coords = feature['geometry']['coordinates'][0]
            x_sum = sum(c[0] for c in coords)
            y_sum = sum(c[1] for c in coords)
            center = [x_sum / len(coords), y_sum / len(coords)]
        
        if not center:
            return JSONResponse(status_code=400, content={"error": "Could not determine center for feature"})
            
        # Generate buffer zones
        buffer_zones = qd_engine.generate_k_factor_rings(center, safe_distance)
        
        # Analyze surrounding features
        analysis_results = []
        for surrounding_feature in request.features_to_analyze:
            if surrounding_feature.get('id') == request.feature_id:
                continue  # Skip the feature being analyzed
                
            sf_center = None
            if surrounding_feature.get('geometry', {}).get('type') == 'Point':
                sf_center = surrounding_feature['geometry']['coordinates']
            elif surrounding_feature.get('geometry', {}).get('type') == 'Polygon':
                # Calculate centroid for polygon
                coords = surrounding_feature['geometry']['coordinates'][0]
                x_sum = sum(c[0] for c in coords)
                y_sum = sum(c[1] for c in coords)
                sf_center = [x_sum / len(coords), y_sum / len(coords)]
                
            if sf_center:
                # Calculate distance between centers
                distance = qd_engine.calculate_distance(center, sf_center)
                is_safe = distance >= safe_distance
                
                analysis_results.append({
                    "feature_id": surrounding_feature.get('id'),
                    "name": surrounding_feature.get('properties', {}).get('name', 'Unnamed Feature'),
                    "distance": round(distance, 2),
                    "required_distance": round(safe_distance, 2),
                    "is_safe": is_safe,
                    "status": "COMPLIANT" if is_safe else "NON-COMPLIANT"
                })
        
        analysis_id = f"analysis_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        # Store analysis results in database or file
        analysis_data = {
            "id": analysis_id,
            "timestamp": datetime.now().isoformat(),
            "feature_id": request.feature_id,
            "location_id": request.location_id,
            "quantity": request.quantity,
            "safe_distance": safe_distance,
            "k_factor": request.k_factor,
            "site_type": request.site_type,
            "results": analysis_results,
            "buffer_zones": buffer_zones
        }
        
        # Save analysis to file for now, can be moved to database later
        os.makedirs("data/analyses", exist_ok=True)
        with open(f"data/analyses/{analysis_id}.json", "w") as f:
            json.dump(analysis_data, f, indent=2)
            
        return {
            "analysis_id": analysis_id,
            "safe_distance": safe_distance,
            "units": "feet",
            "site_type": request.site_type,
            "buffer_zones": {
                "type": "FeatureCollection",
                "features": buffer_zones
            },
            "analysis_results": analysis_results
        }
    except Exception as e:
        logger.error(f"Error in QD analysis: {str(e)}\n{traceback.format_exc()}")
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/api/analysis/{analysis_id}")
async def get_analysis(analysis_id: str):
    try:
        file_path = f"data/analyses/{analysis_id}.json"
        if not os.path.exists(file_path):
            return JSONResponse(status_code=404, content={"error": "Analysis not found"})
            
        with open(file_path, "r") as f:
            analysis_data = json.load(f)
            
        return analysis_data
    except Exception as e:
        logger.error(f"Error retrieving analysis: {str(e)}")
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.post("/api/generate-report")
async def generate_report(request: ReportGenerationRequest):
    try:
        # Get analysis data
        analysis_data = None
        file_path = f"data/analyses/{request.analysis_id}.json"
        if not os.path.exists(file_path):
            return JSONResponse(status_code=404, content={"error": "Analysis not found"})
            
        with open(file_path, "r") as f:
            analysis_data = json.load(f)
        
        # Create data directories if they don't exist
        os.makedirs("data/analyses", exist_ok=True)
        os.makedirs("data/reports", exist_ok=True)
        
        # Prepare report data
        report_data = {
            "title": request.title,
            "generated_at": datetime.now(),
            "data": {
                "analysis_summary": {
                    "feature_id": analysis_data["feature_id"],
                    "quantity": analysis_data["quantity"],
                    "safe_distance": analysis_data["safe_distance"],
                    "k_factor": analysis_data["k_factor"],
                    "site_type": analysis_data["site_type"]
                },
                "compliance_summary": {
                    "total_features": len(analysis_data["results"]),
                    "compliant": sum(1 for r in analysis_data["results"] if r["is_safe"]),
                    "non_compliant": sum(1 for r in analysis_data["results"] if not r["is_safe"])
                },
                "detailed_results": analysis_data["results"]
            }
        }
        
        # Generate PDF report
        from reports import Report, generate_pdf_report
        
        # Create Report object
        report = Report(
            title=request.title,
            generated_at=datetime.now(),
            data=report_data["data"]
        )
        
        # Set up output directory
        output_filename = f"data/reports/report_{datetime.now().strftime('%Y%m%d%H%M%S')}.pdf"
        
        # Generate PDF
        report_result = await generate_pdf_report(
            report=report,
            output_filename=output_filename,
            map_snapshot=request.map_snapshot
        )
        
        return {
            "status": "success",
            "report_id": os.path.basename(output_filename),
            "filename": output_filename,
            "report_data": report_data
        }
    except Exception as e:
        logger.error(f"Error generating report: {str(e)}\n{traceback.format_exc()}")
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/api/reports/{report_id}")
async def get_report(report_id: str):
    try:
        file_path = f"data/reports/{report_id}"
        if not os.path.exists(file_path):
            return JSONResponse(status_code=404, content={"error": "Report not found"})
            
        return FileResponse(file_path, media_type="application/pdf")
    except Exception as e:
        logger.error(f"Error retrieving report: {str(e)}")
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.post("/api/calculate-qd", response_model=Dict[str, Any])
async def calculate_qd(request: QDCalculationRequest):
    try:
        qd_engine = get_engine(request.site_type)
        material_props = MaterialProperties(
            sensitivity=request.sensitivity,
            det_velocity=request.det_velocity,
            tnt_equiv=request.tnt_equiv
        )
        env_conditions = EnvironmentalConditions(
            temperature=request.temperature,
            pressure=request.pressure,
            humidity=request.humidity,
            confinement_factor=request.confinement_factor
        )
        safe_distance = qd_engine.calculate_safe_distance(
            quantity=request.quantity,
            material_props=material_props,
            env_conditions=env_conditions
        )
        buffer_zones = qd_engine.generate_k_factor_rings(
            center=[request.lng, request.lat],
            safe_distance=safe_distance
        )
        return {
            "safe_distance": safe_distance,
            "units": "feet",
            "material_type": request.material_type,
            "buffer_zones": {
                "type": "FeatureCollection",
                "features": buffer_zones
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Database Initialization
def init_db():
    db_url = os.environ.get('DATABASE_URL', "postgresql://postgres:postgres@localhost:5432/postgres")
    print(f"Using DB: {db_url}")
    try:
        conn = psycopg2.connect(db_url)
        conn.autocommit = True  # Ensure autocommit is on
        cur = conn.cursor()
        
        # Check if locations table exists
        cur.execute("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'locations')")
        locations_exists = cur.fetchone()[0]
        
        if not locations_exists:
            # Create locations table if it doesn't exist
            cur.execute("""
                CREATE TABLE locations (
                    id SERIAL PRIMARY KEY,
                    location_name VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    deleted BOOLEAN DEFAULT FALSE,
                    deleted_at TIMESTAMP WITH TIME ZONE
                )
            """)
            print("Created locations table")
        else:
            # Add 'deleted' column if it doesn't exist
            cur.execute("SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'locations' AND column_name = 'deleted')")
            deleted_exists = cur.fetchone()[0]
            if not deleted_exists:
                cur.execute("ALTER TABLE locations ADD COLUMN deleted BOOLEAN DEFAULT FALSE")
                cur.execute("ALTER TABLE locations ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE")
                print("Added deleted columns to locations table")
        
        # Check if map_layers table exists
        cur.execute("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'map_layers')")
        map_layers_exists = cur.fetchone()[0]
        
        if not map_layers_exists:
            # Create map_layers table if it doesn't exist
            cur.execute("""
                CREATE TABLE map_layers (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    layer_config JSONB,
                    location_id INTEGER,
                    is_active BOOLEAN DEFAULT TRUE
                )
            """)
            print("Created map_layers table")
        else:
            # Check if location_id column exists and add if it doesn't
            cur.execute("SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'map_layers' AND column_name = 'location_id')")
            location_id_exists = cur.fetchone()[0]
            if not location_id_exists:
                cur.execute("ALTER TABLE map_layers ADD COLUMN location_id INTEGER")
                print("Added location_id column to map_layers table")
        
        # Force run db init now - drop and recreate tables if needed
        if map_layers_exists:
            try:
                # Test a query to make sure the schema is correct
                cur.execute("INSERT INTO map_layers (name, layer_config, location_id, is_active) VALUES ('test', '{}'::jsonb, 1, TRUE) RETURNING id")
                test_id = cur.fetchone()[0]
                cur.execute("DELETE FROM map_layers WHERE id = %s", (test_id,))
                
                # Check for and drop the single-column name constraint if it exists
                cur.execute("""
                    SELECT constraint_name FROM information_schema.table_constraints
                    WHERE table_name = 'map_layers' AND constraint_name = 'map_layers_name_key'
                """)
                
                if cur.fetchone():
                    try:
                        cur.execute("ALTER TABLE map_layers DROP CONSTRAINT map_layers_name_key")
                        print("Dropped simple name constraint")
                    except psycopg2.Error as e:
                        print(f"Error dropping constraint: {e}")
                        conn.rollback()
                
                # Check if there's a unique constraint for (name, location_id)
                cur.execute("""
                    SELECT COUNT(*) FROM pg_constraint 
                    WHERE conname = 'map_layers_name_location_key'
                """)
                has_constraint = cur.fetchone()[0] > 0
                
                if not has_constraint:
                    try:
                        # Add a composite unique constraint if it doesn't exist
                        cur.execute("""
                            ALTER TABLE map_layers 
                            ADD CONSTRAINT map_layers_name_location_key 
                            UNIQUE (name, location_id)
                        """)
                        print("Added unique constraint for name and location_id")
                    except psycopg2.Error as constraint_error:
                        conn.rollback()
                        print(f"Could not add constraint: {constraint_error}")
                        
                print("Map layers table structure is valid")
            except psycopg2.Error as e:
                print(f"Map layers table structure issue detected: {e}")
                # Drop and recreate the table if there's an error with its structure
                cur.execute("DROP TABLE map_layers")
                conn.commit()
                cur.execute("""
                    CREATE TABLE map_layers (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR(255) NOT NULL,
                        layer_config JSONB,
                        location_id INTEGER,
                        is_active BOOLEAN DEFAULT TRUE,
                        UNIQUE (name, location_id)
                    )
                """)
                print("Recreated map_layers table with correct structure")
        
        conn.commit()
        print("Database initialized successfully")
    except Exception as e:
        print(f"Error initializing DB: {e}")
        traceback.print_exc()
    finally:
        if 'cur' in locals(): cur.close()
        if 'conn' in locals(): conn.close()

if __name__ == "__main__":
    init_db()
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True, access_log=True)