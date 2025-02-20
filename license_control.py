
import hashlib
from datetime import datetime, timedelta
from secure_storage import SecureStorage
from typing import Dict, Optional

class LicenseManager:
    def __init__(self):
        self.storage = SecureStorage()
        self.grace_period = timedelta(days=7)
        
    def validate_license(self, license_key: str) -> Dict[str, Any]:
        try:
            license_data = self.storage.secure_read(
                f"licenses/{hashlib.sha256(license_key.encode()).hexdigest()}.encrypted"
            )
            
            if not self._verify_license_integrity(license_data):
                return {"valid": False, "reason": "License integrity check failed"}
                
            expiration = datetime.fromisoformat(license_data["expiration"])
            if expiration < datetime.now():
                return {"valid": False, "reason": "License expired"}
                
            return {"valid": True, "features": license_data["features"]}
        except:
            return {"valid": False, "reason": "Invalid license"}
            
    def _verify_license_integrity(self, license_data: Dict) -> bool:
        original_hash = license_data.get("integrity_hash")
        verification_data = f"{license_data['key']}{license_data['expiration']}"
        computed_hash = hashlib.sha384(verification_data.encode()).hexdigest()
        return original_hash == computed_hash
