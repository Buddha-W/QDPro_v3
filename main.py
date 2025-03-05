import os
import psycopg2
import traceback
import logging
import json
from datetime import datetime
from typing import List, Dict, Optional, Any

from fastapi import FastAPI, Request, Depends, HTTPException, status, BackgroundTasks, Form
from fastapi.responses import JSONResponse, HTMLResponse, RedirectResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware

# For QD calculations (some placeholders if you don't actually have qd_engine)
from qd_engine import get_engine, QDParameters, MaterialProperties, EnvironmentalConditions

logger = logging.getLogger(__name__)

app = FastAPI()

# -------------------------
# MIDDLEWARE & SETUP
# -------------------------
@app.middleware("http")
async def error_handling_middleware(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as e:
        logger.error(f"Unhandled error: {str(e)}\n{traceback.format_exc()}")
        return JSONResponse(
            status_code=500,
            content={"error": "Internal server error", "detail": str(e)}
        )

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
)

# Ensure data directory
DATA_DIR = os.path.join(os.path.expanduser('~'), "data")
os.makedirs(DATA_DIR, exist_ok=True)

# Serve static files (CSS, JS, images) from /static
app.mount("/static", StaticFiles(directory="static"), name="static")

# Setup Jinja2 templates in static/templates
templates = Jinja2Templates(directory="static/templates")


# -------------------------
# ROOT: RENDER site_plan.html
# -------------------------
@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    """
    Render the main map page from site_plan.html using Jinja2.
    """
    return templates.TemplateResponse("site_plan.html", {"request": request})


# -------------------------
# SAVE / LOAD JSON Project
# -------------------------
@app.post("/api/save")
async def save_project(data: dict):
    try:
        # Ensure data directory exists
        os.makedirs("data", exist_ok=True)
        
        # Save with pretty formatting for readability
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
        # Ensure data directory exists
        os.makedirs("data", exist_ok=True)
        
        # Try to load the file
        with open("data/layer_data.json", "r") as f:
            data = json.load(f)
        
        logger.info(f"Project loaded successfully at {datetime.now().isoformat()}")
        return data
    except FileNotFoundError:
        logger.warning("No data file found, returning default structure")
        # Return some default structure if no file found
        default_data = {
            "features": []
        }
        
        # Create the default file for future use
        with open("data/layer_data.json", "w") as f:
            json.dump(default_data, f, indent=2)
            
        return default_data
    except json.JSONDecodeError:
        logger.error("Invalid JSON in data file")
        return JSONResponse(status_code=500, content={"error": "Data file contains invalid JSON"})
    except Exception as e:
        logger.error(f"Error loading project: {str(e)}")
        return JSONResponse(status_code=500, content={"error": str(e)})


# -----------------------------------------------------------
# EXAMPLE: QDCalculationRequest, sensor-data, generate-report
# -----------------------------------------------------------
# (These remain from your original code. Adapt as needed.)

from pydantic import BaseModel
from datetime import datetime
import pdfkit

class QDCalculationRequest(BaseModel):
    quantity: float
    lat: float
    lng: float
    k_factor: float = 40
    site_type: str = "DOD"  # Either "DOD" or "DOE"
    material_type: str = "General Explosive"
    sensitivity: float = 0.5
    det_velocity: float = 6000
    tnt_equiv: float = 1.0
    temperature: float = 298
    pressure: float = 101.325
    humidity: float = 50
    confinement_factor: float = 0.0

@app.post("/api/sensor-data")
async def update_sensor_data(data: Dict[str, float]):
    """Update real-time sensor data and recalculate risk"""
    site_type = "DOD"  # or from session
    qd_engine = get_engine(site_type)
    await qd_engine.update_sensor_data(data)
    risk_assessment = await qd_engine._update_risk_assessment()
    return {
        "status": "updated",
        "timestamp": datetime.now().isoformat(),
        "risk_level": risk_assessment["risk_level"],
        "warnings": risk_assessment.get("warning")
    }

@app.get("/api/generate-report/{site_id}")
async def generate_report(site_id: str, format: str = "html"):
    """Generate site safety report"""
    report_data = {
        "site_id": site_id,
        "timestamp": datetime.now().isoformat(),
        "risk_assessment": "Normal",
        "sensor_readings": {"temperature": 25.0, "humidity": 60.0}
    }
    html_content = f"""
    <h1>Site Safety Report</h1>
    <p>Site ID: {report_data['site_id']}</p>
    <p>Generated: {report_data['timestamp']}</p>
    <h2>Risk Assessment</h2>
    <p>{report_data['risk_assessment']}</p>
    """
    if format == "pdf":
        pdf = pdfkit.from_string(html_content, False)
        return Response(pdf, media_type="application/pdf")
    return HTMLResponse(content=html_content)

