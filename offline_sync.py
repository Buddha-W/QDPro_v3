
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
        
    def cache_data(self, key: str, data: Any, priority: int = 1):
        """Cache data locally with priority levels"""
        import zlib
        
        compressed = zlib.compress(json.dumps(data).encode())
        self.local_cache[key] = {
            'data': compressed,
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'priority': priority,
            'compressed': True
        }
        self.storage.secure_write(f"offline_cache/{key}.cache", self.local_cache[key])
        
        # Manage cache size
        self._cleanup_cache_if_needed()
        
    def _cleanup_cache_if_needed(self, max_size_mb: int = 500):
        """Clean up cache when it exceeds size limit"""
        current_size = 0
        cache_items = []
        
        for key, data in self.local_cache.items():
            size = len(data['data'])
            current_size += size
            cache_items.append((key, size, data['priority'], data['timestamp']))
            
        if current_size > max_size_mb * 1024 * 1024:
            # Sort by priority (ascending) and timestamp (oldest first)
            cache_items.sort(key=lambda x: (x[2], x[3]))
            
            # Remove items until we're under the limit
            while current_size > max_size_mb * 1024 * 1024 and cache_items:
                key, size, _, _ = cache_items.pop(0)
                current_size -= size
                del self.local_cache[key]
                os.remove(f"offline_cache/{key}.cache")
        
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
        """Smart connection check with fallback"""
        endpoints = [
            ("8.8.8.8", 53),
            ("1.1.1.1", 53),
            ("208.67.222.222", 53)
        ]
        for endpoint in endpoints:
            try:
                import socket
                socket.create_connection(endpoint, timeout=2)
                return True
            except:
                continue
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


    def resolve_conflicts(self, local_data: Dict, remote_data: Dict) -> Dict:
        """Resolve conflicts between local and remote data"""
        resolved = {}
        for key in set(local_data.keys()) | set(remote_data.keys()):
            if key not in remote_data:
                resolved[key] = local_data[key]
            elif key not in local_data:
                resolved[key] = remote_data[key]
            else:
                local_time = datetime.fromisoformat(local_data[key]['timestamp'])
                remote_time = datetime.fromisoformat(remote_data[key]['timestamp'])
                resolved[key] = local_data[key] if local_time > remote_time else remote_data[key]
        return resolved
