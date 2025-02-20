
from cryptography.fernet import Fernet
from secure_storage import SecureStorage
from secure_config import SecureConfigManager
import os
import hashlib
from typing import List, Dict

class MediaProtection:
    def __init__(self):
        self.storage = SecureStorage()
        self.config = SecureConfigManager()
        
    def sanitize_media(self, file_path: str) -> bool:
        """Securely overwrites file contents before deletion"""
        if os.path.exists(file_path):
            file_size = os.path.getsize(file_path)
            with open(file_path, 'wb') as f:
                # Multiple pass overwrite
                for _ in range(3):
                    f.seek(0)
                    f.write(os.urandom(file_size))
                    f.flush()
            os.remove(file_path)
            return True
        return False
    
    def mark_media_classification(self, file_path: str, classification: str) -> Dict[str, str]:
        """Marks media with appropriate security classification"""
        file_hash = hashlib.sha384()
        with open(file_path, 'rb') as f:
            for chunk in iter(lambda: f.read(4096), b''):
                file_hash.update(chunk)
                
        metadata = {
            "file_path": file_path,
            "classification": classification,
            "hash": file_hash.hexdigest(),
            "handling_instructions": self._get_handling_instructions(classification)
        }
        
        self.storage.secure_write(
            f"media_registry/{os.path.basename(file_path)}.meta.encrypted",
            metadata
        )
        return metadata
    
    def _get_handling_instructions(self, classification: str) -> List[str]:
        instructions = {
            "CONTROLLED": [
                "Must be stored in approved containers",
                "Digital transmission must be encrypted",
                "Access limited to authorized personnel"
            ],
            "CONFIDENTIAL": [
                "Must be stored in GSA approved containers",
                "Digital transmission requires AES-256 encryption",
                "Two-person integrity required for access"
            ]
        }
        return instructions.get(classification, ["Standard handling procedures apply"])
