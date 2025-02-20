
from enum import Enum
from typing import Dict, Optional, BinaryIO
from secure_config import SecureConfigManager
import geopandas as gpd
from shapely.geometry import shape
import json

class MapProvider(Enum):
    OSM = "openstreetmap"
    GOOGLE = "google"
    USGS = "usgs"
    NGA = "nga"
    DOD = "dod"
    ESRI = "esri"
    DIGITAL_GLOBE = "digitalglobe"

class ShapefileHandler:
    @staticmethod
    def import_shapefile(file: BinaryIO) -> dict:
        gdf = gpd.read_file(file)
        return json.loads(gdf.to_json())

    @staticmethod
    def export_geojson_to_shapefile(geojson: dict, output_path: str):
        gdf = gpd.GeoDataFrame.from_features(geojson['features'])
        gdf.to_file(output_path, driver='ESRI Shapefile')

class MapProviderService:
    def __init__(self):
        self.config = SecureConfigManager()
        self.premium_keys = self.config.load_config().get('map_providers', {})

    def get_tile_url(self, provider: MapProvider, layer_type: str = 'standard') -> str:
        base_urls = {
            MapProvider.OSM: {
                'standard': 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                'humanitarian': 'https://tile-{s}.openstreetmap.fr/hot/{z}/{x}/{y}.png',
                'terrain': 'https://tile.thunderforest.com/landscape/{z}/{x}/{y}.png',
                'transport': 'https://tile.thunderforest.com/transport/{z}/{x}/{y}.png'
            },
            MapProvider.GOOGLE: {
                'standard': 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
                'satellite': 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
                'hybrid': 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
                'terrain': 'https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}'
            },
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
