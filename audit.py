
import logging
from datetime import datetime
import json

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

import hashlib
from datetime import datetime, timezone
import socket

def sanitize_data(data: str) -> str:
    return ''.join(char for char in data if char.isprintable())

def log_activity(user_id: str, action: str, resource: str, status: str, details: dict = None):
    hostname = socket.gethostname()
    log_entry = {
        'system_id': hashlib.sha256(hostname.encode()).hexdigest(),
        'event_id': hashlib.sha256(f"{datetime.now().timestamp()}:{user_id}".encode()).hexdigest(),
        'timestamp': datetime.utcnow().isoformat(),
        'user_id': user_id,
        'action': action,
        'resource': resource,
        'status': status,
        'details': details
    }
    logging.info(json.dumps(log_entry))
