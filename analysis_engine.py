
from typing import Dict, List, Tuple
from geoalchemy2 import functions as gfunc
from shapely.geometry import Point, Polygon
from sqlalchemy import text
import math

class ExplosionAnalysis:
    def __init__(self, engine):
        self.engine = engine

    def calculate_k_factor_distance(self, NEW: float, k_factor: float) -> float:
        """Calculate distance using K-factor formula: D = K * W^(1/3)"""
        return k_factor * math.pow(NEW, 1/3)

    def analyze_pes_to_es(self, pes_id: int) -> Dict:
        """Analyze relationships between PES and potential ES"""
        query = """
        WITH pes AS (
            SELECT 
                es.id,
                es.net_explosive_weight,
                es.k_factor,
                es.hazard_type,
                f.location,
                f.facility_number
            FROM explosive_sites es
            JOIN facilities f ON es.facility_id = f.id
            WHERE es.id = :pes_id
        ),
        potential_es AS (
            SELECT 
                f.id,
                f.facility_number,
                f.location,
                ST_Distance(
                    pes.location::geography,
                    f.location::geography
                ) as distance
            FROM facilities f
            CROSS JOIN pes
            WHERE f.id != pes.id
        )
        SELECT 
            pe.id,
            pe.facility_number,
            pe.distance,
            ST_AsGeoJSON(pe.location) as location
        FROM potential_es pe
        WHERE pe.distance <= (
            SELECT calculate_k_factor_distance(
                pes.net_explosive_weight,
                pes.k_factor
            ) FROM pes
        )
        """
        
        with self.engine.connect() as conn:
            result = conn.execute(text(query), {"pes_id": pes_id})
            exposed_sites = []
            for row in result:
                exposed_sites.append({
                    "facility_id": row.id,
                    "facility_number": row.facility_number,
                    "distance": row.distance,
                    "location": row.location
                })
            
            return {
                "pes_id": pes_id,
                "exposed_sites": exposed_sites
            }

    def generate_safety_arc(self, pes_id: int) -> Dict:
        """Generate safety arc for a PES"""
        query = """
        WITH pes AS (
            SELECT 
                es.id,
                es.net_explosive_weight,
                es.k_factor,
                f.location
            FROM explosive_sites es
            JOIN facilities f ON es.facility_id = f.id
            WHERE es.id = :pes_id
        )
        SELECT 
            ST_AsGeoJSON(
                ST_Buffer(
                    location::geography,
                    calculate_k_factor_distance(
                        net_explosive_weight,
                        k_factor
                    )
                )::geometry
            ) as safety_arc
        FROM pes
        """
        
        with self.engine.connect() as conn:
            result = conn.execute(text(query), {"pes_id": pes_id})
            row = result.fetchone()
            return {"safety_arc": row.safety_arc}
