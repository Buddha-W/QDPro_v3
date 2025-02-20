
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64
import os
from datetime import datetime
import json

class SecureStorage:
    def __init__(self, key=None):
        if key is None:
            key = os.getenv("STORAGE_KEY")
            if not key:
                raise ValueError("STORAGE_KEY environment variable must be set")
        
        self.classification_levels = ["UNCLASSIFIED", "CONFIDENTIAL", "SECRET", "TOP_SECRET"]
        self.encryption_standard = "FIPS-140-2"
        self.key_rotation_interval = timedelta(days=30)
        self.last_key_rotation = datetime.now()
        
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=b'secure_storage_salt',
            iterations=480000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(key.encode()))
        self.fernet = Fernet(key)
    
    def encrypt_data(self, data):
        return self.fernet.encrypt(json.dumps(data).encode())
    
    def decrypt_data(self, encrypted_data):
        return json.loads(self.fernet.decrypt(encrypted_data).decode())
    
    def secure_write(self, filename, data):
        encrypted = self.encrypt_data(data)
        with open(filename, 'wb') as f:
            f.write(encrypted)
    
    def secure_read(self, filename):
        with open(filename, 'rb') as f:
            encrypted = f.read()
        return self.decrypt_data(encrypted)
