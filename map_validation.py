
from typing import Dict, Any
import re
import json

class MapDataValidator:
    def __init__(self):
        self.coordinate_pattern = re.compile(r'^-?\d+\.?\d*$')
        
    def validate_coordinates(self, lat: float, lon: float) -> bool:
        return -90 <= lat <= 90 and -180 <= lon <= 180
        
    def sanitize_geojson(self, data: Dict[str, Any]) -> Dict[str, Any]:
        if not isinstance(data, dict):
            raise ValueError("Invalid GeoJSON format")
            
        allowed_types = ["Feature", "FeatureCollection", "Point", "LineString", "Polygon"]
        if data.get("type") not in allowed_types:
            raise ValueError("Invalid GeoJSON type")
            
        return data
        
    def validate_mgrs_grid(self, grid_reference: str) -> bool:
        pattern = r'^\d{1,2}[A-Z]{3}\d{10}$'
        return bool(re.match(pattern, grid_reference))
def validate_explosive_weight(self, weight: float, org_type: str) -> bool:
        if weight <= 0:
            return False
        
        max_weights = {
            'DOD': 500000,
            'DOE': 100000,
            'AIR_FORCE': 500000
        }
        
        return weight <= max_weights.get(org_type, 500000)
