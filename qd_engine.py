import numpy as np
import math
from typing import List, Dict, Tuple, Optional, Literal
from dataclasses import dataclass
from enum import Enum

@dataclass
class MaterialProperties:
    sensitivity: float
    det_velocity: float
    tnt_equiv: float

@dataclass
class EnvironmentalConditions:
    temperature: float
    pressure: float
    humidity: float
    confinement_factor: float

class SiteType(str, Enum):
    DOD = "DOD"
    DOE = "DOE"

@dataclass
class QDParameters:
    quantity: float
    site_type: SiteType = SiteType.DOD
    material_type: str = "default"
    location: Optional[Dict[str, float]] = None
    material_props: Optional[MaterialProperties] = None
    env_conditions: Optional[EnvironmentalConditions] = None

    def validate(self):
        if self.quantity <= 0:
            raise ValueError("Quantity must be positive")
        if self.site_type not in ["DOD", "DOE"]:
            raise ValueError("Invalid site type")


def get_engine(site_type: str = "DOD") -> 'QDEngine':
    """Create and return a QDEngine instance based on site type."""
    scaling_constants = {
        "DOD": 40.0,  # Default K-factor for DoD
        "DOE": 50.0   # Default K-factor for DoE
    }
    return QDEngine(scaling_constant=scaling_constants.get(site_type, 40.0))

class QDEngine:
    def __init__(self, scaling_constant: float):
        self.D = scaling_constant
        self.calibration_factor = 1.0
        self.uncertainty_margin = 0.1
        self.confidence_level = 0.95
        self.K_FACTOR = 40 #Added from edited code

    def monte_carlo_analysis(self, quantity: float, material_props: MaterialProperties,
                           env_conditions: EnvironmentalConditions,
                           iterations: int = 1000) -> Dict[str, float]:
        """Perform Monte Carlo simulation for uncertainty analysis."""
        # Generate variations around nominal values
        quantities = np.random.normal(quantity, quantity * self.uncertainty_margin, iterations)
        sensitivities = np.random.normal(material_props.sensitivity, 
                                       material_props.sensitivity * 0.05, iterations)
        temperatures = np.random.normal(env_conditions.temperature, 2.0, iterations)

        # Calculate distances for each variation
        distances = []
        for i in range(iterations):
            modified_quantity = max(0, quantities[i])
            temp_factor = 1.0 + 0.002 * (temperatures[i] - 298)  # Temperature correction
            base_distance = self.D * math.pow(modified_quantity, 1/3)
            adjusted_distance = base_distance * temp_factor * sensitivities[i]
            distances.append(adjusted_distance)

        distances = np.array(distances)
        mean_distance = np.mean(distances)
        std_distance = np.std(distances)
        confidence_interval = np.percentile(distances, [2.5, 97.5])

        return {
            "mean_distance": float(mean_distance),
            "std_deviation": float(std_distance),
            "confidence_interval": confidence_interval.tolist(),
            "iterations": iterations
        }

    def calculate_safe_distance(self, quantity: float, material_props: MaterialProperties = None,
                              env_conditions: EnvironmentalConditions = None) -> float:
        """Calculate deterministic safe distance with environmental corrections."""
        if material_props is None:
            material_props = MaterialProperties(sensitivity=1.0, det_velocity=6000, tnt_equiv=1.0)
        if env_conditions is None:
            env_conditions = EnvironmentalConditions(temperature=298, pressure=101.325, humidity=50, confinement_factor=0.0)

        temp_factor = 1.0 + 0.002 * (env_conditions.temperature - 298)
        humidity_factor = 1.0 + 0.001 * (env_conditions.humidity - 50)
        base_distance = self.D * math.pow(quantity, 1/3)
        distance = base_distance * temp_factor * humidity_factor * material_props.sensitivity

        return round(distance, 2)

    def generate_k_factor_rings(self, center: List[float], safe_distance: float,
                              uncertainty: Optional[float] = None,
                              k_factors: List[float] = [1.0, 1.5, 2.0]) -> List[Dict]:
        features = []
        for k in k_factors:
            radius = safe_distance * k
            features.append(self._create_circle_feature(center, radius, k))
            if uncertainty:
                # Add uncertainty bands
                features.append(self._create_circle_feature(center, radius * (1 - uncertainty), k))
                features.append(self._create_circle_feature(center, radius * (1 + uncertainty), k))
        return features

    def _create_circle_feature(self, center: List[float], radius: float, k_factor: float,
                             num_points: int = 32) -> Dict:
        coords = []
        for i in range(num_points):
            angle = (i / num_points) * 2 * math.pi
            dx = radius * math.cos(angle)
            dy = radius * math.sin(angle)
            coords.append([center[0] + dx, center[1] + dy])
        coords.append(coords[0])

        return {
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": [coords]
            },
            "properties": {
                "k_factor": k_factor,
                "radius": radius,
                "description": f"K{k_factor} Safety Ring"
            }
        }

    def calculate_arc_radius(self, net_explosive_weight: float) -> float:
        """Calculate the radius for QD arc based on NEW"""
        return self.K_FACTOR * math.pow(net_explosive_weight, 1/3)

    def analyze_facility(self, facility: Dict, surrounding_features: List[Dict]) -> Dict:
        """Analyze a facility against surrounding features"""
        results = {
            "violations": [],
            "safe_distance": self.calculate_arc_radius(facility.get("new", 0)),
            "facility_id": facility.get("id")
        }

        for feature in surrounding_features:
            distance = self.calculate_distance(
                facility["geometry"]["coordinates"],
                feature["geometry"]["coordinates"]
            )
            if distance < results["safe_distance"]:
                results["violations"].append({
                    "feature_id": feature.get("id"),
                    "distance": distance,
                    "required": results["safe_distance"]
                })

        return results

    def calculate_distance(self, point1: Tuple[float, float], point2: Tuple[float, float]) -> float:
        """Calculate distance between two points"""
        return math.sqrt(
            math.pow(point2[0] - point1[0], 2) + 
            math.pow(point2[1] - point1[1], 2)
        )
