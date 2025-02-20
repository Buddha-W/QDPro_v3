
from cryptography.fernet import Fernet
from typing import Dict, Any
import json
import os
from datetime import datetime, timedelta
from secure_storage import SecureStorage

class SecureConfigManager:
    def __init__(self):
        self.storage = SecureStorage()
        self.config_file = "secure_config.encrypted"
        self.last_check = datetime.now()
        self.check_interval = timedelta(minutes=5)
        
        # NIST SP 800-171r2 compliance settings
        self.default_config = {
            "access_control": {
                "session_timeout": 900,  # 15 minutes in seconds
                "max_login_attempts": 3,
                "account_lockout_duration": 1800,  # 30 minutes in seconds
                "password_complexity": {
                    "min_length": 14,
                    "require_uppercase": True,
                    "require_lowercase": True,
                    "require_numbers": True,
                    "require_special": True,
                    "password_history": 5
                }
            },
            "audit": {
                "log_retention_days": 365,
                "sensitive_operations": [
                    "LOGIN_ATTEMPT",
                    "PASSWORD_CHANGE",
                    "ACCESS_DENIED",
                    "CONFIGURATION_CHANGE",
                    "DATA_EXPORT",
                    "ADMIN_ACTION"
                ]
            },
            "encryption": {
                "key_rotation_days": 90,
                "minimum_tls_version": "1.2",
                "approved_algorithms": [
                    "AES-256-GCM",
                    "RSA-3072",
                    "ECDSA-P384"
                ]
            },
            "network": {
                "allowed_origins": ["*"],  # Customize based on requirements
                "rate_limit": {
                    "window_seconds": 300,
                    "max_requests": 100
                }
            }
        }
    
    def load_config(self) -> Dict[str, Any]:
        try:
            if os.path.exists(self.config_file):
                return self.storage.secure_read(self.config_file)
            self.storage.secure_write(self.config_file, self.default_config)
            return self.default_config
        except Exception as e:
            self.storage.secure_write(self.config_file, self.default_config)
            return self.default_config

    def update_config(self, new_config: Dict[str, Any]) -> None:
        current_config = self.load_config()
        current_config.update(new_config)
        self.storage.secure_write(self.config_file, current_config)
