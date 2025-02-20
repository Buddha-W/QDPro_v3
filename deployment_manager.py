
from secure_storage import SecureStorage
from typing import Dict, Any
import os

class DeploymentManager:
    def __init__(self):
        self.storage = SecureStorage()
        
    def configure_deployment(self, deployment_type: str = "self_hosted") -> Dict[str, Any]:
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
            
        return base_config
        
    def validate_environment(self) -> bool:
        required_vars = [
            "DATABASE_URL",
            "LICENSE_KEY",
            "SECRET_KEY",
            "ENCRYPTION_KEY"
        ]
        
        return all(os.getenv(var) for var in required_vars)
