
from typing import List, Tuple
from shapely.geometry import Point, Polygon

class GeofenceSecurity:
    def __init__(self):
        self.restricted_areas: List[Polygon] = []
        
    def add_restricted_area(self, coordinates: List[Tuple[float, float]]):
        self.restricted_areas.append(Polygon(coordinates))
        
    def is_point_restricted(self, lat: float, lon: float) -> bool:
        point = Point(lon, lat)
        return any(area.contains(point) for area in self.restricted_areas)
        
    def validate_view_permission(self, user_clearance: str, area: Polygon) -> bool:
        return user_clearance in ["SECRET", "TOP_SECRET"]
