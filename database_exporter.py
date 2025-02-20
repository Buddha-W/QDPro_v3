
import json
import csv
import xml.etree.ElementTree as ET
from sqlalchemy import create_engine, text
import pandas as pd

class DatabaseExporter:
    def __init__(self, connection_string: str):
        self.engine = create_engine(connection_string)
        
    def export_to_csv(self, table_name: str, file_path: str):
        """Export table data to CSV"""
        query = f"SELECT * FROM {table_name}"
        df = pd.read_sql(query, self.engine)
        df.to_csv(file_path, index=False)
        
    def export_to_json(self, table_name: str, file_path: str):
        """Export table data to JSON"""
        query = f"SELECT * FROM {table_name}"
        df = pd.read_sql(query, self.engine)
        df.to_json(file_path, orient='records')
        
    def export_to_legacy(self, file_path: str):
        """Export database in legacy-compatible format"""
        tables = ['facilities', 'explosive_sites']
        data = {}
        
        for table in tables:
            query = f"SELECT * FROM {table}"
            df = pd.read_sql(query, self.engine)
            data[table] = df.to_dict(orient='records')
            
        with open(file_path, 'w') as f:
            json.dump(data, f)
