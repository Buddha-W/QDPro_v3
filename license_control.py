import hashlib
import uuid
import platform
import psutil
import os
from datetime import datetime, timedelta
from secure_storage import SecureStorage
from cryptography.fernet import Fernet
from typing import Dict, Any

class LicenseManager:
    def __init__(self):
        self.storage = SecureStorage()
        self.grace_period = timedelta(days=7)
        self.deployment_types = ["ON_PREMISE", "AWS_GOVCLOUD", "AZURE_GOVERNMENT"]
        self.hosting_types = ["SELF_HOSTED", "VENDOR_HOSTED"]
        self.tier_limits = {
            "BASIC": {"max_users": 10, "features": ["basic"]},
            "PROFESSIONAL": {"max_users": 50, "features": ["basic", "advanced"]},
            "ENTERPRISE": {"max_users": 1000, "features": ["basic", "advanced", "classified"]}
        }

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

    def _verify_activation_count(self) -> bool:
        try:
            activations = self.storage.secure_read("activation_count")
            if activations > 3:  # Limit to 3 hardware changes
                return False
            self.storage.secure_write("activation_count", activations + 1)
            return True
        except:
            self.storage.secure_write("activation_count", 1)
            return True

    def _generate_time_hash(self) -> str:
        # Add additional entropy to prevent time tampering
        current_time = datetime.now()
        return hashlib.sha256(str(current_time.timestamp()).encode()).hexdigest()

    def validate_license(self, license_key: str) -> Dict[str, Any]:
        try:
            if not self._verify_activation_count():
                return {"valid": False, "reason": "Maximum activations reached"}

            current_hardware_id = self.generate_hardware_id()
            time_hash = self._generate_time_hash()

            license_file = f"licenses/{hashlib.sha256(license_key.encode()).hexdigest()}.encrypted"
            if not os.path.exists(license_file):
                return {"valid": False, "reason": "License not found"}

            license_data = self.storage.secure_read(license_file)

            # Verify time integrity
            if abs(datetime.now().timestamp() - license_data.get("last_check", 0)) > 86400:
                return {"valid": False, "reason": "System time manipulation detected"}

            # Update last check time
            license_data["last_check"] = datetime.now().timestamp()
            self.storage.secure_write(license_file, license_data)

            if not self._verify_license_integrity(license_data):
                return {"valid": False, "reason": "License integrity check failed"}

            # Store multiple device IDs per license
            if "device_ids" not in license_data:
                license_data["device_ids"] = [current_hardware_id]
                self.storage.secure_write(
                    f"licenses/{hashlib.sha256(license_key.encode()).hexdigest()}.encrypted",
                    license_data
                )
            elif current_hardware_id not in license_data["device_ids"] and len(license_data["device_ids"]) < 5:
                license_data["device_ids"].append(current_hardware_id)
                self.storage.secure_write(
                    f"licenses/{hashlib.sha256(license_key.encode()).hexdigest()}.encrypted",
                    license_data
                )
            elif current_hardware_id not in license_data["device_ids"]:
                return {"valid": False, "reason": "Maximum devices reached"}

            expiration = datetime.fromisoformat(license_data["expiration"])
            if expiration < datetime.now():
                return {"valid": False, "reason": "License expired"}

            self._verify_runtime_integrity()
            return {"valid": True, "features": license_data["features"]}
        except:
            return {"valid": False, "reason": "Invalid license"}

    def _verify_license_integrity(self, license_data: Dict) -> bool:
        original_hash = license_data.get("integrity_hash")
        verification_data = f"{license_data['key']}{license_data['expiration']}{license_data.get('hardware_id', '')}"
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

    def generate_license(self, 
                        duration_years: int,
                        tier: str = "BASIC",
                        hosting_type: str = "SELF_HOSTED",
                        deployment_type: str = "ON_PREMISE",
                        max_instances: int = 1) -> str:
        if deployment_type not in self.deployment_types:
            raise ValueError(f"Deployment type must be one of {self.deployment_types}")
        if hosting_type not in self.hosting_types:
            raise ValueError(f"Hosting type must be one of {self.hosting_types}")
        if tier not in self.tier_limits:
            raise ValueError(f"Tier must be one of {list(self.tier_limits.keys())}")

        license_key = uuid.uuid4().hex
        expiration = datetime.now() + timedelta(days=365 * duration_years)

        license_data = {
            "key": license_key,
            "expiration": expiration.isoformat(),
            "tier": tier,
            "features": self.tier_limits[tier]["features"],
            "max_users": self.tier_limits[tier]["max_users"],
            "hosting_type": hosting_type,
            "deployment_type": deployment_type,
            "max_instances": max_instances,
            "current_instances": 0,
            "device_ids": [],
            "last_check": datetime.now().timestamp(),
            "creation_date": datetime.now().isoformat(),
            "vendor_hosted_url": f"https://qdpro-{license_key[:8]}.repl.co" if hosting_type == "VENDOR_HOSTED" else None
        }

        # Add integrity hash
        verification_data = f"{license_data['key']}{license_data['expiration']}{license_data.get('hardware_id', '')}"
        license_data["integrity_hash"] = hashlib.sha384(verification_data.encode()).hexdigest()

        # Encrypt and store
        self.storage.secure_write(
            f"licenses/{hashlib.sha256(license_key.encode()).hexdigest()}.encrypted",
            license_data
        )

        return license_key

class SecurityException(Exception):
    pass