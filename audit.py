
import logging
from datetime import datetime, timezone
import json
import hashlib
import socket
import os
from secure_storage import SecureStorage

class SecureAuditLogger:
    def __init__(self):
        self.storage = SecureStorage()
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
    
    def log_activity(self, user_id: str, action: str, resource: str, status: str, details: dict = None):
        hostname = socket.gethostname()
        timestamp = datetime.now(timezone.utc)
        
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