@app.post("/api/calculate-qd", response_model=Dict[str, Any])
async def calculate_qd(request: QDCalculationRequest):
    """Calculate QD parameters with PG integration (sample logic)."""
    try:
        # Connect to DB if needed
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()
        # (You might fetch facility data here if you want.)
        # For now, just do a basic QD calculation from your qd_engine:
        qd_engine = get_engine(request.site_type)

        # Create objects from request
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
        safe_distance = qd_engine.calculate_esqd(
            quantity=request.quantity,
            material_props=material_props,
            env_conditions=env_conditions,
            k_factor=request.k_factor
        )
        buffer_zones = qd_engine.generate_k_factor_rings(
            center_lat=request.lat,
            center_lon=request.lng,
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
    finally:
        if 'cur' in locals(): cur.close()
        if 'conn' in locals(): conn.close()


# -------------------------
# Additional DB / location endpoints
# -------------------------
@app.get("/reports/facilities")
async def return_facilities_report():
    """Provide report on facilities. Example usage in your front-end JS."""
    facilities = [
        {"id": 1, "name": "Facility A", "lat": 40.7128, "lng": -74.0060},
        {"id": 2, "name": "Facility B", "lat": 34.0522, "lng": -118.2437}
    ]
    return JSONResponse(content=facilities, headers={"Content-Type": "application/json"})


# This route returns an object with "locations": [...]
@app.get("/api/locations")
async def get_locations(include_deleted: bool = False):
    """Get list of locations as JSON with a 'locations' key."""
    try:
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()
        # (Simplified query for demonstration)
        cur.execute("SELECT id, location_name, created_at FROM locations")
        rows = cur.fetchall()
        locations = []
        for row in rows:
            loc_id, loc_name, created_at = row
            locations.append({
                "id": loc_id,
                "name": loc_name,
                "created_at": str(created_at)
            })
        return JSONResponse(content={"locations": locations})
    except Exception as e:
        print(f"Database error in /api/locations: {e}")
        return JSONResponse(content={"error": "Failed to fetch locations"}, status_code=500)
    finally:
        if 'cur' in locals(): cur.close()
        if 'conn' in locals(): conn.close()


@app.get("/api/recycle_bin")
async def get_recycle_bin():
    """Get list of deleted locations (example)."""
    # Implementation omitted for brevity
    return {"locations": [], "message": "Recycle bin not implemented fully."}


@app.get("/api/load_location/{location_id}")
async def load_location(location_id: int):
    """Load a location and its data by ID."""
    # Example. Adjust for your data model.
    return {"location_id": location_id, "facilities": [], "qdArcs": [], "analysis": []}


@app.post("/api/create_location")
async def create_location_api(request: Request):
    """Create location via API."""
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
        return JSONResponse(content={"id": row[0], "name": row[1]})
    finally:
        cur.close()
        conn.close()

@app.post("/api/edit_location/{location_id}")
async def edit_location(location_id: int, request: Request):
    """Edit a location name."""
    # Example logic
    data = await request.json()
    new_name = data.get("location_name", "Untitled")
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    try:
        cur.execute("UPDATE locations SET location_name = %s WHERE id = %s",
                    (new_name, location_id))
        conn.commit()
        return {"success": True, "id": location_id, "name": new_name}
    finally:
        cur.close()
        conn.close()

@app.delete("/api/delete_location/{location_id}")
async def delete_location(location_id: int, permanent: bool = False):
    """Delete or recycle bin a location."""
    # Example logic
    return {"success": True, "message": "Location deleted or moved to recycle bin."}

@app.post("/api/restore_location/{location_id}")
async def restore_location(location_id: int):
    """Restore location from recycle bin."""
    return {"success": True, "message": "Location restored."}

@app.delete("/api/empty_recycle_bin")
async def empty_recycle_bin():
    """Empty recycle bin."""
    return {"success": True, "deleted_count": 0}

# Example: load-layers, save-layers
@app.get("/api/load-layers")
async def load_layers():
    # Return a minimal FeatureCollection for demonstration
    data = {"type": "FeatureCollection", "features": []}
    return JSONResponse(content={"layers": data})

@app.post("/api/save-layers")
async def save_layers(request: Request):
    # Example: read some JSON, store in DB
    return {"status": "success", "message": "Data saved to DB (example)"}

# Example polygon saving
class PolygonData(BaseModel):
    location: str
    geometry: Dict[str, Any]
    properties: Dict[str, Any] = {}

@app.post("/api/save_polygon")
async def save_polygon(data: PolygonData):
    # Example stub
    return {"status": "success", "location": data.location}


# -------------------------
# DB INITIALIZATION
# -------------------------
def init_db():
    """Initializes the database tables if they don't exist."""
    db_url = os.environ.get('DATABASE_URL') or "postgresql://postgres:postgres@localhost:5432/postgres"
    print(f"Using DB: {db_url}")
    try:
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        # Basic example: create 'locations' table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS locations (
                id SERIAL PRIMARY KEY,
                location_name VARCHAR(255) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                deleted BOOLEAN DEFAULT FALSE,
                deleted_at TIMESTAMP WITH TIME ZONE
            )
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS records (
                id SERIAL PRIMARY KEY,
                location_id INTEGER REFERENCES locations(id) ON DELETE CASCADE,
                info TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS map_layers (
                name VARCHAR(255) PRIMARY KEY,
                layer_config JSONB,
                is_active BOOLEAN DEFAULT TRUE
            )
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS analysis_results (
                id SERIAL PRIMARY KEY,
                analysis_type VARCHAR(255) REFERENCES map_layers(name) ON DELETE CASCADE,
                result_geometry GEOGRAPHY(Geometry,4326),
                result_data JSONB
            )
        """)
        conn.commit()
    except Exception as e:
        print(f"Error initializing DB: {e}")
    finally:
        if 'cur' in locals(): cur.close()
        if 'conn' in locals(): conn.close()

if __name__ == "__main__":
    init_db()
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True, access_log=True)
