
from datetime import datetime, timedelta
from typing import Dict, Tuple
from secure_storage import SecureStorage

class RateLimiter:
    def __init__(self):
        self.storage = SecureStorage()
        self.limits = {
            "API_CALLS": (100, timedelta(hours=1)),  # 100 calls per hour
            "CALCULATIONS": (50, timedelta(hours=1)), # 50 calculations per hour
            "EXPORTS": (10, timedelta(hours=1))      # 10 exports per hour
        }
        
    def check_limit(self, user_id: str, action_type: str) -> bool:
        if action_type not in self.limits:
            return True
            
        limit, window = self.limits[action_type]
        current_time = datetime.now()
        
        try:
            usage_data = self.storage.secure_read(f"rate_limits/{user_id}.encrypted")
            if not usage_data.get(action_type):
                usage_data[action_type] = []
        except:
            usage_data = {action_type: []}
            
        # Clean old entries
        usage_data[action_type] = [
            timestamp for timestamp in usage_data[action_type]
            if current_time - datetime.fromisoformat(timestamp) <= window
        ]
        
        if len(usage_data[action_type]) >= limit:
            return False
            
        usage_data[action_type].append(current_time.isoformat())
        self.storage.secure_write(f"rate_limits/{user_id}.encrypted", usage_data)
        return True
