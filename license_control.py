
import hashlib
import uuid
import platform
import psutil
from datetime import datetime, timedelta
from secure_storage import SecureStorage
from cryptography.fernet import Fernet
from typing import Dict, Any

class LicenseManager:
    def __init__(self):
        self.storage = SecureStorage()
        self.grace_period = timedelta(days=7)
        
    def generate_hardware_id(self) -> str:
        system_info = [
            platform.node(),
            platform.machine(),
            str(uuid.getnode()),  # MAC address
            platform.processor(),
            str(psutil.cpu_freq().max),
            str(sum([p.size for p in psutil.disk_partitions()]))
        ]
        return hashlib.sha512(''.join(system_info).encode()).hexdigest()

    def validate_license(self, license_key: str) -> Dict[str, Any]:
        try:
            current_hardware_id = self.generate_hardware_id()
            license_data = self.storage.secure_read(
                f"licenses/{hashlib.sha256(license_key.encode()).hexdigest()}.encrypted"
            )
            
            if not self._verify_license_integrity(license_data):
                return {"valid": False, "reason": "License integrity check failed"}
                
            if license_data["hardware_id"] != current_hardware_id:
                return {"valid": False, "reason": "Invalid hardware configuration"}
                
            expiration = datetime.fromisoformat(license_data["expiration"])
            if expiration < datetime.now():
                return {"valid": False, "reason": "License expired"}
                
            self._verify_runtime_integrity()
            return {"valid": True, "features": license_data["features"]}
        except:
            return {"valid": False, "reason": "Invalid license"}
            
    def _verify_license_integrity(self, license_data: Dict) -> bool:
        original_hash = license_data.get("integrity_hash")
        verification_data = f"{license_data['key']}{license_data['expiration']}{license_data['hardware_id']}"
        computed_hash = hashlib.sha384(verification_data.encode()).hexdigest()
        return original_hash == computed_hash

    def _verify_runtime_integrity(self):
        """Verify runtime environment hasn't been tampered with"""
        if self._detect_debugger() or self._detect_virtualization():
            raise SecurityException("Runtime integrity check failed")

    def _detect_debugger(self) -> bool:
        try:
            return psutil.Process().is_running_under_debugger()
        except:
            return False

    def _detect_virtualization(self) -> bool:
        try:
            return "hypervisor" in platform.processor().lower()
        except:
            return False
