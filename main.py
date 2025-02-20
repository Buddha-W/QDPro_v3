from fastapi import FastAPI, HTTPException, Depends, Request, UploadFile
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from reports import generate_facility_report, generate_safety_analysis
from auth import get_current_user, create_access_token, User
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine
from geoalchemy2 import functions as gfunc
from shapely.geometry import Point, Polygon
from typing import List, Optional
import uvicorn
from pydantic import BaseModel
import os
import secrets
from audit import log_activity # Added import for logging
from datetime import datetime, timedelta, timezone
import sys

app = FastAPI(
    title="QDPro",
    description="Advanced GIS System for DoD/DoE Facilities",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.gzip import GZipMiddleware
import re

app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])
app.add_middleware(GZipMiddleware, minimum_size=1000)

@app.middleware("http")
async def security_middleware(request: Request, call_next):
    request_id = secrets.token_hex(16)
    request.state.request_id = request_id

    # Handle device detection
    user_agent = request.headers.get("user-agent", "").lower()
    is_mobile = "mobile" in user_agent or "ipad" in user_agent or "iphone" in user_agent
    request.state.is_mobile = is_mobile

    # Adjust response based on device
    if is_mobile:
        request.state.session_duration = timedelta(days=30)  # Longer sessions for mobile
    else:
        request.state.session_duration = timedelta(minutes=15)

    # Log incoming request
    log_activity(
        user_id=request.headers.get("X-User-ID", "anonymous"),
        action="REQUEST",
        resource=str(request.url),
        status="INITIATED",
        details={"request_id": request_id, "method": request.method}
    )

    response = await call_next(request)

    # Enhanced security headers
    response.headers.update({
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
        "Cache-Control": "no-store, max-age=0",
        "Content-Security-Policy": "default-src 'self'; script-src 'self'; object-src 'none'",
        "X-XSS-Protection": "1; mode=block",
        "X-Request-ID": request_id,
        "X-Permitted-Cross-Domain-Policies": "none",
        "Referrer-Policy": "strict-origin-when-cross-origin"
    })

    # Log response
    log_activity(
        user_id=request.headers.get("X-User-ID", "anonymous"),
        action="REQUEST",
        resource=str(request.url),
        status="COMPLETED",
        details={"request_id": request_id, "status_code": response.status_code}
    )

    return response

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database connection with connection pooling
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/qdpro")
engine = create_engine(
    DATABASE_URL,
    pool_size=5,
    max_overflow=10,
    pool_timeout=30,
    pool_recycle=1800
)

# Models
class FacilityBase(BaseModel):
    facility_number: str
    description: str
    category_code: str
    latitude: float
    longitude: float

class ExplosiveSiteBase(BaseModel):
    facility_id: int
    net_explosive_weight: float
    k_factor: float = 50.0
    hazard_type: str

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@app.get("/")
async def root():
    return {"message": "QDPro GIS System API"}

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    # Log the error
    log_activity(
        user_id=request.headers.get("X-User-ID", "anonymous"),
        action="ERROR",
        resource=str(request.url),
        status="FAILED",
        details={"error": exc.detail, "status_code": exc.status_code}
    )
    
    # Attempt recovery for known error conditions
    if exc.status_code == 503:  # Service Unavailable
        try:
            # Attempt to restart necessary services
            deployment_mgr.restart_services()
            return {"detail": "Service recovered", "status_code": 200}
        except Exception as e:
            pass
            
    return {"detail": exc.detail, "status_code": exc.status_code, "recovery_attempted": True}

