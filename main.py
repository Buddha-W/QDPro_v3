from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
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

from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

app = FastAPI(
    title="QDPro",
    description="Advanced GIS System for DoD/DoE Facilities",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")
templates = Jinja2Templates(directory=str(BASE_DIR / "static" / "templates"))

@app.get("/")
async def root(request: Request):
    return templates.TemplateResponse("site_plan.html", {"request": request})

from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.gzip import GZipMiddleware
import re

app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])
app.add_middleware(GZipMiddleware, minimum_size=1000)

rate_limiter = RateLimiter()
usage_monitor = UsageMonitor()

@app.middleware("http")
async def security_middleware(request: Request, call_next):
    start_time = datetime.now()
    user_id = request.headers.get("X-User-ID", "anonymous")
    
    if not rate_limiter.check_limit(user_id, "API_CALLS"):
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
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
DATABASE_URL = os.getenv("DATABASE_URL")
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

@app.get("/api/system/status")
async def system_status():
    """Get detailed system status"""
    checker = DeploymentChecker()
    check_results = checker.run_pre_deployment_checks()
    
    monitor = UsageMonitor()
    metrics = monitor.get_system_metrics()
    
    return {
        "database": check_results["database"],
        "security": check_results["security"],
        "compliance": check_results["compliance"],
        "performance": metrics
    }

@app.get("/health")
async def health_check():
    """Comprehensive health check endpoint"""
    try:
        # Check critical systems
        db_status = await DatabaseMaintenance(DATABASE_URL).quick_health_check()
        map_status = await MapService().verify_services()
        cache_status = await usage_monitor.verify_cache()
        security_status = await SystemHardening().verify_status()
        
        overall_health = all([
            db_status["healthy"],
            map_status["healthy"],
            cache_status["healthy"],
            security_status["healthy"]
        ])
        
        return {
            "status": "healthy" if overall_health else "degraded",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "components": {
                "database": db_status,
                "map_services": map_status,
                "cache": cache_status,
                "security": security_status
            },
            "version": "1.0.0"
        }
    except Exception as e:
        log_activity(
            user_id="SYSTEM",
            action="HEALTH_CHECK",
            status="ERROR",
            details={"error": str(e)}
        )
        return {"status": "error", "message": "Health check failed"}
    """Enhanced health check with database status"""
    try:
        system_health = usage_monitor.get_system_health()
        crypto_status = crypto.validate_crypto_operations({"test": "data"})
        
        # Check database connectivity and version
        with engine.connect() as conn:
            db_version = conn.execute(text("SELECT version()")).scalar()
            conn.execute(text("SELECT 1"))  # Basic connectivity test
            
            # Get database size and activity
            db_stats = conn.execute(text("""
                SELECT 
                    pg_size_pretty(pg_database_size(current_database())) as db_size,
                    count(*) as active_connections
                FROM pg_stat_activity
                WHERE datname = current_database()
            """)).fetchone()
            
        return {
            "status": "healthy",
            "version": "1.0.0",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "database": {
                "status": "connected",
                "version": db_version,
                "size": db_stats[0],
                "active_connections": db_stats[1]
            },
            "metrics": system_health["metrics"],
            "crypto_status": "operational" if crypto_status else "failed",
            "security_status": anti_tampering._verify_system_integrity({})
        }
    except Exception as e:
        return {
            "status": "degraded",
            "error": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    system_health = usage_monitor.get_system_health()
    crypto_status = crypto.validate_crypto_operations({"test": "data"})
    
    return {
        "status": system_health["status"],
        "version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "metrics": system_health["metrics"],
        "crypto_status": "operational" if crypto_status else "failed",
        "security_status": anti_tampering._verify_system_integrity({})
    }

@app.get("/")
async def root():
    return {"message": "QDPro GIS System API"}

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    # Enhanced error handling with user-friendly messages
    error_messages = {
        401: "Your session has expired. Please log in again.",
        403: "You don't have permission to access this resource.",
        404: "The requested resource was not found.",
        429: "Too many requests. Please try again in a few minutes.",
        500: "An unexpected error occurred. Our team has been notified.",
        503: "The system is temporarily unavailable. Please try again shortly."
    }
    
    user_message = error_messages.get(exc.status_code, exc.detail)
    
    # Log the error
    log_activity(
        user_id=request.headers.get("X-User-ID", "anonymous"),
        action="ERROR",
        resource=str(request.url),
        status="FAILED",
        details={
            "error": exc.detail,
            "status_code": exc.status_code,
            "user_message": user_message,
            "request_id": request.state.request_id
        }
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": "error",
            "message": user_message,
            "request_id": request.state.request_id,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
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
    """Create a new facility with enhanced feedback"""
    try:
        # Validate coordinates
        if not (-90 <= facility.latitude <= 90) or not (-180 <= facility.longitude <= 180):
            return JSONResponse(
                status_code=400,
                content={
                    "status": "error",
                    "message": "Invalid coordinates",
                    "details": "Latitude must be between -90 and 90, longitude between -180 and 180"
                }
            )
            
        point = Point(facility.longitude, facility.latitude)
        query = """
            INSERT INTO facilities (facility_number, description, category_code, location)
            VALUES (%s, %s, %s, ST_SetSRID(ST_GeomFromText(%s), 4326))
            RETURNING id, facility_number
        """
        
        with engine.connect() as conn:
            result = conn.execute(
                query,
                (facility.facility_number, facility.description, facility.category_code, point.wkt)
            )
            new_id, facility_number = result.fetchone()
            
            return JSONResponse(
                status_code=201,
                content={
                    "status": "success",
                    "message": f"Facility {facility_number} created successfully",
                    "id": new_id,
                    "facility_number": facility_number,
                    "timestamp": datetime.now().isoformat()
                }
            )
    except Exception as e:
        log_activity(
            user_id="system",
            action="CREATE_FACILITY",
            status="ERROR",
            details={"error": str(e)}
        )
        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "message": "Failed to create facility",
                "error_code": "DB_ERROR",
                "timestamp": datetime.now().isoformat()
            }
        )
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

