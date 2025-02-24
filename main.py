import os
import psycopg2
from fastapi import FastAPI, Request, Depends, HTTPException, BackgroundTasks, Form, status
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from typing import List, Dict, Optional
from pydantic import BaseModel
from qd_engine import QDParameters, get_engine

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from qd_engine import get_engine, QDParameters

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

from fastapi.responses import HTMLResponse
import pdfkit
from datetime import datetime

@app.post("/api/sensor-data")
async def update_sensor_data(data: Dict[str, float]):
    """Update real-time sensor data and recalculate risk"""
    # Create QD engine based on site type stored in session/config
    site_type = "DOD"  # TODO: Get from user session
    qd_engine = create_qd_engine(site_type)

    # Update sensor data
    await qd_engine.update_sensor_data(data)

    # Perform risk assessment
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
    # Sample report data
    report_data = {
        "site_id": site_id,
        "timestamp": datetime.now().isoformat(),
        "risk_assessment": "Normal",
        "sensor_readings": {
            "temperature": 25.0,
            "humidity": 60.0
        }
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

@app.post("/api/calculate-qd")
async def calculate_qd(request: QDCalculationRequest):
    """Calculate QD parameters and generate buffer zones"""
    try:
        # Create appropriate QD engine
        qd_engine = create_qd_engine(request.site_type)

        # Create material properties object
        material_props = MaterialProperties(
            sensitivity=request.sensitivity,
            det_velocity=request.det_velocity,
            tnt_equiv=request.tnt_equiv
        )

        # Create environmental conditions object
        env_conditions = EnvironmentalConditions(
            temperature=request.temperature,
            pressure=request.pressure,
            humidity=request.humidity,
            confinement_factor=request.confinement_factor
        )

        # Create material properties object
        material_props = MaterialProperties(
            sensitivity=request.sensitivity,
            det_velocity=request.det_velocity,
            tnt_equiv=request.tnt_equiv
        )

        # Create environmental conditions object
        env_conditions = EnvironmentalConditions(
            temperature=request.temperature,
            pressure=request.pressure,
            humidity=request.humidity,
            confinement_factor=request.confinement_factor
        )

        # Calculate safe distance using QD engine
        safe_distance = qd_engine.calculate_esqd(
            quantity=request.quantity,
            material_props=material_props,
            env_conditions=env_conditions,
            k_factor=request.k_factor
        )

        # Generate K-factor rings
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

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from auth import get_current_user

# Ensure data directory exists
DATA_DIR = os.path.join(os.path.expanduser('~'), "data")
os.makedirs(DATA_DIR, exist_ok=True)

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="static/templates")

