
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
import math
from shapely.geometry import Point, Polygon
from shapely.ops import transform
import numpy as np
from abc import ABC, abstractmethod

@dataclass
class MaterialProperties:
    """Properties of explosive material"""
    sensitivity: float  # Material sensitivity factor (0-1)
    det_velocity: float  # Detonation velocity (m/s)
    tnt_equiv: float  # TNT equivalence factor

@dataclass
class EnvironmentalConditions:
    """Environmental conditions affecting QD"""
    temperature: float  # Ambient temperature (K)
    pressure: float  # Atmospheric pressure (kPa)
    humidity: float  # Relative humidity (%)
    confinement_factor: float  # Degree of confinement (0-1)

class QDEngineBase(ABC):
    """Base class for QD calculation engines"""
    
    def __init__(self):
        self.k_factors = self._init_k_factors()
        
    @abstractmethod
    def _init_k_factors(self) -> Dict[str, float]:
        """Initialize K-factors specific to engine type"""
        pass
        
    def calculate_base_distance(self, quantity: float, k_factor: float) -> float:
        """Basic cube root scaling law"""
        return k_factor * (quantity) ** (1/3)
    
    def apply_environmental_corrections(self, 
                                     base_distance: float,
                                     env_conditions: EnvironmentalConditions) -> float:
        """Apply environmental correction factors"""
        temp_factor = (env_conditions.temperature / 298) ** 0.5
        pressure_factor = (env_conditions.pressure / 101.325) ** 0.5
        humidity_factor = 1 - (env_conditions.humidity / 200)
        confinement_factor = 1 + env_conditions.confinement_factor
        
        return base_distance * temp_factor * pressure_factor * humidity_factor * confinement_factor
    
    def generate_k_factor_rings(self, 
                              center_lat: float,
                              center_lon: float,
                              safe_distance: float,
                              num_rings: int = 4) -> List[Dict]:
        """Generate concentric buffer rings"""
        rings = []
        center = Point(center_lon, center_lat)
        ft_to_deg = 1/364000
        
        for i in range(num_rings):
            ring_distance = safe_distance * (i + 1) / num_rings
            ring_radius_deg = ring_distance * ft_to_deg
            
            circle_points = []
            for angle in range(0, 361, 10):
                rad = math.radians(angle)
                x = center_lon + ring_radius_deg * math.cos(rad)
                y = center_lat + ring_radius_deg * math.sin(rad)
                circle_points.append((x, y))
            
            circle_points.append(circle_points[0])
            
            ring_feature = {
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [circle_points]
                },
                "properties": {
                    "distance": ring_distance,
                    "k_factor": self.k_factors["default"] * (i + 1) / num_rings
                }
            }
            rings.append(ring_feature)
        
        return rings

class DoDQDEngine(QDEngineBase):
    """DoD-specific QD calculation engine"""
    
    def _init_k_factors(self) -> Dict[str, float]:
        return {
            "default": 40,  # Default K40
            "K6": 6,       # Public Traffic Route Distance
            "K11": 11,     # Inhabited Building Distance
            "K18": 18,     # Intermagazine Distance
            "K40": 40      # Default separation distance
        }
    
    def calculate_esqd(self,
                      quantity: float,
                      material_props: MaterialProperties,
                      env_conditions: Optional[EnvironmentalConditions] = None,
                      k_factor: float = 40) -> float:
        """Calculate DoD ESQD"""
        base_distance = self.calculate_base_distance(
            quantity * material_props.tnt_equiv, 
            k_factor
        )
        
        if env_conditions:
            base_distance = self.apply_environmental_corrections(
                base_distance, 
                env_conditions
            )
        
        # DoD-specific material sensitivity adjustment
        sensitivity_factor = 1 + (material_props.sensitivity * 0.5)
        base_distance *= sensitivity_factor
        
        return base_distance

class DoEQDEngine(QDEngineBase):
    """DoE-specific QD calculation engine"""
    
    def _init_k_factors(self) -> Dict[str, float]:
        return {
            "default": 50,  # Higher default K-factor for DoE
            "K9": 9,       # Limited access area
            "K14": 14,     # Administrative area
            "K25": 25,     # Controlled area
            "K50": 50      # General public area
        }
    
    def calculate_esqd(self,
                      quantity: float,
                      material_props: MaterialProperties,
                      env_conditions: Optional[EnvironmentalConditions] = None,
                      k_factor: float = 50) -> float:
        """Calculate DoE ESQD with enhanced safety margins"""
        base_distance = self.calculate_base_distance(
            quantity * material_props.tnt_equiv * 1.2,  # 20% safety margin
            k_factor
        )
        
        if env_conditions:
            base_distance = self.apply_environmental_corrections(
                base_distance,
                env_conditions
            )
        
        # DoE-specific material sensitivity adjustment
        sensitivity_factor = 1 + (material_props.sensitivity * 0.8)  # Higher sensitivity impact
        base_distance *= sensitivity_factor
        
        return base_distance

def create_qd_engine(site_type: str) -> QDEngineBase:
    """Factory function to create appropriate QD engine"""
    if site_type.upper() == "DOD":
        return DoDQDEngine()
    elif site_type.upper() == "DOE":
        return DoEQDEngine()
    else:
        raise ValueError(f"Unknown site type: {site_type}")
