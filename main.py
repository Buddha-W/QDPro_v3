from fastapi import FastAPI, Request, Depends, HTTPException, status
import json
import os
import os.path
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import JSONResponse

from auth import get_current_user

# Ensure data directory exists
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
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
    return JSONResponse(content=facilities)

@app.post("/api/save-layers")
async def save_layers(request: Request):
    data = await request.json()
    try:
        file_path = os.path.join(DATA_DIR, "layer_data.json")
        print(f"Saving to: {file_path}")  # Debug log
        print(f"Data to save: {json.dumps(data, indent=2)}")  # Debug log

        # Ensure data is in correct format
        if not isinstance(data, dict):
            data = {"layers": data}
        elif "layers" not in data:
            data = {"layers": data}

        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(file_path) if os.path.dirname(file_path) else '.', exist_ok=True)

        with open(file_path, "w", encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.flush()
            os.fsync(f.fileno())

        return JSONResponse(content={"status": "success", "message": "Data saved successfully", "path": file_path})
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error saving layers: {error_details}")  # Debug log
        raise HTTPException(status_code=500, detail=f"Failed to save: {str(e)}\n{error_details}")

@app.get("/api/load-layers")
async def load_layers():
    try:
        file_path = os.path.join(DATA_DIR, "layer_data.json")
        print(f"Loading from: {file_path}")  # Debug log

        if not os.path.exists(file_path):
            print(f"File not found: {file_path}")  # Debug log
            return JSONResponse(content={"layers": {}})

        with open(file_path, "r", encoding='utf-8') as f:
            data = json.load(f)
            print(f"Loaded data: {json.dumps(data, indent=2)}")  # Debug log

            if not isinstance(data, dict):
                data = {"layers": data}
            elif "layers" not in data:
                data = {"layers": data}

            return JSONResponse(content=data)
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error loading layers: {error_details}")  # Debug log
        return JSONResponse(content={"layers": {}})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)