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
        
    async def batch_analyze_sites(self, site_ids: List[int]) -> Dict[int, Any]:
        results = {}
        for site_id in site_ids:
            try:
                safety_arc = await self.generate_safety_arc(site_id)
                exposed_sites = await self.analyze_pes_to_es(site_id)
                results[site_id] = {
                    "safety_arc": safety_arc,
                    "exposed_sites": exposed_sites,
                    "status": "success"
                }
            except Exception as e:
                results[site_id] = {
                    "status": "error",
                    "error": str(e)
                }
        return results
        self.error_recovery = ErrorRecovery()
        self.thread_pool = ThreadPoolExecutor(max_workers=4)

        # Organization-specific K-factors
        self.unit_conversions = {
            'kg_to_lbs': 2.20462,
            'g_to_lbs': 0.00220462,
            'lbs_to_kg': 0.453592
        }
        
        self.k_factors = {
            'DOD': {
                'default': 40,
                'public_traffic_route': 24,
                'inhabited_building': 40,
                'military_boundary': 18,
            },
            'AIR_FORCE': {
                'default': 40,
                'public_traffic_route': 24,
                'inhabited_building': 42,
                'military_boundary': 18,
                'flight_line': 45,
                'munitions_storage': 38,
                'maintenance_facility': 42,
                'alert_aircraft': 50,
                'aircraft_parking': {
                    'combat': 35,
                    'cargo': 40,
                    'passenger': 45,
                    'alert_status': 50
                },
                'runway': {
                    'active': 45,
                    'inactive': 35,
                    'taxiway': 30
                },
                'maintenance_facility': {
                    'major_repair': 45,
                    'minor_repair': 35,
                    'loading': 50
                }
            },
            'NATO': {
                'default': 44.4,
                'public_traffic_route': 22.2,
                'inhabited_building': 44.4,
                'process_building': 33.3,
                'storage': 25
            },
            'DOE': {
                'default': 50,
                'public_area': 44,
                'controlled_area': 32,
                'laboratory': 40,
                'storage': 25,
                # DoD cross-reference factors
                'dod_equivalent_factors': {
                    'public_area': 'inhabited_building',
                    'controlled_area': 'military_boundary',
                    'storage': 'default'
                }
            }
        }

        # Aircraft siting parameters per DoD 6055.09-M
        self.aircraft_parameters = {
            'combat_aircraft': {'safe_distance_multiplier': 1.2},
            'cargo_aircraft': {'safe_distance_multiplier': 1.4},
            'passenger_aircraft': {'safe_distance_multiplier': 1.8},
            'maintenance_area': {'safe_distance_multiplier': 1.3}
        }

        # Lab-specific configurations
        self.doe_labs = {
            'LANL': {'factor_adjustment': 1.15},
            'LLNL': {'factor_adjustment': 1.12},
            'SNL': {'factor_adjustment': 1.18},
            'ORNL': {'factor_adjustment': 1.1},
            'PNNL': {'factor_adjustment': 1.12},
            'Y12': {'factor_adjustment': 1.15},
            'Pantex': {'factor_adjustment': 1.2}
        }

    @lru_cache(maxsize=1000)
    def calculate_distance(self, NEW: float, org_type: str, facility_type: str, lab: str = None, unit: str = 'lbs') -> float:
        """Calculate QD based on organization type and facility"""
        try:
            k_factor = self.k_factors[org_type].get(facility_type, 
                      self.k_factors[org_type]['default'])

            # Apply lab-specific adjustments for DOE
            if org_type == 'DOE' and lab in self.doe_labs:
                k_factor *= self.doe_labs[lab]['factor_adjustment']

            # Convert units if needed
            if unit == 'kg':
                NEW = NEW * self.unit_conversions['kg_to_lbs']
            elif unit == 'g':
                NEW = NEW * self.unit_conversions['g_to_lbs']
                
            # Calculate using cube root formula
            return k_factor * math.pow(NEW, 1/3)
        except Exception as e:
            self.error_recovery.handle_calculation_error(e)
            return 0.0

    async def analyze_pes_to_es(self, pes_id: int, org_type: str) -> Dict:
        """Analyze PES to ES relationships with organization-specific rules"""
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

                    exposed_sites.append({
                        "facility_id": row.id,
                        "facility_number": row.facility_number,
                        "distance": row.distance,
                        "required_distance": distance,
                        "compliant": row.distance >= distance,
                        "location": row.location
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