
from enum import Enum
from typing import Dict, Optional
from secure_config import SecureConfigManager

class MapProvider(Enum):
    OSM = "openstreetmap"
    USGS = "usgs"
    NGA = "nga"
    DOD = "dod"
    ESRI = "esri"
    DIGITAL_GLOBE = "digitalglobe"

class MapProviderService:
    def __init__(self):
        self.config = SecureConfigManager()
        self.premium_keys = self.config.load_config().get('map_providers', {})

    def get_tile_url(self, provider: MapProvider) -> str:
        base_urls = {
            MapProvider.OSM: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            MapProvider.USGS: 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}',
            MapProvider.NGA: 'https://gis.nga.mil/arcgis/rest/services/DOD_NGA/MapServer/tile/{z}/{y}/{x}',
            MapProvider.DOD: 'https://tiles.arcgis.com/tiles/Federal_DOD/arcgis/rest/services/MapServer/tile/{z}/{y}/{x}'
        }

        premium_urls = {
            MapProvider.ESRI: f'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{{z}}/{{y}}/{{x}}?token={self.premium_keys.get("esri_key", "")}',
            MapProvider.DIGITAL_GLOBE: f'https://services.digitalglobe.com/earthservice/tmsaccess/tms/1.0.0/DigitalGlobe:ImageryTileService@EPSG:3857/{{z}}/{{x}}/{{y}}.png?connectId={self.premium_keys.get("digitalglobe_key", "")}'
        }

        # Combine base and premium URLs
        all_urls = {**base_urls, **premium_urls}
        return all_urls.get(provider, base_urls[MapProvider.OSM])

    def is_provider_available(self, provider: MapProvider) -> bool:
        if provider in [MapProvider.ESRI, MapProvider.DIGITAL_GLOBE]:
            required_key = 'esri_key' if provider == MapProvider.ESRI else 'digitalglobe_key'
            return bool(self.premium_keys.get(required_key))
        return True

    def get_attribution(self, provider: MapProvider) -> str:
        attributions = {
            MapProvider.OSM: '© OpenStreetMap contributors',
            MapProvider.USGS: '© USGS National Map',
            MapProvider.NGA: '© National Geospatial-Intelligence Agency',
            MapProvider.DOD: '© Department of Defense',
            MapProvider.ESRI: '© ESRI ArcGIS',
            MapProvider.DIGITAL_GLOBE: '© Digital Globe'
        }
        return attributions.get(provider, attributions[MapProvider.OSM])
