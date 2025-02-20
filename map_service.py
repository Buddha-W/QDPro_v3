
from typing import Dict, Any
from map_providers import MapProvider, MapProviderService

class MapService:
    def __init__(self):
        self.provider_service = MapProviderService()
        
    async def verify_services(self) -> Dict[str, Any]:
        """Verify the status of map services"""
        try:
            providers_status = {
                provider.value: self.provider_service.is_provider_available(provider)
                for provider in MapProvider
            }
            
            return {
                "healthy": any(providers_status.values()),
                "providers": providers_status,
                "details": "Map services operational"
            }
        except Exception as e:
            return {
                "healthy": False,
                "error": str(e),
                "details": "Map services verification failed"
            }
