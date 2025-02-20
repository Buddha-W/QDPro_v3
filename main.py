from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from reports import generate_facility_report, generate_safety_analysis
from auth import get_current_user, create_access_token, User
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine
from geoalchemy2 import functions as gfunc
from shapely.geometry import Point, Polygon
from typing import List, Optional
import uvicorn
from pydantic import BaseModel
import os
import secrets
from audit import log_activity # Added import for logging


app = FastAPI(title="QDPro GIS System", version="1.0.0")

from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.gzip import GZipMiddleware
import re

app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])
app.add_middleware(GZipMiddleware, minimum_size=1000)

@app.middleware("http")
async def security_middleware(request: Request, call_next):
    request_id = secrets.token_hex(16)
    request.state.request_id = request_id

    # Log incoming request
    log_activity(
        user_id=request.headers.get("X-User-ID", "anonymous"),
        action="REQUEST",
        resource=str(request.url),
        status="INITIATED",
        details={"request_id": request_id, "method": request.method}
    )

    response = await call_next(request)

    # Enhanced security headers
    response.headers.update({
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
        "Cache-Control": "no-store, max-age=0",
        "Content-Security-Policy": "default-src 'self'; script-src 'self'; object-src 'none'",
        "X-XSS-Protection": "1; mode=block",
        "X-Request-ID": request_id,
        "X-Permitted-Cross-Domain-Policies": "none",
        "Referrer-Policy": "strict-origin-when-cross-origin"
    })

    # Log response
    log_activity(
        user_id=request.headers.get("X-User-ID", "anonymous"),
        action="REQUEST",
        resource=str(request.url),
        status="COMPLETED",
        details={"request_id": request_id, "status_code": response.status_code}
    )

    return response

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/qdpro")
engine = create_engine(DATABASE_URL)

# Models
class FacilityBase(BaseModel):
    facility_number: str
    description: str
    category_code: str
    latitude: float
    longitude: float

class ExplosiveSiteBase(BaseModel):
    facility_id: int
    net_explosive_weight: float
    k_factor: float = 50.0
    hazard_type: str

@app.get("/")
async def root():
    return {"message": "QDPro GIS System API"}

@app.post("/facilities/")
async def create_facility(facility: FacilityBase):
    point = Point(facility.longitude, facility.latitude)
    query = """
        INSERT INTO facilities (facility_number, description, category_code, location)
        VALUES (%s, %s, %s, ST_SetSRID(ST_GeomFromText(%s), 4326))
        RETURNING id
    """
    with engine.connect() as conn:
        result = conn.execute(
            query,
            (facility.facility_number, facility.description, facility.category_code, point.wkt)
        )
        return {"id": result.fetchone()[0]}

@app.post("/explosive-sites/")
async def create_explosive_site(site: ExplosiveSiteBase):
    query = """
        INSERT INTO explosive_sites 
        (facility_id, net_explosive_weight, k_factor, hazard_type)
        VALUES (%s, %s, %s, %s)
        RETURNING id
    """
    with engine.connect() as conn:
        result = conn.execute(
            query,
            (site.facility_id, site.net_explosive_weight, site.k_factor, site.hazard_type)
        )
        return {"id": result.fetchone()[0]}

@app.get("/calculate-esqd/{site_id}")
async def calculate_esqd(site_id: int):
    """Calculate ESQD arc for an explosive site"""
    query = """
    WITH site_data AS (
        SELECT 
            es.id,
            es.net_explosive_weight,
            es.k_factor,
            f.location
        FROM explosive_sites es
        JOIN facilities f ON es.facility_id = f.id
        WHERE es.id = %s
    )
    SELECT 
        id,
        ST_AsGeoJSON(
            ST_Buffer(
                location::geography, 
                (net_explosive_weight ^ (1.0/3.0)) * k_factor
            )::geometry
        ) as arc
    FROM site_data
    """
    with engine.connect() as conn:
        result = conn.execute(query, (site_id,))
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Site not found")
        return {
            "site_id": row[0],
            "esqd_arc": row[1]
        }

app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/", response_class=HTMLResponse)
async def serve_frontend():
    with open("static/index.html") as f:
        return HTMLResponse(content=f.read())

@app.get("/reports/facilities")
async def get_facility_report(current_user: str = Depends(get_current_user)):
    return await generate_facility_report(engine)

@app.get("/reports/safety")
async def get_safety_analysis(current_user: str = Depends(get_current_user)):
    return await generate_safety_analysis(engine)

if __name__ == "__main__":
    # Initialize security controls
    from system_hardening import SystemHardening
    from crypto_validation import CryptoValidator
    from fedramp_compliance import FedRAMPControls
    
    fedramp = FedRAMPControls()
    fedramp_status = fedramp.validate_compliance()
    
    hardening = SystemHardening()
    crypto = CryptoValidator()
    
    # Enforce security controls before starting
    hardening.enforce_security_controls()
    
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True)