@app.post("/facilities/")
async def create_facility(facility: FacilityBase):
    # Validate coordinates
    if not (-90 <= facility.latitude <= 90) or not (-180 <= facility.longitude <= 180):
        raise HTTPException(status_code=400, detail="Invalid coordinates")
        
    # Validate facility number format
    if not re.match(r'^[A-Z0-9]{3,10}$', facility.facility_number):
        raise HTTPException(status_code=400, detail="Invalid facility number format")
        
    point = Point(facility.longitude, facility.latitude)
    query = """
        INSERT INTO facilities (facility_number, description, category_code, location)
        VALUES (%s, %s, %s, ST_SetSRID(ST_GeomFromText(%s), 4326))
        RETURNING id
    """
    with engine.connect() as conn:
        result = conn.execute(
            query,
            (facility.facility_number, facility.description, facility.category_code, point.wkt)
        )
        return {"id": result.fetchone()[0]}

@app.post("/explosive-sites/")
async def create_explosive_site(site: ExplosiveSiteBase):
    query = """
        INSERT INTO explosive_sites 
        (facility_id, net_explosive_weight, k_factor, hazard_type)
        VALUES (%s, %s, %s, %s)
        RETURNING id
    """
    with engine.connect() as conn:
        result = conn.execute(
            query,
            (site.facility_id, site.net_explosive_weight, site.k_factor, site.hazard_type)
        )
        return {"id": result.fetchone()[0]}

@app.get("/calculate-esqd/{site_id}")
async def calculate_esqd(site_id: int):
    """Calculate ESQD arc for an explosive site"""
    query = """
    WITH site_data AS (
        SELECT 
            es.id,
            es.net_explosive_weight,
            es.k_factor,
            f.location
        FROM explosive_sites es
        JOIN facilities f ON es.facility_id = f.id
        WHERE es.id = %s
    )
    SELECT 
        id,
        ST_AsGeoJSON(
            ST_Buffer(
                location::geography, 
                (net_explosive_weight ^ (1.0/3.0)) * k_factor
            )::geometry
        ) as arc
    FROM site_data
    """
    with engine.connect() as conn:
        result = conn.execute(query, (site_id,))
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Site not found")
        return {
            "site_id": row[0],
            "esqd_arc": row[1]
        }

app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/", response_class=HTMLResponse)
async def serve_frontend():
    with open("static/index.html") as f:
        return HTMLResponse(content=f.read())

@app.get("/reports/facilities")
async def get_facility_report(current_user: str = Depends(get_current_user)):
    return await generate_facility_report(engine)

@app.get("/reports/safety")
async def get_safety_analysis(current_user: str = Depends(get_current_user)):
    return await generate_safety_analysis(engine)

