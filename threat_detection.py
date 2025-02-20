
from typing import Dict, List
from datetime import datetime, timedelta
from secure_storage import SecureStorage
import json

class ThreatDetection:
    def __init__(self):
        self.storage = SecureStorage()
        self.alert_threshold = 5
        self.monitoring_window = timedelta(minutes=15)
        
    def analyze_logs(self) -> List[Dict]:
        current_time = datetime.now()
        threats = []
        
        log_entries = self._get_recent_logs()
        
        # Detect brute force attempts
        failed_logins = self._count_failed_logins(log_entries)
        for ip, count in failed_logins.items():
            if count > self.alert_threshold:
                threats.append({
                    "type": "BRUTE_FORCE_ATTEMPT",
                    "source_ip": ip,
                    "count": count,
                    "timestamp": current_time.isoformat()
                })
                
        # Detect license tampering
        license_modifications = self._detect_license_tampering(log_entries)
        threats.extend(license_modifications)
        
        return threats
        
    def _get_recent_logs(self) -> List[Dict]:
        cutoff_time = datetime.now() - self.monitoring_window
        recent_logs = []
        
        try:
            logs = self.storage.secure_read("audit_logs/current.encrypted")
            for entry in logs:
                if datetime.fromisoformat(entry["timestamp"]) > cutoff_time:
                    recent_logs.append(entry)
        except:
            pass
            
        return recent_logs
        
    def _count_failed_logins(self, logs: List[Dict]) -> Dict[str, int]:
        failed_counts = {}
        for entry in logs:
            if entry["action"] == "LOGIN_ATTEMPT" and entry["status"] == "FAILED":
                ip = entry["source_ip"]
                failed_counts[ip] = failed_counts.get(ip, 0) + 1
        return failed_counts
        
    def _detect_license_tampering(self, logs: List[Dict]) -> List[Dict]:
        tampering_events = []
        for entry in logs:
            if entry["action"] in ["LICENSE_MODIFICATION", "SYSTEM_TIME_CHANGE"]:
                tampering_events.append({
                    "type": "LICENSE_TAMPERING",
                    "source_ip": entry["source_ip"],
                    "details": entry["details"],
                    "timestamp": entry["timestamp"]
                })
        return tampering_events
