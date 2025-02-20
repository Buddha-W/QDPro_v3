
from typing import Dict, List, Tuple, Optional
from geoalchemy2 import functions as gfunc
from shapely.geometry import Point, Polygon
from sqlalchemy import text
import math
from functools import lru_cache
from error_recovery import ErrorRecovery
import asyncio
from concurrent.futures import ThreadPoolExecutor

class ExplosionAnalysis:
    def __init__(self, engine):
        self.engine = engine
        self.error_recovery = ErrorRecovery()
        self.thread_pool = ThreadPoolExecutor(max_workers=4)

    @lru_cache(maxsize=1000)
    def calculate_k_factor_distance(self, NEW: float, k_factor: float) -> float:
        """Calculate distance using K-factor formula: D = K * W^(1/3)"""
        try:
            return k_factor * math.pow(NEW, 1/3)
        except Exception as e:
            self.error_recovery.handle_calculation_error(e)
            return 0.0

    async def analyze_pes_to_es(self, pes_id: int) -> Dict:
        """Analyze relationships between PES and potential ES with batched processing"""
        try:
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
            
            loop = asyncio.get_event_loop()
            with self.engine.connect() as conn:
                result = await loop.run_in_executor(
                    self.thread_pool,
                    lambda: conn.execute(text(query), {"pes_id": pes_id})
                )
                exposed_sites = []
                
                # Process results in batches
                batch_size = 100
                batch = []
                
                for row in result:
                    batch.append({
                        "facility_id": row.id,
                        "facility_number": row.facility_number,
                        "distance": row.distance,
                        "location": row.location
                    })
                    
                    if len(batch) >= batch_size:
                        exposed_sites.extend(batch)
                        batch = []
                
                if batch:
                    exposed_sites.extend(batch)
                
                return {
                    "pes_id": pes_id,
                    "exposed_sites": exposed_sites
                }
        except Exception as e:
            await self.error_recovery.handle_database_error(e)
            return {"pes_id": pes_id, "exposed_sites": [], "error": str(e)}

    async def generate_safety_arc(self, pes_id: int) -> Dict:
        """Generate safety arc for a PES with caching"""
        try:
            cache_key = f"safety_arc_{pes_id}"
            cached_result = self._get_cached_arc(cache_key)
            if cached_result:
                return cached_result

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
            
            loop = asyncio.get_event_loop()
            with self.engine.connect() as conn:
                result = await loop.run_in_executor(
                    self.thread_pool,
                    lambda: conn.execute(text(query), {"pes_id": pes_id})
                )
                row = result.fetchone()
                if not row:
                    return {"error": "PES not found"}
                    
                arc_data = {"safety_arc": row.safety_arc}
                self._cache_arc(cache_key, arc_data)
                return arc_data
                
        except Exception as e:
            await self.error_recovery.handle_database_error(e)
            return {"error": str(e)}

    def _get_cached_arc(self, key: str) -> Optional[Dict]:
        # Implement caching logic here
        return None

    def _cache_arc(self, key: str, data: Dict) -> None:
        # Implement caching logic here
        pass