@app.get("/analysis/pes/{pes_id}/exposed-sites")
async def analyze_exposed_sites(pes_id: int, current_user: str = Depends(get_current_user)):
    """Get all exposed sites for a PES"""
    try:
        analysis = ExplosionAnalysis(engine)
        return await analysis.analyze_pes_to_es(pes_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/analysis/pes/{pes_id}/safety-arc")
async def get_safety_arc(pes_id: int, current_user: str = Depends(get_current_user)):
    """Get safety arc for a PES"""
    try:
        analysis = ExplosionAnalysis(engine)
        return await analysis.generate_safety_arc(pes_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class DatabaseImporter:
    def __init__(self, database_url):
        self.database_url = database_url
        # Add any database-specific initialization here

    def process_file(self, file_path, file_type):
        # Add file processing logic here based on file_type
        pass


class AccessImporter(DatabaseImporter):
    def process_essbackup(self, file_path):
        try:
            # Add logic to read and process .essbackup file here.  This will likely
            # involve using a library to read the .essbackup format, then transforming
            # the data into a format suitable for insertion into the PostgreSQL database.
            # Replace this with actual implementation.
            print(f"Processing {file_path}...")
            return True # Placeholder - Replace with actual success/failure check
        except Exception as e:
            print(f"Error processing .essbackup file: {e}")
            return False


@app.post("/import/database")
async def import_database(file: UploadFile):
    """Import data from various file formats including .essbackup"""
    temp_path = f"temp_{file.filename}"
    try:
        with open(temp_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        importer = DatabaseImporter(DATABASE_URL)
        file_ext = file.filename.split('.')[-1].lower()

        if file_ext == 'essbackup':
            access_importer = AccessImporter(DATABASE_URL)
            success = access_importer.process_essbackup(temp_path)
            if success:
                return {"message": "Legacy database import successful"}
            else:
                raise HTTPException(status_code=400, detail="Import failed")
        elif file_ext == 'csv':
            # Add CSV import logic here
            pass
        else:
            raise HTTPException(status_code=400, detail="Unsupported file type")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred during import: {e}")
    finally:
        try:
            os.remove(temp_path)
        except FileNotFoundError:
            pass


if __name__ == "__main__":
    # Initialize database maintenance
    from database_maintenance import DatabaseMaintenance
    db_maintenance = DatabaseMaintenance(DATABASE_URL)
    asyncio.create_task(db_maintenance.schedule_maintenance())
    
    # Initialize deployment and offline sync managers
    from deployment_manager import DeploymentManager
    from offline_sync import OfflineSyncManager

    deployment_mgr = DeploymentManager()
    offline_sync = OfflineSyncManager()

    # Check for air-gapped mode
    air_gapped = os.getenv("AIR_GAPPED", "false").lower() == "true"
    if air_gapped:
        deployment_mgr.enable_offline_mode()

    if not deployment_mgr.validate_environment():
        print("Missing required environment variables")
        sys.exit(1)

    config = deployment_mgr.configure_deployment()

    # Initialize security controls
    from system_hardening import SystemHardening
    from crypto_validation import CryptoValidator
    from fedramp_compliance import FedRAMPControls
    from license_control import LicenseManager
    from anti_tampering import AntiTampering
    from license_recovery import LicenseRecovery
    from threat_detection import ThreatDetection

    # Initialize additional security systems
    license_recovery = LicenseRecovery()
    threat_detector = ThreatDetection()

    # Schedule threat detection
    def check_threats():
        threats = threat_detector.analyze_logs()
        for threat in threats:
            log_activity(
                user_id="SYSTEM",
                action="THREAT_DETECTED",
                resource="system",
                status="ALERT",
                details=threat
            )

    import threading
    threat_check = threading.Timer(900.0, check_threats)  # Check every 15 minutes
    threat_check.start()

    # Initialize protection systems
    license_manager = LicenseManager()
    if not license_manager.validate_license(os.getenv("LICENSE_KEY"))["valid"]:
        print("Invalid license")
        sys.exit(1)

    anti_tampering = AntiTampering()
    anti_tampering.initialize_protection()

    fedramp = FedRAMPControls()
    fedramp_status = fedramp.validate_compliance()

    hardening = SystemHardening()
    crypto = CryptoValidator()

    # Enforce security controls before starting
    hardening.enforce_security_controls()

    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True)

class ImportProgress(BaseModel):
    status: str
    progress: float
    message: str

import_status = {}

@app.get("/import/status/{import_id}")
async def get_import_status(import_id: str):
    if import_id not in import_status:
        raise HTTPException(status_code=404, detail="Import job not found")
    return import_status[import_id]

@app.get("/export/{format}/{table}")
async def export_table(format: str, table: str):
    try:
        export_id = secrets.token_hex(16)
        exporter = DatabaseExporter(DATABASE_URL)
        file_path = f"temp_export_{table}.{format}"
        
        # Initialize progress tracking
        import_status[export_id] = {
            'status': 'starting',
            'progress': 0.0,
            'message': 'Initializing export'
        }
        
        if format == 'csv':
            exporter.export_to_csv(table, file_path)
        elif format == 'json':
            exporter.export_to_json(table, file_path)
        elif format == 'legacy':
            exporter.export_to_legacy(file_path)
        else:
            raise HTTPException(status_code=400, detail="Unsupported format")
            
        return FileResponse(file_path)
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)