from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="static/templates")

@app.get("/")
async def serve_frontend(request: Request):
    return templates.TemplateResponse("site_plan.html", {"request": request})

@app.get("/reports/facilities")
async def get_facility_report(current_user: str = Depends(get_current_user)):
    return await generate_facility_report(engine)

@app.get("/reports/safety")
async def get_safety_analysis(current_user: str = Depends(get_current_user)):
    return await generate_safety_analysis(engine)

@app.post("/site-plan/submit/{site_id}")
async def submit_site_plan(
    site_id: int,
    site_data: Dict[str, Any],
    current_user: str = Depends(get_current_user)
):
    validator = MapDataValidator()
    validation_result = validator.validate_site_plan(site_data)
    
    if not validation_result["overall_valid"]:
        raise HTTPException(status_code=400, detail=validation_result)
        
    # Update site plan status
    query = """
    UPDATE explosive_sites 
    SET approval_status = 'pending_review',
        submission_date = CURRENT_TIMESTAMP,
        submitted_by = :user
    WHERE id = :site_id
    RETURNING id
    """
    
    with engine.connect() as conn:
        result = conn.execute(
            text(query),
            {"site_id": site_id, "user": current_user}
        )
        if not result.rowcount:
            raise HTTPException(status_code=404, detail="Site not found")
            
    return {"status": "submitted", "validation": validation_result}

@app.get("/site-plan/{site_id}")
async def get_site_plan(
    site_id: int,
    format: str = None,
    current_user: str = Depends(get_current_user)
):
    report = await generate_site_plan_report(engine, site_id)
    if format == "print":
        return templates.TemplateResponse(
            "print_layout.html",
            {"request": request, "report": report}
        )
    return report

@app.post("/batch-analysis")
async def batch_analysis(
    site_ids: List[int],
    current_user: str = Depends(get_current_user)
):
    analysis = ExplosionAnalysis(engine)
    return await analysis.batch_analyze_sites(site_ids)

@app.get("/compliance-check/{site_id}")
async def check_site_compliance(
    site_id: int,
    current_user: str = Depends(get_current_user)
):
    site_data = await get_site_data(site_id)
    checker = ComplianceChecker()
    return checker.check_compliance(site_data)

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


from feedback_system import FeedbackSystem, Feedback

feedback_system = FeedbackSystem()

@app.post("/feedback/submit")
async def submit_feedback(
    feedback_data: dict,
    current_user: str = Depends(get_current_user)
):
    """Submit user feedback"""
    try:
        feedback = feedback_system.submit_feedback(feedback_data, current_user)
        return {
            "status": "success",
            "feedback_id": feedback.id,
            "message": "Feedback submitted successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/feedback/list")
async def list_feedback(current_user: str = Depends(get_current_user)):
    """Get all feedback"""
    try:
        return feedback_system.get_all_feedback()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/feedback/{feedback_id}/status")
async def update_feedback_status(
    feedback_id: str,
    status: str,
    current_user: str = Depends(get_current_user)
):
    """Update feedback status (admin only)"""
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    success = feedback_system.update_feedback_status(feedback_id, status)
    if not success:
        raise HTTPException(status_code=404, detail="Feedback not found")
    
    return {"status": "success", "message": "Feedback status updated"}

if __name__ == "__main__":
    print("Starting QDPro server on http://0.0.0.0:8080")
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
    
    if not all(check_results.values()):
        print("Pre-deployment checks failed:")
        for check, result in check_results.items():
            if not result:
                print(f"- {check} check failed")
        sys.exit(1)
    
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
