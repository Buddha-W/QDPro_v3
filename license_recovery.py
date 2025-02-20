
from secure_storage import SecureStorage
from typing import Dict, Any
from datetime import datetime, timedelta
import hashlib

class LicenseRecovery:
    def __init__(self):
        self.storage = SecureStorage()
        self.recovery_window = timedelta(days=30)
        
    def generate_recovery_token(self, license_key: str) -> str:
        recovery_data = {
            "license_key": license_key,
            "timestamp": datetime.now().isoformat(),
            "recovery_id": hashlib.sha384(f"{license_key}:{datetime.now().timestamp()}".encode()).hexdigest()
        }
        token = hashlib.sha384(str(recovery_data).encode()).hexdigest()
        self.storage.secure_write(f"recovery/{token}.encrypted", recovery_data)
        return token
        
    def process_recovery(self, recovery_token: str, new_hardware_id: str) -> bool:
        try:
            recovery_data = self.storage.secure_read(f"recovery/{recovery_token}.encrypted")
            recovery_time = datetime.fromisoformat(recovery_data["timestamp"])
            
            if datetime.now() - recovery_time > self.recovery_window:
                return False
                
            license_data = self.storage.secure_read(f"licenses/{recovery_data['license_key']}.encrypted")
            if new_hardware_id not in license_data["device_ids"]:
                license_data["device_ids"].append(new_hardware_id)
                self.storage.secure_write(f"licenses/{recovery_data['license_key']}.encrypted", license_data)
            return True
        except:
            return False
