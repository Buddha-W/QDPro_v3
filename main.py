from fastapi import FastAPI, Request, Depends, HTTPException, status
import json
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import JSONResponse

from auth import get_current_user

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
    """Save layer data to database."""
    data = await request.json()
    try:
        # Ensure we have write permissions
        import os
        file_path = "layer_data.json"
        
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(file_path) if os.path.dirname(file_path) else '.', exist_ok=True)
        
        # Write with proper permissions
        with open(file_path, "w", encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        # Ensure file is readable
        os.chmod(file_path, 0o666)
        
        return JSONResponse(content={"status": "success"})
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        raise HTTPException(status_code=500, detail=f"Failed to save: {str(e)}\n{error_details}")

@app.get("/api/load-layers")
async def load_layers():
    """Load layer data from database."""
    try:
        file_path = "layer_data.json"
        if not os.path.exists(file_path):
            # Return empty layer data structure
            return JSONResponse(content={"layers": {}})
            
        with open(file_path, "r", encoding='utf-8') as f:
            data = json.load(f)
            # Ensure we always return an object with a layers property
            if not isinstance(data, dict):
                data = {"layers": {}}
            elif "layers" not in data:
                data = {"layers": data}
            return JSONResponse(content=data)
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        return JSONResponse(
            content={"layers": {}},
            status_code=200  # Return empty data instead of error
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)