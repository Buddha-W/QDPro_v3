from fastapi import FastAPI, Request, Depends, HTTPException, status
import json
import os
import os.path
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

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

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")

templates = Jinja2Templates(directory="static/templates")

@app.get("/")
async def render_web_page(request: Request):
    """Render main web page with user context if applicable."""
    try:
        current_user = await get_current_user(request.headers.get("Authorization"))
    except HTTPException as http_exc:
        current_user = None
        if http_exc.status_code != status.HTTP_401_UNAUTHORIZED:
            raise

    return templates.TemplateResponse("site_plan.html", {
        "request": request,
        "authenticated": current_user is not None,
        "username": current_user if current_user else None
    })

@app.get("/reports/facilities")
async def return_facilities_report():
    """Provide report on facilities."""
    facilities = [
        {"id": 1, "name": "Facility A", "lat": 40.7128, "lng": -74.0060},
        {"id": 2, "name": "Facility B", "lat": 34.0522, "lng": -118.2437}
    ]
    return JSONResponse(
        content=facilities,
        headers={"Content-Type": "application/json"}
    )

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
            cur.execute("""
                INSERT INTO map_layers (name, layer_config, is_active)
                VALUES (%s, %s, %s)
                ON CONFLICT ON CONSTRAINT map_layers_name_key DO UPDATE 
                SET layer_config = EXCLUDED.layer_config
            """, (layer_name, json.dumps(layer_data['properties']), True))

            # Save features as analysis results
            if layer_data.get('features'):
                for feature in layer_data['features']:
                    cur.execute("""
                        INSERT INTO analysis_results 
                        (analysis_type, result_geometry, result_data)
                        VALUES (%s, ST_GeomFromGeoJSON(%s), %s)
                    """, (layer_name, json.dumps(feature['geometry']), 
                         json.dumps(feature.get('properties', {}))))

        conn.commit()
        return JSONResponse(content={"status": "success", "message": "Data saved to database"})
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error saving layers: {error_details}")
        raise HTTPException(status_code=500, detail=f"Failed to save: {str(e)}\n{error_details}")
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
        cur.execute("SELECT name, layer_config FROM map_layers WHERE is_active = true")
        for name, config in cur.fetchall():
            layers[name] = {
                "properties": config if isinstance(config, dict) else json.loads(config),
                "features": []
            }

        # Load features for each layer
        for layer_name in layers:
            cur.execute("""
                SELECT ST_AsGeoJSON(result_geometry), result_data 
                FROM analysis_results 
                WHERE analysis_type = %s
            """, (layer_name,))

            for geom, properties in cur.fetchall():
                layers[layer_name]["features"].append({
                    "type": "Feature",
                    "geometry": json.loads(geom),
                    "properties": properties if isinstance(properties, dict) else json.loads(properties)
                })

        return JSONResponse(
            content={"layers": layers},
            headers={"Content-Type": "application/json"}
        )
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error loading layers: {error_details}")  # Debug log
        return JSONResponse(
            content={"layers": {}, "error": str(e)},
            headers={"Content-Type": "application/json"},
            status_code=500
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)