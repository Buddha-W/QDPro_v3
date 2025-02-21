from fastapi import FastAPI, Request, Depends, HTTPException, status
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
async def return_facilities_report(current_user: str = Depends(get_current_user)):
    """Provide report on facilities."""
    facilities = [
        {"id": 1, "name": "Facility A", "lat": 40.7128, "lng": -74.0060},
        {"id": 2, "name": "Facility B", "lat": 34.0522, "lng": -118.2437}
    ]
    return JSONResponse(content=facilities)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)