from typing import List, Dict, Any, Optional, Tuple
import math
import json
import logging
from datetime import datetime

class MaterialProperties:
    def __init__(self, sensitivity: float = 1.0, det_velocity: float = 6000, tnt_equiv: float = 1.0):
        self.sensitivity = sensitivity
        self.det_velocity = det_velocity  # m/s
        self.tnt_equiv = tnt_equiv

class EnvironmentalConditions:
    def __init__(self, temperature: float = 298, pressure: float = 101.325, 
                 humidity: float = 50, confinement_factor: float = 0.0):
        self.temperature = temperature  # K
        self.pressure = pressure  # kPa
        self.humidity = humidity  # %
        self.confinement_factor = confinement_factor  # 0-1 scale

class QDParameters:
    def __init__(self, site_type: str, material_props: MaterialProperties, env_conditions: EnvironmentalConditions):
        self.site_type = site_type
        self.material_props = material_props
        self.env_conditions = env_conditions

class QDEngine:
    def __init__(self, site_type: str):
        self.site_type = site_type
        self.logger = logging.getLogger(__name__)
        
    def calculate_safe_distance(self, quantity: float, material_props: MaterialProperties, 
                                env_conditions: EnvironmentalConditions) -> float:
        """
        Calculate safe distance based on quantity of explosives
        
        Args:
            quantity: Weight in pounds
            material_props: Material properties 
            env_conditions: Environmental conditions
            
        Returns:
            Safe distance in feet
        """
        # Basic calculation based on site type
        if self.site_type == "DOD":
            # DoD formula: D = K * W^(1/3)
            k_factor = 40  # Standard K-factor for DoD
            return k_factor * math.pow(quantity * material_props.tnt_equiv, 1/3)
        elif self.site_type == "ATF":
            # ATF formula (slightly different)
            return 50 * math.pow(quantity * material_props.tnt_equiv, 1/3)
        elif self.site_type == "OSHA":
            # OSHA formula
            return 35 * math.pow(quantity * material_props.tnt_equiv, 1/3)
        else:
            # Default formula
            return 40 * math.pow(quantity * material_props.tnt_equiv, 1/3)
    
    def calculate_k_factor(self, distance: float, quantity: float) -> float:
        """Calculate K-factor from distance and quantity"""
        return distance / math.pow(quantity, 1/3)
    
    def calculate_distance(self, point1: List[float], point2: List[float]) -> float:
        """
        Calculate the distance between two points (in meters)
        
        Args:
            point1: [longitude, latitude]
            point2: [longitude, latitude]
        """
        # Convert to radians
        lon1, lat1 = math.radians(point1[0]), math.radians(point1[1])
        lon2, lat2 = math.radians(point2[0]), math.radians(point2[1])
        
        # Haversine formula
        dlon = lon2 - lon1
        dlat = lat2 - lat1
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        r = 6371000  # Earth radius in meters
        
        # Convert to feet (1m = 3.28084ft)
        return c * r * 3.28084
    
    def generate_k_factor_rings(self, center: List[float], safe_distance: float) -> List[Dict[str, Any]]:
        """
        Generate GeoJSON features for K-factor rings
        
        Args:
            center: [longitude, latitude]
            safe_distance: Safe distance in feet
            
        Returns:
            List of GeoJSON features
        """
        buffer_features = []
        
        # Generate circles at 0.5, 1.0, and 1.5 times the safe distance
        factors = [0.5, 1.0, 1.5]
        colors = ["green", "yellow", "red"]
        
        for i, factor in enumerate(factors):
            distance = safe_distance * factor
            buffer = self._create_circle_feature(
                center=center,
                radius=distance,
                properties={
                    "distance": distance,
                    "factor": factor,
                    "color": colors[i],
                    "description": f"{int(factor*100)}% of safe distance ({int(distance)} ft)"
                }
            )
            buffer_features.append(buffer)
            
        return buffer_features
    
    def _create_circle_feature(self, center: List[float], radius: float, properties: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a GeoJSON circle feature
        
        Args:
            center: [longitude, latitude]
            radius: Radius in feet
            properties: Feature properties
            
        Returns:
            GeoJSON feature
        """
        # Convert radius from feet to degrees (approximate)
        # 1 degree latitude = ~364,000 feet
        # 1 degree longitude = ~288,200 feet * cos(latitude)
        lat_degrees = radius / 364000
        lon_degrees = radius / (288200 * math.cos(math.radians(center[1])))
        
        # Create circle polygon with 64 points
        coords = []
        for i in range(65):  # 64 points + closing point
            angle = 2 * math.pi * i / 64
            x = center[0] + lon_degrees * math.cos(angle)
            y = center[1] + lat_degrees * math.sin(angle)
            coords.append([x, y])
            
        return {
            "type": "Feature",
            "properties": properties,
            "geometry": {
                "type": "Polygon",
                "coordinates": [coords]
            }
        }

def get_engine(site_type: str = "DOD") -> QDEngine:
    """Factory function to get a QD engine instance"""
    return QDEngine(site_type)
