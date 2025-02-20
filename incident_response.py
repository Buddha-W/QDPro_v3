
from datetime import datetime, timezone
from secure_storage import SecureStorage
from secure_config import SecureConfigManager
from typing import Dict, Any
import json
import hashlib

class IncidentManager:
    def __init__(self):
        self.storage = SecureStorage()
        self.config = SecureConfigManager()
        self.incident_levels = {
            "LOW": 1,
            "MEDIUM": 2,
            "HIGH": 3,
            "CRITICAL": 4
        }
    
    def report_incident(self, incident_type: str, severity: str, details: Dict[str, Any]):
        timestamp = datetime.now(timezone.utc)
        incident = {
            "id": hashlib.sha384(f"{timestamp.isoformat()}:{incident_type}".encode()).hexdigest(),
            "type": incident_type,
            "severity": severity,
            "timestamp": timestamp.isoformat(),
            "details": details,
            "status": "OPEN",
            "containment_measures": [],
            "resolution_steps": []
        }
        
        self.storage.secure_write(
            f"incidents/{incident['id']}.encrypted",
            incident
        )
        
        if self.incident_levels.get(severity, 0) >= self.incident_levels["HIGH"]:
            self._trigger_emergency_response(incident)
    
    def _trigger_emergency_response(self, incident: Dict[str, Any]):
        response_plan = {
            "incident_id": incident["id"],
            "immediate_actions": [
                "ISOLATE_AFFECTED_SYSTEMS",
                "NOTIFY_SECURITY_TEAM",
                "PRESERVE_EVIDENCE",
                "INITIATE_SYSTEM_BACKUP",
                "ENABLE_FIPS_MODE",
                "REVOKE_ACTIVE_SESSIONS",
                "INCREASE_LOGGING_LEVEL"
            ],
            "notification_chain": [
                "SECURITY_LEAD",
                "SYSTEM_ADMIN",
                "COMPLIANCE_OFFICER",
                "ISSM",
                "FSO"
            ],
            "compliance_requirements": [
                "NIST_SP_800_171R2",
                "CMMC_2_0",
                "FIPS_140_2"
            ],
            "automated_response": {
                "network_isolation": True,
                "session_termination": True,
                "evidence_collection": True,
                "system_hardening": True
            }
        }
        self.storage.secure_write(
            f"incidents/response_{incident['id']}.encrypted",
            response_plan
        )
