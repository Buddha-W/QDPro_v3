
from typing import List, Optional
from pydantic import BaseModel
from sqlalchemy import create_engine, text
from datetime import datetime
import json

class Report(BaseModel):
    title: str
    generated_at: datetime
    data: dict

async def generate_facility_report(engine) -> Report:
    query = """
    SELECT 
        f.facility_number,
        f.description,
        f.category_code,
        ST_AsGeoJSON(f.location) as location,
        COUNT(es.id) as explosive_sites_count
    FROM facilities f
    LEFT JOIN explosive_sites es ON f.id = es.facility_id
    GROUP BY f.id
    """
    with engine.connect() as conn:
        result = conn.execute(text(query))
        facilities = [dict(row) for row in result]
    
    return Report(
        title="Facility Summary Report",
        generated_at=datetime.now(),
        data={"facilities": facilities}
    )

async def generate_safety_analysis(engine) -> Report:
    query = """
    SELECT 
        es.id,
        f.facility_number,
        es.net_explosive_weight,
        es.net_explosive_weight * 0.453592 as net_explosive_weight_kg,
        es.hazard_type,
        ST_AsGeoJSON(ST_Buffer(
            f.location::geography, 
            (es.net_explosive_weight ^ (1.0/3.0)) * es.k_factor
        )::geometry) as safety_arc,
        es.approval_status,
        es.review_date,
        es.reviewer_comments
    FROM explosive_sites es
    JOIN facilities f ON es.facility_id = f.id
    """

async def generate_site_plan_report(engine, site_id: int) -> Report:
    query = """
    SELECT 
        f.facility_number,
        f.description,
        es.net_explosive_weight,
        es.hazard_type,
        es.approval_status,
        es.review_date,
        es.reviewer_comments,
        ST_AsGeoJSON(f.location) as location,
        ST_AsGeoJSON(ST_Buffer(
            f.location::geography, 
            (es.net_explosive_weight ^ (1.0/3.0)) * es.k_factor
        )::geometry) as safety_arc
    FROM explosive_sites es
    JOIN facilities f ON es.facility_id = f.id
    WHERE es.id = :site_id
    """
    with engine.connect() as conn:
        result = conn.execute(text(query), {"site_id": site_id})
        site_data = dict(result.fetchone())
    
    return Report(
        title="Site Plan Review Report",
        generated_at=datetime.now(),
        data={"site_plan": site_data}
    )
    with engine.connect() as conn:
        result = conn.execute(text(query))
        analysis = [dict(row) for row in result]
    
    return Report(
        title="Safety Analysis Report",
        generated_at=datetime.now(),
        data={"safety_analysis": analysis}
    )
