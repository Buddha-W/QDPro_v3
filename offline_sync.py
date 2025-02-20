
from secure_storage import SecureStorage
from typing import Dict, Any, List
import json
import os
from datetime import datetime, timezone
import sqlite3
import threading
import time

class OfflineSyncManager:
    def __init__(self):
        self.storage = SecureStorage()
        self.sync_queue = []
        self.local_cache = {}
        self._initialize_local_storage()
        self._start_background_sync()
        
    def _initialize_local_storage(self):
        if not os.path.exists("offline_cache"):
            os.makedirs("offline_cache")
        
        conn = sqlite3.connect("offline_cache/sync_queue.db")
        c = conn.cursor()
        c.execute('''CREATE TABLE IF NOT EXISTS sync_queue
                    (id TEXT PRIMARY KEY, data TEXT, timestamp TEXT)''')
        conn.commit()
        conn.close()
        
    def cache_data(self, key: str, data: Any):
        """Cache data locally"""
        self.local_cache[key] = {
            'data': data,
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        self.storage.secure_write(f"offline_cache/{key}.cache", self.local_cache[key])
        
    def get_cached_data(self, key: str) -> Any:
        """Retrieve cached data"""
        if key in self.local_cache:
            return self.local_cache[key]['data']
        try:
            cached = self.storage.secure_read(f"offline_cache/{key}.cache")
            self.local_cache[key] = cached
            return cached['data']
        except:
            return None
            
    def queue_sync(self, operation: Dict[str, Any]):
        """Queue operation for sync when online"""
        conn = sqlite3.connect("offline_cache/sync_queue.db")
        c = conn.cursor()
        c.execute("INSERT INTO sync_queue VALUES (?, ?, ?)",
                 (operation['id'], 
                  json.dumps(operation), 
                  datetime.now(timezone.utc).isoformat()))
        conn.commit()
        conn.close()
        
    def _start_background_sync(self):
        """Start background sync thread"""
        def sync_worker():
            while True:
                if self._check_connection():
                    self._process_sync_queue()
                time.sleep(300)  # Check every 5 minutes
                
        thread = threading.Thread(target=sync_worker, daemon=True)
        thread.start()
        
    def _check_connection(self) -> bool:
        """Check internet connection"""
        try:
            # Minimal connection check
            import socket
            socket.create_connection(("8.8.8.8", 53), timeout=3)
            return True
        except:
            return False
            
    def _process_sync_queue(self):
        """Process queued operations when online"""
        conn = sqlite3.connect("offline_cache/sync_queue.db")
        c = conn.cursor()
        for row in c.execute("SELECT * FROM sync_queue ORDER BY timestamp"):
            operation = json.loads(row[1])
            try:
                # Process operation based on type
                if operation['type'] == 'facility':
                    self._sync_facility(operation['data'])
                elif operation['type'] == 'analysis':
                    self._sync_analysis(operation['data'])
                
                # Remove from queue after successful sync
                c.execute("DELETE FROM sync_queue WHERE id = ?", (operation['id'],))
                conn.commit()
            except Exception as e:
                print(f"Sync failed for operation {operation['id']}: {str(e)}")
                
        conn.close()
