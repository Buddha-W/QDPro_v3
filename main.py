
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine
from geoalchemy2 import functions as gfunc
from shapely.geometry import Point, Polygon
from typing import List, Optional
import uvicorn
from pydantic import BaseModel
import os

app = FastAPI(title="QDPro GIS System", version="1.0.0")

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

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True)
