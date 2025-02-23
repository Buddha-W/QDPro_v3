
from typing import Dict, List, Tuple
from dataclasses import dataclass
import math
from shapely.geometry import Point, Polygon
from shapely.ops import transform
import numpy as np
from typing import Optional

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

class QDEngine:
    """Quantity-Distance calculation engine"""
    
    def __init__(self):
        # Standard K-factors for different protection levels
        self.k_factors = {
            "K6": 6,    # Public Traffic Route Distance
            "K11": 11,  # Inhabited Building Distance
            "K18": 18,  # Intermagazine Distance
            "K40": 40   # Default separation distance
        }
        
    def calculate_esqd(self, 
                      quantity: float,
                      material_props: MaterialProperties,
                      env_conditions: Optional[EnvironmentalConditions] = None,
                      k_factor: float = 40) -> float:
        """
        Calculate Explosive Safety Quantity-Distance (ESQD)
        
        Args:
            quantity: NEW (Net Explosive Weight) in pounds
            material_props: Material properties
            env_conditions: Environmental conditions
            k_factor: K-factor for distance calculation
            
        Returns:
            Safe distance in feet
        """
        # Base calculation using cube root scaling law
        base_distance = k_factor * (quantity * material_props.tnt_equiv) ** (1/3)
        
        if env_conditions:
            # Apply environmental corrections
            temp_factor = (env_conditions.temperature / 298) ** 0.5
            pressure_factor = (env_conditions.pressure / 101.325) ** 0.5
            humidity_factor = 1 - (env_conditions.humidity / 200)  # Simplified humidity effect
            
            # Apply confinement factor
            confinement_factor = 1 + env_conditions.confinement_factor
            
            # Combine all factors
            correction_factor = (temp_factor * pressure_factor * 
                               humidity_factor * confinement_factor)
            
            base_distance *= correction_factor
        
        # Apply material sensitivity factor
        base_distance *= (1 + material_props.sensitivity)
        
        return base_distance

    def generate_k_factor_rings(self, 
                              center_lat: float, 
                              center_lon: float,
                              safe_distance: float,
                              num_rings: int = 4) -> List[Dict]:
        """
        Generate K-factor rings as GeoJSON features
        
        Args:
            center_lat: Latitude of PES
            center_lon: Longitude of PES
            safe_distance: Maximum safe distance (feet)
            num_rings: Number of concentric rings to generate
            
        Returns:
            List of GeoJSON features representing the rings
        """
        rings = []
        center = Point(center_lon, center_lat)
        
        # Convert feet to degrees (approximate)
        ft_to_deg = 1/364000  # Rough conversion factor
        
        for i in range(num_rings):
            ring_distance = safe_distance * (i + 1) / num_rings
            ring_radius_deg = ring_distance * ft_to_deg
            
            # Generate circle points
            circle_points = []
            for angle in range(0, 361, 10):  # 36 points for smooth circle
                rad = math.radians(angle)
                x = center_lon + ring_radius_deg * math.cos(rad)
                y = center_lat + ring_radius_deg * math.sin(rad)
                circle_points.append((x, y))
            
            # Close the ring
            circle_points.append(circle_points[0])
            
            # Create GeoJSON feature
            ring_feature = {
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [circle_points]
                },
                "properties": {
                    "distance": ring_distance,
                    "k_factor": (i + 1) * safe_distance / (num_rings * safe_distance) * 40
                }
            }
            rings.append(ring_feature)
        
        return rings