@app.post("/api/analyze_qd")
async def analyze_qd(
    background_tasks: BackgroundTasks,
    params: Dict,
):
    try:
        engine = get_engine(params["site_type"])
        qd_params = QDParameters(
            quantity=float(params["quantity"]),
            site_type=params["site_type"],
            material_type=params.get("material_type", "default")
        )

        result = await engine.calculate_safe_distance(
            qd_params,
            params["location"]
        )

        return {
            "safe_distance": result.safe_distance,
            "k_factor": result.k_factor,
            "psi_analysis": result.psi_at_distance,
            "geojson": result.geojson
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/")
async def render_web_page(request: Request):
    """Render main web page with user context if applicable."""
    try:
        current_user = await get_current_user(
            request.headers.get("Authorization"))
    except HTTPException as http_exc:
        current_user = None
        if http_exc.status_code != status.HTTP_401_UNAUTHORIZED:
            print(f"Auth error: {http_exc}")

    try:
        return templates.TemplateResponse(
            "site_plan.html", {
                "request": request,
                "authenticated": current_user is not None,
                "username": current_user if current_user else None
            })
    except Exception as e:
        print(f"Template error: {e}")
        return JSONResponse(content={"error": "Failed to load template"},
                            status_code=500)

    return templates.TemplateResponse(
        "site_plan.html", {
            "request": request,
            "authenticated": current_user is not None,
            "username": current_user if current_user else None
        })


@app.get("/reports/facilities")
async def return_facilities_report():
    """Provide report on facilities."""
    facilities = [{
        "id": 1,
        "name": "Facility A",
        "lat": 40.7128,
        "lng": -74.0060
    }, {
        "id": 2,
        "name": "Facility B",
        "lat": 34.0522,
        "lng": -118.2437
    }]
    return JSONResponse(content=facilities,
                        headers={"Content-Type": "application/json"})


@app.post("/api/save-layers")
async def save_layers(request: Request):
    data = await request.json()
    try:
        import psycopg2
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()

        # Ensure data is in correct format
        if not isinstance(data, dict):
            data = {"layers": data}
        elif "layers" not in data:
            data = {"layers": data}

        for layer_name, layer_data in data['layers'].items():
            # Save layer properties
            cur.execute(
                """
                INSERT INTO map_layers (name, layer_config, is_active)
                VALUES (%s, %s, %s)
                ON CONFLICT ON CONSTRAINT map_layers_name_key DO UPDATE 
                SET layer_config = EXCLUDED.layer_config
            """, (layer_name, json.dumps(layer_data['properties']), True))

            # Save features as analysis results
            if layer_data.get('features'):
                for feature in layer_data['features']:
                    cur.execute(
                        """
                        INSERT INTO analysis_results 
                        (analysis_type, result_geometry, result_data)
                        VALUES (%s, ST_GeomFromGeoJSON(%s), %s)
                    """, (layer_name, json.dumps(feature['geometry']),
                          json.dumps(feature.get('properties', {}))))

        conn.commit()
        return JSONResponse(content={
            "status": "success",
            "message": "Data saved to database"
        })
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error saving layers: {error_details}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save: {str(e)}\n{error_details}")
    finally:
        if 'cur' in locals(): cur.close()
        if 'conn' in locals(): conn.close()


@app.get("/api/load-layers")
async def load_layers():
    try:
        import psycopg2
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()

        layers = {}

        # Load layer configurations
        cur.execute(
            "SELECT name, layer_config FROM map_layers WHERE is_active = true")
        for name, config in cur.fetchall():
            layers[name] = {
                "properties":
                config if isinstance(config, dict) else json.loads(config),
                "features": []
            }

        # Load features for each layer
        for layer_name in layers:
            cur.execute(
                """
                SELECT ST_AsGeoJSON(result_geometry), result_data 
                FROM analysis_results 
                WHERE analysis_type = %s
            """, (layer_name, ))

            for geom, properties in cur.fetchall():
                layers[layer_name]["features"].append({
                    "type":
                    "Feature",
                    "geometry":
                    json.loads(geom),
                    "properties":
                    properties
                    if isinstance(properties, dict) else json.loads(properties)
                })

        return JSONResponse(content={"layers": layers},
                            headers={"Content-Type": "application/json"})
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error loading layers: {error_details}")  # Debug log
        return JSONResponse(content={
            "layers": {},
            "error": str(e)
        },
                            headers={"Content-Type": "application/json"},
                            status_code=500)

@app.get("/api/locations")
async def get_locations():
    """Get list of locations as JSON."""
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT l.id, l.location_name, l.created_at, COUNT(r.id) as record_count 
            FROM locations l 
            LEFT JOIN records r ON l.id = r.location_id 
            GROUP BY l.id, l.location_name, l.created_at 
            ORDER BY l.created_at DESC
        """)
        locations = [{
            "id": id,
            "name": name,
            "created_at": str(created_at),
            "record_count": record_count
        } for id, name, created_at, record_count in cur.fetchall()]
        return JSONResponse(content={"locations": locations})
    except Exception as e:
        print(f"Error fetching locations: {e}")
        return JSONResponse(
            content={"error": "Failed to fetch locations"},
            status_code=500
        )
    finally:
        cur.close()
        conn.close()

@app.post("/api/create_location")
async def create_location_api(request: Request):
    """Create location via API."""
    data = await request.json()
    location_name = data.get("location_name")
    if not location_name:
        raise HTTPException(status_code=400, detail="Location name is required")

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO locations (location_name) VALUES (%s) RETURNING id, location_name",
            (location_name,)
        )
        id, name = cur.fetchone()
        conn.commit()
        return JSONResponse(content={"id": id, "name": name})
    finally:
        cur.close()
        conn.close()

@app.get("/ui/create_location")
async def show_create_location(request: Request):
    """Show the create location form."""
    return templates.TemplateResponse(
        "create_location.html",
        {"request": request}
    )

@app.post("/ui/create_location")
async def create_location(location_name: str = Form(...)):
    """Create a new location."""
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO locations (location_name) VALUES (%s) RETURNING id",
            (location_name,)
        )
        conn.commit()
        return RedirectResponse(url="/ui/locations", status_code=303)
    finally:
        cur.close()
        conn.close()

@app.get("/ui/open_location/{location_id}")
async def open_location(request: Request, location_id: int):
    """Show location details and its records."""
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    try:
        # Get location details
        cur.execute(
            "SELECT location_name, created_at FROM locations WHERE id = %s",
            (location_id,)
        )
        location = cur.fetchone()
        if not location:
            raise HTTPException(status_code=404, detail="Location not found")

        # Get location records
        cur.execute(
            "SELECT id, info, created_at FROM records WHERE location_id = %s ORDER BY created_at DESC",
            (location_id,)
        )
        records = [{"id": id, "info": info, "created_at": created_at}
                  for id, info, created_at in cur.fetchall()]

        return templates.TemplateResponse(
            "open_location.html",
            {
                "request": request,
                "location_id": location_id,
                "location_name": location[0],
                "location_created_at": location[1],
                "records": records
            }
        )
    finally:
        cur.close()
        conn.close()

@app.post("/ui/open_location/{location_id}/add_record")
async def add_record(location_id: int, info: str = Form(...)):
    """Add a new record to a location."""
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO records (location_id, info) VALUES (%s, %s)",
            (location_id, info)
        )
        conn.commit()
        return RedirectResponse(
            url=f"/ui/open_location/{location_id}",
            status_code=303
        )
    finally:
        cur.close()
        conn.close()

def init_db():
    """Initializes the database tables if they don't exist."""
    try:
        db_url = os.environ.get('DATABASE_URL')
        if not db_url:
            db_url = "postgresql://postgres:postgres@localhost:5432/postgres"
            print(f"Warning: DATABASE_URL not set, using default: {db_url}")
        print("Initializing database...")
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS locations (
                id SERIAL PRIMARY KEY,
                location_name VARCHAR(255) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
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
    except psycopg2.Error as e:
        print(f"Error initializing database: {e}")
    except Exception as e:
        print(f"An unexpected error occurred during database initialization: {e}")
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()


import uvicorn
import json
from fastapi.responses import Response
from fastapi.responses import RedirectResponse
from qd_engine import get_engine, MaterialProperties, EnvironmentalConditions

if __name__ == "__main__":
    init_db()  # Initialize database tables
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True, access_log=True)