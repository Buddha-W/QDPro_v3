
import sys
import inspect
import hashlib
from typing import Callable, Any
from functools import wraps

class AntiTampering:
    def __init__(self):
        self._code_hashes = {}
        self._initialized = False
        
    def protect_function(self, func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            if not self._verify_function_integrity(func):
                sys.exit(1)
            return func(*args, **kwargs)
        return wrapper
        
    def _verify_function_integrity(self, func: Callable) -> bool:
        current_hash = hashlib.sha256(
            inspect.getsource(func).encode()
        ).hexdigest()
        
        if func.__name__ not in self._code_hashes:
            self._code_hashes[func.__name__] = current_hash
            return True
            
        return self._code_hashes[func.__name__] == current_hash

    def initialize_protection(self):
        if self._initialized:
            return
            
        # Protect critical system functions
        sys.modules['dis'].dis = self._blocked_function
        sys.modules['inspect'].getsource = self._blocked_function
        self._initialized = True
        
    def _blocked_function(*args, **kwargs):
        raise RuntimeError("Operation not permitted")
