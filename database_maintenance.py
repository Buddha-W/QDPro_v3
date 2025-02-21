
from sqlalchemy import create_engine, text
from datetime import datetime, timedelta
import asyncio
import logging

class DatabaseMaintenance:
    def __init__(self, db_url):
        self.engine = create_engine(db_url)
        self.logger = logging.getLogger(__name__)

    def verify_integrity(self) -> bool:
        try:
            with self.engine.connect() as conn:
                # Check if tables exist
                tables = ['facilities', 'explosive_sites', 'safety_arcs', 'projects', 
                         'licenses', 'audit_logs', 'usage_metrics', 'sync_status']
                for table in tables:
                    result = conn.execute(text(f"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '{table}')"))
                    if not result.scalar():
                        self.logger.error(f"Table {table} does not exist")
                        return False
                return True
        except Exception as e:
            self.logger.error(f"Database integrity check failed: {str(e)}")
            return False

    async def schedule_maintenance(self):
        while True:
            try:
                now = datetime.now()
                if now.hour == 2:
                    self.logger.info("Starting scheduled database maintenance")
                    with self.engine.connect() as conn:
                        conn.execute(text("SELECT maintain_database()"))
                        conn.commit()
                    self.logger.info("Database maintenance completed")
                
                # Verify integrity after maintenance
                if self.verify_integrity():
                    self.logger.info("Database integrity verified")
                else:
                    self.logger.error("Database integrity check failed")
                
                await asyncio.sleep(3600)
            except Exception as e:
                self.logger.error(f"Maintenance error: {str(e)}")
                await asyncio.sleep(300)
