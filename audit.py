
import logging
from datetime import datetime
import json

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

def log_activity(user_id: str, action: str, resource: str, status: str, details: dict = None):
    log_entry = {
        'timestamp': datetime.utcnow().isoformat(),
        'user_id': user_id,
        'action': action,
        'resource': resource,
        'status': status,
        'details': details
    }
    logging.info(json.dumps(log_entry))
