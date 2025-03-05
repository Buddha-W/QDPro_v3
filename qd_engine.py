
import math
from typing import Dict, List, Any, Tuple, Optional
import json
import logging

logger = logging.getLogger(__name__)

class MaterialProperties:
    def __init__(self, sensitivity: float = 1.0, det_velocity: float = 6000, tnt_equiv: float = 1.0):
        """
        Material properties for explosive calculations
        
        Args:
            sensitivity: Material sensitivity factor (0.0-1.0)
            det_velocity: Detonation velocity in m/s
            tnt_equiv: TNT equivalence factor
        """
        self.sensitivity = min(max(sensitivity, 0.0), 1.0)
        self.det_velocity = det_velocity
        self.tnt_equiv = tnt_equiv
    
    def to_dict(self) -> Dict:
        return {
            "sensitivity": self.sensitivity,
            "det_velocity": self.det_velocity,
            "tnt_equiv": self.tnt_equiv
        }

class EnvironmentalConditions:
    def __init__(self, temperature: float = 298, pressure: float = 101.325, 
                 humidity: float = 50, confinement_factor: float = 0.0):
        """
        Environmental conditions for explosive calculations
        
        Args:
            temperature: Temperature in Kelvin
            pressure: Atmospheric pressure in kPa
            humidity: Relative humidity (%)
            confinement_factor: Degree of confinement (0.0-1.0)
        """
        self.temperature = temperature
        self.pressure = pressure
        self.humidity = humidity
        self.confinement_factor = min(max(confinement_factor, 0.0), 1.0)
    
    def to_dict(self) -> Dict:
        return {
            "temperature": self.temperature,
            "pressure": self.pressure,
            "humidity": self.humidity,
            "confinement_factor": self.confinement_factor
        }

class QDParameters:
    def __init__(self, quantity: float, k_factor: float = 40):
        """
        QD calculation parameters
        
        Args:
            quantity: Net explosive weight in pounds
            k_factor: K-factor for distance calculation
        """
        self.quantity = max(quantity, 0.1)  # Minimum threshold to avoid division by zero
        self.k_factor = k_factor
    
    def to_dict(self) -> Dict:
        return {
            "quantity": self.quantity,
            "k_factor": self.k_factor
        }

