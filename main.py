from fastapi import FastAPI, Request, Depends, HTTPException, status, Form
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
import json
import os
import os.path
import psycopg2

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

app.mount("/static", StaticFiles(directory="static", html=True), name="static")

templates = Jinja2Templates(directory="static/templates")


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
        cur.execute("SELECT id, location_name, created_at FROM locations ORDER BY created_at DESC")
        locations = [{"id": id, "name": name, "created_at": str(created_at)} 
                    for id, name, created_at in cur.fetchall()]
        return JSONResponse(content={"locations": locations})
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
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    try:
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
        conn.commit()
    except Exception as e:
        print(f"Error initializing database: {e}")
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    import uvicorn
    init_db()  # Initialize database tables
    uvicorn.run("main:app", host="0.0.0.0", port=3000, reload=True, access_log=True)