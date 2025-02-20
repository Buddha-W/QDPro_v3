
from typing import Dict, Any
import jwt
from datetime import datetime, timedelta
from secure_storage import SecureStorage
import hashlib

class ZeroTrustEnforcer:
    def __init__(self):
        self.storage = SecureStorage()
        self.session_duration = timedelta(minutes=15)
        self.trust_score_threshold = 0.7
        
    def evaluate_request(self, request_data: Dict[str, Any]) -> bool:
        trust_score = self._calculate_trust_score(request_data)
        return trust_score >= self.trust_score_threshold
    
    def _calculate_trust_score(self, request_data: Dict[str, Any]) -> float:
        factors = {
            "valid_token": 0.3,
            "known_device": 0.2,
            "network_trust": 0.2,
            "behavioral_score": 0.3
        }
        
        score = 0.0
        if self._verify_token(request_data.get("token")):
            score += factors["valid_token"]
        if self._verify_device(request_data.get("device_id")):
            score += factors["known_device"]
        if self._assess_network(request_data.get("network_info")):
            score += factors["network_trust"]
        if self._check_behavior(request_data.get("user_id")):
            score += factors["behavioral_score"]
            
        return score
    
    def _verify_token(self, token: str) -> bool:
        try:
            jwt.decode(token, self.storage.encryption_key, algorithms=["HS512"])
            return True
        except:
            return False
            
    def _verify_device(self, device_id: str) -> bool:
        if not device_id:
            return False
        try:
            device_data = self.storage.secure_read(
                f"devices/{hashlib.sha256(device_id.encode()).hexdigest()}.encrypted"
            )
            return device_data.get("trusted", False)
        except:
            return False
