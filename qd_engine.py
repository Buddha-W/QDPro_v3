import math
from typing import List, Dict, Optional
from dataclasses import dataclass

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

@dataclass
class QDParameters:
    quantity: float  # Net explosive weight
    hazard_class: str  # Explosive hazard classification
    site_type: str  # "DOD" or "DOE"
    material_type: str  # Description of explosive material

class QDEngine:
    def __init__(self, scaling_constant: float):
        self.D = scaling_constant  # Scaling constant (D)

    def calculate_safe_distance(self, quantity: float) -> float:
        """Calculate safe separation distance using cube root scaling law."""
        return self.D * math.pow(quantity, 1/3)

    def generate_k_factor_rings(self, center: List[float], safe_distance: float, 
                              k_factors: List[float] = [1.0, 1.5, 2.0]) -> List[Dict]:
        """Generate GeoJSON features for K-factor safety rings."""
        features = []
        for k in k_factors:
            radius = safe_distance * k
            features.append(self._create_circle_feature(center, radius, k))
        return features

    def _create_circle_feature(self, center: List[float], radius: float, k_factor: float,
                             num_points: int = 32) -> Dict:
        """Create a GeoJSON feature approximating a circle."""
        coords = []
        for i in range(num_points):
            angle = (i / num_points) * 2 * math.pi
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
                "k_factor": k_factor,
                "radius": radius,
                "description": f"K{k_factor} Safety Ring"
            }
        }

def get_engine(site_type: str = "DOD") -> QDEngine:
    """Factory function to create appropriate QD engine."""
    if site_type.upper() == "DOD":
        return QDEngine(scaling_constant=10)
    elif site_type.upper() == "DOE":
        return QDEngine(scaling_constant=12)
    raise ValueError(f"Unsupported site type: {site_type}")

if __name__ == "__main__":
    # Example usage
    params = QDParameters(
        quantity=1000,  # 1000 lbs NEW
        hazard_class="A",
        site_type="DOD",
        material_type="General Explosive"
    )

    # Get appropriate engine and calculate safe distance
    engine = get_engine(params.site_type)
    safe_distance = engine.calculate_safe_distance(params.quantity)
    print(f"Safe distance for {params.quantity} lbs NEW: {safe_distance:.2f} feet")

    # Generate safety rings
    center = [-98.5795, 39.8283]  # Example location (lon, lat)
    rings = engine.generate_k_factor_rings(center, safe_distance)

    # Create GeoJSON FeatureCollection
    feature_collection = {
        "type": "FeatureCollection",
        "features": rings
    }

    import json
    print("\nGeoJSON Safety Rings:")
    print(json.dumps(feature_collection, indent=2))