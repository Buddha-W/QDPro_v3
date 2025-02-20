from datetime import datetime, timezone
from secure_storage import SecureStorage
from typing import Dict, Any

class UsageMonitor:
    def __init__(self):
        self.storage = SecureStorage()
        self.current_standard = "Standard A" #Example - needs to be dynamically set
        self.calculation_count = 0 #Example - needs to be dynamically updated

    def track_usage(self, user_id: str, feature: str) -> None:
        usage_data = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "feature": feature,
            "user_id": user_id,
            "standard_used": self.current_standard, #Adding standard usage
            "calculations_performed": self.calculation_count #Adding calculation count
        }
        self.storage.append_secure("usage_logs", usage_data)

    def check_usage_limits(self, user_id: str) -> bool:
        daily_limit = 1000  # Adjust as needed
        usage = self.storage.secure_read("usage_logs")
        today_usage = [log for log in usage 
                      if log["user_id"] == user_id 
                      and (datetime.now(timezone.utc) - datetime.fromisoformat(log["timestamp"])).days < 1]
        return len(today_usage) < daily_limit