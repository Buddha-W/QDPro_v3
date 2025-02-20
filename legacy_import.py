import os
import pyodbc
import json
import shutil
import tempfile
from zipfile import ZipFile
from database_importer import DatabaseImporter

class AccessImporter:
    def __init__(self, connection_string: str):
        self.db_importer = DatabaseImporter(connection_string)

    def process_essbackup(self, backup_file: str) -> bool:
        temp_dir = tempfile.mkdtemp()
        try:
            # Extract .essbackup (which is typically a zip file containing .mdb)
            with ZipFile(backup_file, 'r') as zip_ref:
                zip_ref.extractall(temp_dir)

            # Find the .mdb file
            mdb_file = None
            for file in os.listdir(temp_dir):
                if file.endswith('.mdb'):
                    mdb_file = os.path.join(temp_dir, file)
                    break

            if not mdb_file:
                raise Exception("No .mdb file found in backup")

            # Basic file size check (simplified file integrity check)
            if os.path.getsize(mdb_file) < 100:
                raise ValueError("File size too small, potential corruption")


            # Connect to Access database
            conn_str = f'DRIVER={{Microsoft Access Driver (*.mdb)}};DBQ={mdb_file};'
            conn = pyodbc.connect(conn_str)
            cursor = conn.cursor()

            # Map tables
            table_mappings = {
                'Facilities': {
                    'table': 'facilities',
                    'columns': {
                        'FacilityID': 'facility_number',
                        'Description': 'description',
                        'CategoryCode': 'category_code',
                        'Lat': 'latitude',
                        'Long': 'longitude'
                    }
                },
                'ExplosiveSites': {
                    'table': 'explosive_sites',
                    'columns': {
                        'SiteID': 'id',
                        'FacilityID': 'facility_id',
                        'NEWWeight': 'net_explosive_weight',
                        'KFactor': 'k_factor',
                        'HazardType': 'hazard_type'
                    }
                }
            }

            # Validate database structure
            def validate_table_structure(cursor, table_name, required_columns):
                try:
                    cursor.execute(f'SELECT * FROM {table_name} WHERE 1=0')
                    columns = set(column[0] for column in cursor.description)
                    return all(col in columns for col in required_columns)
                except pyodbc.Error:
                    return False

            # Import each table with validation and progress tracking
            total_tables = len(table_mappings)
            for idx, (old_table, mapping) in enumerate(table_mappings.items(), 1):
                
                if not validate_table_structure(cursor, old_table, mapping['columns'].keys()):
                    raise ValueError(f"Invalid table structure for {old_table}")

                cursor.execute(f'SELECT * FROM {old_table}')
                rows = cursor.fetchall()
                columns = [column[0] for column in cursor.description]

                data = []
                for row in rows:
                    row_dict = {}
                    for i, col in enumerate(columns):
                        if col in mapping['columns']:
                            row_dict[mapping['columns'][col]] = row[i]
                    data.append(row_dict)

                # Import to new database
                self.db_importer.import_from_json(
                    json.dumps(data),
                    mapping['table'],
                    mapping['columns']
                )

            return True

        finally:
            shutil.rmtree(temp_dir)