
from typing import Optional, Dict
import pyotp
import qrcode
from secure_storage import SecureStorage
from datetime import datetime, timedelta
import hashlib

class MFAManager:
    def __init__(self):
        self.storage = SecureStorage()
        self.totp_window = 1
        self.backup_codes_count = 10
        
    def generate_totp_secret(self, user_id: str) -> Dict[str, str]:
        secret = pyotp.random_base32()
        totp = pyotp.TOTP(secret)
        provisioning_uri = totp.provisioning_uri(user_id, issuer_name="QDPro-GIS")
        
        mfa_data = {
            "secret": secret,
            "backup_codes": self._generate_backup_codes(),
            "enabled": True,
            "last_used": None
        }
        
        self.storage.secure_write(
            f"mfa/{hashlib.sha256(user_id.encode()).hexdigest()}.encrypted",
            mfa_data
        )
        
        return {
            "secret": secret,
            "uri": provisioning_uri
        }
    
    def verify_totp(self, user_id: str, token: str) -> bool:
        mfa_data = self.storage.secure_read(
            f"mfa/{hashlib.sha256(user_id.encode()).hexdigest()}.encrypted"
        )
        totp = pyotp.TOTP(mfa_data["secret"])
        return totp.verify(token, valid_window=self.totp_window)
    
    def _generate_backup_codes(self) -> list:
        return [hashlib.sha256(os.urandom(32)).hexdigest()[:10] 
                for _ in range(self.backup_codes_count)]
