<replit_final_file>
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

        # Organization-specific K-factors
        self.k_factors = {
            'DOD': {
                'default': 40,
                'public_traffic_route': 24,
                'inhabited_building': 40,
                'military_boundary': 18
            },
            'DOE': {
                'default': 50,
                'public_area': 44,
                'controlled_area': 32,
                'laboratory': 40,
                'storage': 25
            }
        }

        # Lab-specific configurations
        self.doe_labs = {
            'LANL': {'factor_adjustment': 1.1},
            'LLNL': {'factor_adjustment': 1.05},
            'SNL': {'factor_adjustment': 1.15},
            'ORNL': {'factor_adjustment': 1.0},
            'PNNL': {'factor_adjustment': 1.08}
        }

    @lru_cache(maxsize=1000)
    def calculate_distance(self, NEW: float, org_type: str, facility_type: str, lab: str = None) -> float:
        """Calculate QD based on organization type and facility"""
        try:
            k_factor = self.k_factors[org_type].get(facility_type, 
                      self.k_factors[org_type]['default'])

            # Apply lab-specific adjustments for DOE
            if org_type == 'DOE' and lab in self.doe_labs:
                k_factor *= self.doe_labs[lab]['factor_adjustment']

            # Calculate using cube root formula
            return k_factor * math.pow(NEW, 1/3)
        except Exception as e:
            self.error_recovery.handle_calculation_error(e)
            return 0.0

    async def analyze_pes_to_es(self, pes_id: int, org_type: str) -> Dict:
        """Analyze PES to ES relationships with organization-specific rules and standards"""
        from standards_db import Standards, StandardType
        
        # Get applicable standards
        std_type = StandardType.DOD if org_type == 'DOD' else StandardType.DOE
        applicable_standards = Standards.get_all_references(std_type)
        try:
            query = """
            WITH pes AS (
                SELECT 
                    es.id,
                    es.net_explosive_weight,
                    es.hazard_type,
                    es.organization_type,
                    es.facility_type,
                    es.lab_designation,
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
                    f.facility_type,
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
                pe.facility_type,
                pe.distance,
                ST_AsGeoJSON(pe.location) as location
            FROM potential_es pe
            """

            loop = asyncio.get_event_loop()
            with self.engine.connect() as conn:
                result = await loop.run_in_executor(
                    self.thread_pool,
                    lambda: conn.execute(text(query), {"pes_id": pes_id})
                )

                exposed_sites = []
                for row in result:
                    distance = self.calculate_distance(
                        NEW=row.net_explosive_weight,
                        org_type=org_type,
                        facility_type=row.facility_type,
                        lab=row.lab_designation
                    )

                    # Get applicable standard reference
                    standard_ref = Standards.get_reference(
                        StandardType.DOD if org_type == 'DOD' else StandardType.DOE,
                        'quantity_distance'
                    )

                    exposed_sites.append({
                        "facility_id": row.id,
                        "facility_number": row.facility_number,
                        "distance": row.distance,
                        "required_distance": distance,
                        "compliant": row.distance >= distance,
                        "location": row.location,
                        "standard_reference": {
                            "document": standard_ref.get('ref'),
                            "chapters": standard_ref.get('chapters'),
                            "description": standard_ref.get('description')
                        }
                    })

                return {
                    "pes_id": pes_id,
                    "organization": org_type,
                    "exposed_sites": exposed_sites
                }

        except Exception as e:
            await self.error_recovery.handle_database_error(e)
            return {"error": str(e)}

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