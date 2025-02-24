import math
from typing import Dict, List, Optional
from dataclasses import dataclass
from fastapi import BackgroundTasks
import json
import numpy as np

@dataclass
class QDParameters:
    quantity: float
    site_type: str  # 'DoD' or 'DoE'
    material_type: str
    environmental_conditions: Dict = None

@dataclass
class QDResult:
    safe_distance: float
    k_factor: float
    psi_at_distance: Dict[float, float]
    geojson: Dict

class BaseQDEngine:
    def __init__(self):
        self.cache = {}

    def _generate_safe_ring_geojson(self, center: List[float], radius: float) -> Dict:
        # Generate GeoJSON circle with 64 points
        coords = []
        for i in range(64):
            angle = (i / 64.0) * 2 * math.pi
            dx = radius * math.cos(angle)
            dy = radius * math.sin(angle)
            coords.append([center[0] + dx, center[1] + dy])
        coords.append(coords[0])  # Close the ring

        return {
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": [coords]
            },
            "properties": {
                "distance": radius,
                "description": f"Safe distance ring ({radius:.1f} meters)"
            }
        }

class DoDQDEngine(BaseQDEngine):
    def __init__(self):
        super().__init__()
        self.k_factor = 40  # Example K factor for DoD

    async def calculate_safe_distance(self, params: QDParameters, location: List[float]) -> QDResult:
        quantity = params.quantity
        # Basic cube root scaling law
        safe_distance = self.k_factor * math.pow(quantity, 1/3)

        # TODO: Add Monte Carlo simulation for uncertainty
        # TODO: Implement caching with background task processing

        # Calculate PSI at various distances
        psi_values = {
            safe_distance * 0.5: 8.0,  # Example PSI values
            safe_distance: 4.0,
            safe_distance * 1.5: 2.0
        }

        geojson = self._generate_safe_ring_geojson(location, safe_distance)

        return QDResult(
            safe_distance=safe_distance,
            k_factor=self.k_factor,
            psi_at_distance=psi_values,
            geojson=geojson
        )

class DoEQDEngine(BaseQDEngine):
    def __init__(self):
        super().__init__()
        self.k_factor = 50  # Higher K factor for DoE sites

    async def calculate_safe_distance(self, params: QDParameters, location: List[float]) -> QDResult:
        quantity = params.quantity
        # Enhanced scaling law with environmental factor
        env_factor = 1.1  # Example environmental correction
        safe_distance = self.k_factor * math.pow(quantity, 1/3) * env_factor

        # TODO: Implement ML-based prediction model
        # TODO: Add sensitivity analysis

        psi_values = {
            safe_distance * 0.5: 10.0,
            safe_distance: 5.0,
            safe_distance * 1.5: 2.5
        }

        geojson = self._generate_safe_ring_geojson(location, safe_distance)

        return QDResult(
            safe_distance=safe_distance,
            k_factor=self.k_factor,
            psi_at_distance=psi_values,
            geojson=geojson
        )

def get_engine(site_type: str) -> BaseQDEngine:
    if site_type.upper() == "DOD":
        return DoDQDEngine()
    elif site_type.upper() == "DOE":
        return DoEQDEngine()
    raise ValueError("Invalid site type")