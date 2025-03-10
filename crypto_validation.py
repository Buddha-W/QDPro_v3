
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives import hashes
import os
from typing import Dict, Any

class CryptoValidator:
    def __init__(self, bypass_validation: bool = False):
        self.bypass_validation = bypass_validation
        if not bypass_validation:
            self.key = AESGCM.generate_key(bit_length=256)
            self.aesgcm = AESGCM(self.key)
        
    def validate_crypto_operations(self, data: Dict[str, Any]) -> bool:
        if self.bypass_validation:
            return True
        nonce = os.urandom(12)
        try:
            encrypted = self.aesgcm.encrypt(nonce, str(data).encode(), None)
            decrypted = self.aesgcm.decrypt(nonce, encrypted, None)
            return data == eval(decrypted.decode())
        except:
            return False
