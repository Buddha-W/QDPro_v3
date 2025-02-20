
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
def validate_explosive_weight(self, weight: float, org_type: str, facility_type: str = None) -> bool:
        if weight <= 0:
            return False
        
        max_weights = {
            'DOD': 500000,
            'DOE': 100000,
            'AIR_FORCE': {
                'default': 500000,
                'flight_line': 300000,
                'maintenance': 100000,
                'storage': 500000
            },
            'NATO': {
                'default': 500000,
                'storage': 450000,
                'process': 250000
            }
        }
        
        if org_type in ['AIR_FORCE', 'NATO']:
            org_limits = max_weights.get(org_type, {})
            limit = org_limits.get(facility_type, org_limits.get('default', 500000))
            return weight <= limit
            
        return weight <= max_weights.get(org_type, 500000)

    def validate_nato_storage(self, quantity: float, storage_type: str) -> bool:
        """Validate NATO storage requirements per AASTP-1"""
        nato_limits = {
            'standard': 500000,
            'reduced_quantity': 250000,
            'basic': 100000
        }
        return quantity <= nato_limits.get(storage_type, nato_limits['standard'])
