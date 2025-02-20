
from secure_storage import SecureStorage
from typing import Dict, Any
import os

class DeploymentManager:
    def __init__(self):
        self.storage = SecureStorage()
        self.offline_mode = False
        
    def configure_deployment(self, deployment_type: str = "self_hosted", air_gapped: bool = False) -> Dict[str, Any]:
        self.offline_mode = air_gapped
        base_config = {
            "database_url": os.getenv("DATABASE_URL"),
            "port": int(os.getenv("PORT", "8080")),
            "host": "0.0.0.0",
            "workers": int(os.getenv("WORKERS", "4")),
            "ssl_enabled": True,
            "cors_origins": os.getenv("CORS_ORIGINS", "*").split(",")
        }
        
        if deployment_type == "self_hosted":
            base_config.update({
                "monitoring_enabled": True,
                "backup_enabled": True,
                "auto_scaling": False
            })
        else:  # client_hosted
            base_config.update({
                "monitoring_enabled": False,
                "backup_enabled": False,
                "auto_scaling": True
            })
            
        if self.offline_mode:
            base_config.update({
                "database_url": "sqlite:///local.db",
                "offline_cache": True,
                "local_storage": True,
                "sync_when_online": True,
                "map_cache_enabled": True,
                "monitoring_enabled": True,
                "backup_enabled": True,
                "auto_scaling": False
            })
            
        return base_config
        
    def enable_offline_mode(self):
        """Switch to offline/air-gapped mode"""
        self.offline_mode = True
        self.cache_map_tiles()
        self.initialize_local_db()
        
    def cache_map_tiles(self):
        """Cache map tiles for offline use"""
        if not os.path.exists("map_cache"):
            os.makedirs("map_cache")
            
    def initialize_local_db(self):
        """Initialize local SQLite database"""
        from sqlalchemy import create_engine
        engine = create_engine("sqlite:///local.db")
        with open("schema.sql") as f:
            engine.execute(f.read())
        
    def validate_environment(self) -> bool:
        required_vars = [
            "DATABASE_URL",
            "LICENSE_KEY",
            "SECRET_KEY",
            "ENCRYPTION_KEY"
        ]
        
        return all(os.getenv(var) for var in required_vars)
