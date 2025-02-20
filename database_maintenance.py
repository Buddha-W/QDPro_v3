
from sqlalchemy import create_engine, text
from datetime import datetime, timedelta
import asyncio
import logging

class DatabaseMaintenance:
    def __init__(self, db_url):
        self.engine = create_engine(db_url)
        self.logger = logging.getLogger(__name__)

    async def schedule_maintenance(self):
        while True:
            try:
                # Run maintenance during low-traffic hours (e.g., 2 AM)
                now = datetime.now()
                if now.hour == 2:
                    self.logger.info("Starting scheduled database maintenance")
                    with self.engine.connect() as conn:
                        conn.execute(text("SELECT maintain_database()"))
                        conn.commit()
                    self.logger.info("Database maintenance completed")
                
                # Wait for next check (every hour)
                await asyncio.sleep(3600)
            except Exception as e:
                self.logger.error(f"Maintenance error: {str(e)}")
                await asyncio.sleep(300)  # Retry in 5 minutes if error occurs
