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
    try:
        data = await request.json()
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()
        layer_name = data.get("layer_name", "Default")
        layer_config = {"type": "FeatureCollection", "features": data.get("features", [])}
        if location_id:
            cur.execute("""
                INSERT INTO map_layers (name, layer_config, location_id, is_active)
                VALUES (%s, %s, %s, TRUE)
                ON CONFLICT (name) DO UPDATE SET layer_config = EXCLUDED.layer_config, is_active = TRUE
            """, (layer_name, json.dumps(layer_config), location_id))
        else:
            cur.execute("""
                INSERT INTO map_layers (name, layer_config, is_active)
                VALUES (%s, %s, TRUE)
                ON CONFLICT (name) DO UPDATE SET layer_config = EXCLUDED.layer_config, is_active = TRUE
            """, (layer_name, json.dumps(layer_config)))
        conn.commit()
        return {"status": "success", "message": f"Layer '{layer_name}' saved to DB"}
    except Exception as e:
        logger.error(f"Error saving layers: {str(e)}")
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        if 'cur' in locals(): cur.close()
        if 'conn' in locals(): conn.close()

# Location Endpoints
@app.get("/api/locations")
async def get_locations(include_deleted: bool = False):
    try:
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()
        query = "SELECT id, location_name, created_at FROM locations WHERE deleted = FALSE" if not include_deleted else "SELECT id, location_name, created_at FROM locations"
        cur.execute(query)
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
        cur.execute("SELECT location_name FROM locations WHERE id = %s AND deleted = FALSE", (location_id,))
        row = cur.fetchone()
        if not row:
            return JSONResponse(status_code=404, content={"error": "Location not found"})
        return {"location_id": location_id, "name": row[0], "facilities": [], "qdArcs": [], "analysis": []}
    except Exception as e:
        logger.error(f"Error loading location: {str(e)}")
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        if 'cur' in locals(): cur.close()
        if 'conn' in locals(): conn.close()

# QD Calculation Endpoint (unchanged for now)
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

# Database Initialization
def init_db():
    db_url = os.environ.get('DATABASE_URL', "postgresql://postgres:postgres@localhost:5432/postgres")
    print(f"Using DB: {db_url}")
    try:
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
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
            CREATE TABLE IF NOT EXISTS map_layers (
                name VARCHAR(255) NOT NULL,
                layer_config JSONB,
                location_id INTEGER REFERENCES locations(id) ON DELETE CASCADE,
                is_active BOOLEAN DEFAULT TRUE,
                PRIMARY KEY (name, location_id)
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