from datetime import datetime, timezone
from secure_storage import SecureStorage
from typing import Dict, Any

class UsageMonitor:
    def __init__(self):
        self.storage = SecureStorage()
        self.metrics = {
            "api_calls": 0,
            "calculations": 0,
            "exports": 0,
            "memory_usage": 0,
            "response_times": []
        }
        
    def track_metric(self, metric_type: str, value: float) -> None:
        if metric_type in self.metrics:
            if isinstance(self.metrics[metric_type], list):
                self.metrics[metric_type].append(value)
            else:
                self.metrics[metric_type] += value
                
        self.storage.secure_write("system_metrics", self.metrics)
        
    def get_system_health(self) -> Dict[str, Any]:
        return {
            "status": "healthy" if self._check_health() else "degraded",
            "metrics": self.metrics,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    def _check_health(self) -> bool:
        if len(self.metrics["response_times"]) > 0:
            avg_response = sum(self.metrics["response_times"]) / len(self.metrics["response_times"])
            if avg_response > 2.0:  # 2 seconds threshold
                return False
        return True

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