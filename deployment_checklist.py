
from typing import Dict, List
from datetime import datetime
import json
from secure_storage import SecureStorage

class DeploymentChecker:
    def __init__(self):
        self.storage = SecureStorage()
        
    def run_pre_deployment_checks(self) -> Dict[str, bool]:
        results = {
            "timestamp": datetime.now().isoformat(),
            "database": self._check_database(),
            "security": self._check_security(),
            "compliance": self._check_compliance(),
            "performance": self._check_performance(),
            "backup": self._check_backup_system()
        }
        return results
    
    def _check_database(self) -> bool:
        try:
            from database_maintenance import DatabaseMaintenance
            db = DatabaseMaintenance(os.getenv("DATABASE_URL"))
            
            # Check basic connectivity
            if not db.verify_integrity():
                return False
                
            # Verify indexes
            with db.engine.connect() as conn:
                indexes = [
                    'idx_facilities_location',
                    'idx_safety_arcs_geometry',
                    'idx_sync_status_device',
                    'idx_analysis_results_project'
                ]
                for idx in indexes:
                    result = conn.execute(text(f"SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = '{idx}')"))
                    if not result.scalar():
                        return False
                        
            return True
        except Exception as e:
            logging.error(f"Database check failed: {str(e)}")
            return False
            
    def _check_security(self) -> bool:
        try:
            # Verify security systems
            from system_hardening import SystemHardening
            from crypto_validation import CryptoValidator
            
            hardening = SystemHardening()
            crypto = CryptoValidator()
            
            return all([
                hardening.enforce_security_controls(),
                crypto.validate_crypto_operations({"test": "data"})
            ])
        except:
            return False
            
    def _check_compliance(self) -> bool:
        try:
            from fedramp_compliance import FedRAMPControls
            fedramp = FedRAMPControls()
            return fedramp.validate_compliance()["compliant"]
        except:
            return False
            
    def _check_performance(self) -> bool:
        try:
            from usage_monitor import UsageMonitor
            monitor = UsageMonitor()
            metrics = monitor.get_system_metrics()
            return all([
                metrics["cpu_usage"] < 80,
                metrics["memory_usage"] < 80,
                metrics["disk_usage"] < 80
            ])
        except:
            return False
            
    def _check_backup_system(self) -> bool:
        try:
            return self.storage.verify_backup_integrity()
        except:
            return False
