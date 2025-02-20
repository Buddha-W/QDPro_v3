
import logging
from datetime import datetime, timezone
import json
import hashlib
import socket
import os
from secure_storage import SecureStorage

from typing import Optional, Dict, Any
from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import os

class SecureAuditLogger:
    def __init__(self):
        self.storage = SecureStorage()
        self.integrity_key = os.getenv("AUDIT_INTEGRITY_KEY", os.urandom(32))
        self.security_events = {
            "AUTH_FAILURE": "Authentication Failure",
            "ACCESS_DENIED": "Access Denied",
            "PRIVILEGE_ESCALATION": "Privilege Escalation Attempt",
            "DATA_ACCESS": "Sensitive Data Access",
            "CONFIG_CHANGE": "Configuration Change",
            "SYSTEM_ALERT": "System Security Alert"
        }
        self.retention_period = timedelta(days=365)
        self.alert_threshold = 3
        self.monitoring_interval = timedelta(minutes=5)
        self.log_path = "audit_logs"
        if not os.path.exists(self.log_path):
            os.makedirs(self.log_path)
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(f"{self.log_path}/system.log"),
                logging.StreamHandler()
            ]
        )
    
    def sanitize_data(self, data: str) -> str:
        return ''.join(char for char in data if char.isprintable())
    
    def calculate_integrity_hash(self, entry: Dict[str, Any]) -> str:
        message = f"{entry['timestamp']}{entry['user_id']}{entry['action']}{entry['resource']}"
        return hmac.new(self.integrity_key, message.encode(), hashlib.sha384).hexdigest()

    def log_activity(self, user_id: str, action: str, resource: str, status: str, details: dict = None):
        hostname = socket.gethostname()
        timestamp = datetime.now(timezone.utc)
        
        # Enhanced metadata collection
        entry = {
            'system_id': hashlib.sha384(hostname.encode()).hexdigest(),
            'event_id': hashlib.sha384(f"{timestamp.timestamp()}:{user_id}".encode()).hexdigest(),
            'timestamp': timestamp.isoformat(),
            'user_id': self.sanitize_data(user_id),
            'action': self.sanitize_data(action),
            'resource': self.sanitize_data(resource),
            'status': self.sanitize_data(status),
            'details': details,
            'source_ip': os.getenv('REPL_OWNER'),
            'classification': 'CONTROLLED_UNCLASSIFIED',
            'process_id': os.getpid(),
            'thread_id': threading.get_ident()
        }
        
        # Add integrity hash
        entry['integrity_hash'] = self.calculate_integrity_hash(entry)
        
        log_entry = {
            'system_id': hashlib.sha256(hostname.encode()).hexdigest(),
            'event_id': hashlib.sha256(f"{timestamp.timestamp()}:{user_id}".encode()).hexdigest(),
            'timestamp': timestamp.isoformat(),
            'user_id': self.sanitize_data(user_id),
            'action': self.sanitize_data(action),
            'resource': self.sanitize_data(resource),
            'status': self.sanitize_data(status),
            'details': details,
            'source_ip': os.getenv('REPL_OWNER'),
            'classification': 'CONTROLLED_UNCLASSIFIED'
        }
        
        # Secure storage of audit log
        log_file = f"{self.log_path}/{timestamp.strftime('%Y%m%d')}.encrypted"
        current_logs = []
        if os.path.exists(log_file):
            try:
                current_logs = self.storage.secure_read(log_file)
            except Exception:
                current_logs = []
        
        current_logs.append(log_entry)
        self.storage.secure_write(log_file, current_logs)
        logging.info(json.dumps(log_entry))

logger = SecureAuditLogger()
log_activity = logger.log_activity