class QDEngine:
    """Quantity Distance calculation engine"""
    
    def __init__(self, site_type: str = "DOD"):
        self.site_type = site_type
        # Different site types may have different calculation methods
        self.calculation_methods = {
            "DOD": self._calculate_dod_distance,
            "ATF": self._calculate_atf_distance,
            "OSHA": self._calculate_osha_distance,
            "NFPA": self._calculate_nfpa_distance
        }
    
    def calculate_safe_distance(self, quantity: float, 
                              material_props: Optional[MaterialProperties] = None,
                              env_conditions: Optional[EnvironmentalConditions] = None,
                              k_factor: float = 40) -> float:
        """
        Calculate the safe distance for a given quantity of explosives
        
        Args:
            quantity: Net explosive weight in pounds
            material_props: Material properties
            env_conditions: Environmental conditions
            k_factor: K-factor for distance calculation
            
        Returns:
            Safe distance in feet
        """
        if material_props is None:
            material_props = MaterialProperties()
        
        if env_conditions is None:
            env_conditions = EnvironmentalConditions()
        
        # Use the appropriate calculation method based on site type
        calculation_method = self.calculation_methods.get(
            self.site_type, self._calculate_dod_distance)
        
        return calculation_method(quantity, material_props, env_conditions, k_factor)
    
    def _calculate_dod_distance(self, quantity: float, 
                              material_props: MaterialProperties,
                              env_conditions: EnvironmentalConditions,
                              k_factor: float) -> float:
        """
        Calculate safe distance using DoD 6055.09-M formula
        D = K * W^(1/3)
        
        Args:
            quantity: Net explosive weight in pounds
            material_props: Material properties
            env_conditions: Environmental conditions
            k_factor: K-factor for distance calculation
            
        Returns:
            Safe distance in feet
        """
        # Adjust quantity by TNT equivalence
        adjusted_quantity = quantity * material_props.tnt_equiv
        
        # Apply temperature and pressure corrections
        temp_factor = (env_conditions.temperature / 298) ** 0.5
        pressure_factor = (101.325 / env_conditions.pressure) ** 0.5
        
        # Apply confinement factor (increases effective yield)
        confinement_modifier = 1.0 + (0.4 * env_conditions.confinement_factor)
        
        # Calculate basic distance
        base_distance = k_factor * (adjusted_quantity ** (1/3))
        
        # Apply environmental and material modifiers
        safe_distance = base_distance * temp_factor * pressure_factor * confinement_modifier
        
        return round(safe_distance, 2)
    
    def _calculate_atf_distance(self, quantity: float,
                              material_props: MaterialProperties,
                              env_conditions: EnvironmentalConditions,
                              k_factor: float) -> float:
        """ATF calculation - similar to DoD but with different constants"""
        # ATF uses a slightly different formula with modified constants
        base_distance = self._calculate_dod_distance(quantity, material_props, env_conditions, k_factor)
        atf_factor = 1.1  # ATF typically more conservative
        return round(base_distance * atf_factor, 2)
    
    def _calculate_osha_distance(self, quantity: float,
                              material_props: MaterialProperties,
                              env_conditions: EnvironmentalConditions,
                              k_factor: float) -> float:
        """OSHA calculation method"""
        # OSHA also uses a cube root formula but with different K factors
        osha_k_factor = k_factor * 1.2  # More conservative
        base_distance = osha_k_factor * (quantity * material_props.tnt_equiv) ** (1/3)
        return round(base_distance, 2)
    
    def _calculate_nfpa_distance(self, quantity: float,
                              material_props: MaterialProperties,
                              env_conditions: EnvironmentalConditions,
                              k_factor: float) -> float:
        """NFPA 495 calculation method"""
        # NFPA distance is similar to DoD with some factor adjustments
        base_distance = self._calculate_dod_distance(quantity, material_props, env_conditions, k_factor)
        nfpa_factor = 1.05  # Slight increase
        return round(base_distance * nfpa_factor, 2)
    
    def calculate_distance(self, point1: List[float], point2: List[float]) -> float:
        """
        Calculate distance between two points using the Haversine formula
        
        Args:
            point1: [lon, lat] coordinates of first point
            point2: [lon, lat] coordinates of second point
            
        Returns:
            Distance in feet
        """
        # Convert points from [lon, lat] to [lat, lon] for calculation
        lat1, lon1 = point1[1], point1[0]
        lat2, lon2 = point2[1], point2[0]
        
        # Convert to radians
        lat1_rad = math.radians(lat1)
        lon1_rad = math.radians(lon1)
        lat2_rad = math.radians(lat2)
        lon2_rad = math.radians(lon2)
        
        # Haversine formula
        dlon = lon2_rad - lon1_rad
        dlat = lat2_rad - lat1_rad
        a = math.sin(dlat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        
        # Earth radius in feet (3958.8 miles * 5280 feet/mile)
        earth_radius = 3958.8 * 5280
        
        # Distance in feet
        distance = earth_radius * c
        
        return distance
    
    def generate_k_factor_rings(self, center: List[float], safe_distance: float) -> List[Dict]:
        """
        Generate GeoJSON features for K-factor rings
        
        Args:
            center: [lon, lat] coordinates of center point
            safe_distance: Safe distance in feet
            
        Returns:
            List of GeoJSON features
        """
        # Create buffer rings at different percentages
        buffer_percentages = [0.5, 0.75, 1.0, 1.25, 1.5]
        buffer_features = []
        
        for percentage in buffer_percentages:
            radius = safe_distance * percentage
            ring_color = self._get_ring_color(percentage)
            
            # Create circle feature
            circle_points = self._generate_circle_points(center, radius)
            
            buffer_features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [circle_points]
                },
                "properties": {
                    "distance": round(radius, 2),
                    "percentage": percentage * 100,
                    "color": ring_color,
                    "fillColor": ring_color,
                    "fillOpacity": 0.2,
                    "weight": 2
                }
            })
        
        # Add center point
        buffer_features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": center
            },
            "properties": {
                "distance": 0,
                "color": "#ff0000",
                "radius": 6
            }
        })
        
        return buffer_features
    
    def _get_ring_color(self, percentage: float) -> str:
        """Get color for QD ring based on percentage of safe distance"""
        if percentage <= 0.5:
            return "#00ff00"  # Green - safest
        elif percentage <= 0.75:
            return "#a0db8e"  # Light green
        elif percentage <= 1.0:
            return "#ffff00"  # Yellow - at threshold
        elif percentage <= 1.25:
            return "#ffa500"  # Orange - dangerous
        else:
            return "#ff0000"  # Red - most dangerous
    
    def _generate_circle_points(self, center: List[float], radius_feet: float) -> List[List[float]]:
        """
        Generate points for a circle on the Earth's surface
        
        Args:
            center: [lon, lat] coordinates of center
            radius_feet: Radius in feet
            
        Returns:
            List of [lon, lat] coordinates forming a circle
        """
        # Convert radius from feet to degrees (approximate)
        # 1 degree of latitude is approximately 364,000 feet
        radius_deg = radius_feet / 364000
        
        # Generate points
        points = []
        num_points = 64  # Number of points in the circle
        
        for i in range(num_points):
            angle = (i / num_points) * 2 * math.pi
            dx = math.cos(angle) * radius_deg
            dy = math.sin(angle) * radius_deg
            
            # Adjust for longitude coordinates getting closer together as latitude increases
            lat = center[1] + dy
            lon = center[0] + dx / math.cos(math.radians(center[1]))
            
            points.append([lon, lat])
        
        # Close the loop
        points.append(points[0])
        
        return points

def get_engine(site_type: str = "DOD") -> QDEngine:
    """Factory function to get QD engine instance"""
    return QDEngine(site_type)
