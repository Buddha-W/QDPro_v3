
from enum import Enum
from typing import Dict, Optional

class MapProvider(Enum):
    OSM = "openstreetmap"
    USGS = "usgs"
    NGA = "nga"
    DOD = "dod"

class MapProviderService:
    @staticmethod
    def get_tile_url(provider: MapProvider) -> str:
        urls = {
            MapProvider.OSM: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            MapProvider.USGS: 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}',
            MapProvider.NGA: 'https://gis.nga.mil/arcgis/rest/services/DOD_NGA/MapServer/tile/{z}/{y}/{x}',
            MapProvider.DOD: 'https://tiles.arcgis.com/tiles/Federal_DOD/arcgis/rest/services/MapServer/tile/{z}/{y}/{x}'
        }
        return urls.get(provider, urls[MapProvider.OSM])

    @staticmethod
    def get_attribution(provider: MapProvider) -> str:
        attributions = {
            MapProvider.OSM: '© OpenStreetMap contributors',
            MapProvider.USGS: '© USGS National Map',
            MapProvider.NGA: '© National Geospatial-Intelligence Agency',
            MapProvider.DOD: '© Department of Defense'
        }
        return attributions.get(provider, attributions[MapProvider.OSM])
