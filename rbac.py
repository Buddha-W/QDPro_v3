
from typing import List, Dict, Set
from secure_storage import SecureStorage
import hashlib

class RBACManager:
    def __init__(self):
        self.storage = SecureStorage()
        self.default_roles = {
            "READER": {"permissions": {"READ"}},
            "EDITOR": {"permissions": {"READ", "WRITE"}},
            "ADMIN": {"permissions": {"READ", "WRITE", "DELETE", "ADMIN"}},
            "SECURITY_OFFICER": {"permissions": {"READ", "AUDIT", "SECURITY_CONFIG"}},
            "DATA_CUSTODIAN": {"permissions": {"READ", "WRITE", "DELETE", "CLASSIFY"}}
        }
        
    def check_permission(self, user_id: str, required_permission: str) -> bool:
        user_roles = self.get_user_roles(user_id)
        user_permissions = set()
        
        for role in user_roles:
            role_data = self.default_roles.get(role, {"permissions": set()})
            user_permissions.update(role_data["permissions"])
            
        return required_permission in user_permissions
    
    def get_user_roles(self, user_id: str) -> List[str]:
        try:
            user_data = self.storage.secure_read(
                f"rbac/users/{hashlib.sha256(user_id.encode()).hexdigest()}.encrypted"
            )
            return user_data.get("roles", ["READER"])
        except:
            return ["READER"]
