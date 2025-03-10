import os
import psycopg2
import traceback
import logging
import json
from typing import List, Dict, Optional, Any
from datetime import datetime

from fastapi import FastAPI, Request, Depends, HTTPException, status, BackgroundTasks, Form
from fastapi.responses import JSONResponse, HTMLResponse, RedirectResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# For QD calculations (placeholders if qd_engine is not fully implemented)
try:
    from qd_engine import get_engine, QDParameters, MaterialProperties, EnvironmentalConditions
except ImportError:
    # Mock qd_engine for now if not available
    class MockQDEngine:
        def calculate_esqd(self, quantity, material_props, env_conditions, k_factor):
            return quantity * k_factor  # Dummy calculation
        def generate_k_factor_rings(self, center_lat, center_lon, safe_distance):
            return [{"type": "Feature", "geometry": {"type": "Point", "coordinates": [center_lon, center_lat]}}]
    def get_engine(site_type): return MockQDEngine()

logger = logging.getLogger(__name__)

app = FastAPI()

# Middleware & Setup
@app.middleware("http")
async def error_handling_middleware(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as e:
        logger.error(f"Unhandled error: {str(e)}\n{traceback.format_exc()}")
        return JSONResponse(status_code=500, content={"error": "Internal server error", "detail": str(e)})

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
)

DATA_DIR = os.path.join(os.path.expanduser('~'), "data")
os.makedirs(DATA_DIR, exist_ok=True)

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="static/templates")

# Root Endpoint
@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    return templates.TemplateResponse("site_plan.html", {"request": request})

# Save/Load Project
@app.post("/api/save")
async def save_project(data: dict):
    try:
        with open("data/layer_data.json", "w") as f:
            json.dump(data, f, indent=2)
        logger.info(f"Project saved successfully at {datetime.now().isoformat()}")
        return {"status": "success", "message": "Data saved successfully"}
    except Exception as e:
        logger.error(f"Error saving project: {str(e)}")
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/api/load")
async def load_project():
    try:
        with open("data/layer_data.json", "r") as f:
            data = json.load(f)
        logger.info(f"Project loaded successfully at {datetime.now().isoformat()}")
        return data
    except FileNotFoundError:
        default_data = {"features": []}
        with open("data/layer_data.json", "w") as f:
            json.dump(default_data, f, indent=2)
        return default_data
    except Exception as e:
        logger.error(f"Error loading project: {str(e)}")
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/api/db_status")
async def db_status():
    """Return the database connection status"""
    try:
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()
        cur.execute("SELECT version()")
        version = cur.fetchone()[0]
        cur.close()
        conn.close()
        return {
            "status": "connected",
            "type": "PostgreSQL",
            "version": version,
            "message": "Database connection successful"
        }
    except Exception as e:
        logger.error(f"Database connection error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "message": f"Database connection failed: {str(e)}"
            }
        )

@app.post("/api/unit-conversion")
async def unit_conversion(request: Request):
    """Convert between different explosive weight units"""
    try:
        data = await request.json()
        quantity = data.get("quantity", 0)
        from_unit = data.get("from_unit", "lbs")
        to_unit = data.get("to_unit", "kg")
        site_type = data.get("site_type", "DOD")

        # Initialize QD engine
        qd_engine = get_engine(site_type)

        # Convert to pounds first if not already
        quantity_lbs = qd_engine.convert_to_pounds(quantity, from_unit)

        # Then convert to target unit
        result = qd_engine.convert_from_pounds(quantity_lbs, to_unit)

        return {
            "original_value": quantity,
            "original_unit": from_unit,
            "converted_value": round(result, 6),
            "converted_unit": to_unit,
            "pounds_equivalent": round(quantity_lbs, 6)
        }
    except Exception as e:
        logger.error(f"Unit conversion error: {str(e)}")
        return JSONResponse(status_code=500, content={"error": str(e)})

# Layer Persistence Endpoints
@app.get("/api/load-layers")
async def load_layers(location_id: Optional[int] = None):
    try:
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()
        if location_id:
            cur.execute("SELECT layer_config FROM map_layers WHERE location_id = %s AND is_active = TRUE", (location_id,))
        else:
            cur.execute("SELECT layer_config FROM map_layers WHERE is_active = TRUE")
        rows = cur.fetchall()
        features = []
        for row in rows:
            layer_config = row[0]
            if layer_config and "features" in layer_config:
                features.extend(layer_config["features"])
        return {"layers": {"type": "FeatureCollection", "features": features}}
    except Exception as e:
        logger.error(f"Error loading layers: {str(e)}")
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        if 'cur' in locals(): cur.close()
        if 'conn' in locals(): conn.close()

@app.post("/api/update-feature")
async def update_feature(request: Request):
    try:
        data = await request.json()
        feature_id = data.get("feature_id")
        properties = data.get("properties", {})

        # Load the current data
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()

        # Find which layer contains this feature
        cur.execute("SELECT id, layer_config FROM map_layers WHERE is_active = TRUE")
        layers = cur.fetchall()

        updated = False
        for layer_id, layer_config in layers:
            if not layer_config or "features" not in layer_config:
                continue

            # Search for feature with matching ID
            for i, feature in enumerate(layer_config["features"]):
                if feature.get("id") == feature_id:
                    # Update the properties
                    layer_config["features"][i]["properties"] = properties

                    # Save the updated layer back to DB
                    cur.execute(
                        "UPDATE map_layers SET layer_config = %s WHERE id = %s",
                        (json.dumps(layer_config), layer_id)
                    )
                    conn.commit()
                    updated = True
                    break

            if updated:
                break

        if updated:
            return {"status": "success", "message": "Feature properties updated"}
        else:
            return JSONResponse(
                status_code=404, 
                content={"status": "error", "message": f"Feature with ID {feature_id} not found"}
            )

    except Exception as e:
        logger.error(f"Error updating feature: {str(e)}")
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        if 'cur' in locals(): cur.close()
        if 'conn' in locals(): conn.close()

@app.post("/api/save-layers")
async def save_layers(request: Request, location_id: Optional[int] = None):
    conn = None
    cur = None
    try:
        data = await request.json()
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()
        layer_name = data.get("layer_name", "Default")
        layer_config = {"type": "FeatureCollection", "features": data.get("features", [])}

        # First check if the proper constraint exists
        try:
            # Check if the map_layers_name_key constraint exists
            cur.execute("""
                SELECT constraint_name FROM information_schema.table_constraints
                WHERE table_name = 'map_layers' AND constraint_name = 'map_layers_name_key'
            """)

            if cur.fetchone():
                # Drop the simple name constraint and add composite constraint
                cur.execute("ALTER TABLE map_layers DROP CONSTRAINT map_layers_name_key")
                try:
                    cur.execute("""
                        ALTER TABLE map_layers ADD CONSTRAINT map_layers_name_location_key 
                        UNIQUE (name, location_id)
                    """)
                    conn.commit()
                except psycopg2.Error as e:
                    # Constraint might already exist or other issue
                    conn.rollback()
                    logger.warning(f"Couldn't add composite constraint: {str(e)}")
        except psycopg2.Error as e:
            conn.rollback()
            logger.warning(f"Error checking constraints: {str(e)}")

        # Save layer logic
        if location_id:
            # First, check if a layer with this name and location_id exists
            cur.execute("""
                SELECT id FROM map_layers 
                WHERE name = %s AND location_id = %s AND is_active = TRUE
            """, (layer_name, location_id))

            existing = cur.fetchone()

            if existing:
                # Update existing layer
                cur.execute("""
                    UPDATE map_layers SET layer_config = %s
                    WHERE id = %s
                    RETURNING id
                """, (json.dumps(layer_config), existing[0]))
                layer_id = existing[0]
            else:
                # Insert new layer
                cur.execute("""
                    INSERT INTO map_layers (name, layer_config, location_id, is_active)
                    VALUES (%s, %s, %s, TRUE)
                    RETURNING id
                """, (layer_name, json.dumps(layer_config), location_id))
                layer_id = cur.fetchone()[0]
        else:
            # Without location_id, just insert a new layer
            # For layers without location_id, add a random suffix to ensure uniqueness
            if location_id is None:
                import random
                unique_name = f"{layer_name}_{random.randint(1000, 9999)}"
                layer_name = unique_name

            cur.execute("""
                INSERT INTO map_layers (name, layer_config, is_active)
                VALUES (%s, %s, TRUE)
                RETURNING id
            """, (layer_name, json.dumps(layer_config)))
            layer_id = cur.fetchone()[0]

        conn.commit()
        return {"status": "success", "message": f"Layer '{layer_name}' saved to DB with ID {layer_id}"}

    except Exception as e:
        if conn:
            conn.rollback()  # Explicitly rollback on error
        logger.error(f"Error saving layers: {str(e)}")
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        if cur: 
            cur.close()
        if conn: 
            conn.close()

# Location Endpoints
@app.get("/api/locations")
async def get_locations(include_deleted: bool = False):
    try:
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()

        # Simplified approach - always get all locations
        try:
            # First attempt to query with deleted filter if appropriate
            if not include_deleted:
                cur.execute("SELECT id, location_name, created_at FROM locations WHERE deleted = FALSE")
            else:
                cur.execute("SELECT id, location_name, created_at FROM locations")

        except psycopg2.Error as e:
            # If error occurs (likely missing deleted column), fallback to simpler query
            logger.warning(f"Initial locations query failed: {str(e)}, falling back to simpler query")
            cur.execute("SELECT id, location_name, created_at FROM locations")

        rows = cur.fetchall()
        locations = [{"id": r[0], "name": r[1], "created_at": str(r[2])} for r in rows]
        return {"locations": locations}
    except Exception as e:
        logger.error(f"Database error in /api/locations: {str(e)}")
        return JSONResponse(status_code=500, content={"error": "Failed to fetch locations"})
    finally:
        if 'cur' in locals(): cur.close()
        if 'conn' in locals(): conn.close()

@app.post("/api/create_location")
async def create_location_api(request: Request):
    data = await request.json()
    location_name = data.get("location_name", "Untitled")
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO locations (location_name) VALUES (%s) RETURNING id, location_name",
            (location_name,)
        )
        row = cur.fetchone()
        conn.commit()
        return {"id": row[0], "name": row[1]}
    except Exception as e:
        logger.error(f"Error creating location: {str(e)}")
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        cur.close()
        conn.close()

@app.get("/api/load_location/{location_id}")
async def load_location(location_id: int):
    try:
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()

        # First check if location exists, with more relaxed constraints
        cur.execute("SELECT id, location_name FROM locations WHERE id = %s", (location_id,))
        row = cur.fetchone()

        if not row:
            logger.warning(f"Location {location_id} not found")
            return JSONResponse(status_code=404, content={"error": "Location not found"})

        location_name = row[1]
        logger.info(f"Loading location: {location_id} - {location_name}")

        # Get all layers associated with this location
        cur.execute("SELECT layer_config FROM map_layers WHERE location_id = %s AND is_active = TRUE", (location_id,))
        layers_data = cur.fetchall()

        # Process the layers
        features = []
        for layer_row in layers_data:
            if layer_row[0] and 'features' in layer_row[0]:
                features.extend(layer_row[0]['features'])

        facilities = []
        qdArcs = []
        analysis = []

        # Return with the location data
        return {
            "location_id": location_id, 
            "name": location_name,
            "layers": {
                "type": "FeatureCollection",
                "features": features
            },
            "facilities": facilities,
            "qdArcs": qdArcs, 
            "analysis": analysis
        }
    except Exception as e:
        logger.error(f"Error loading location: {str(e)}\n{traceback.format_exc()}")
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        if 'cur' in locals(): cur.close()
        if 'conn' in locals(): conn.close()

# QD Calculation Endpoint (unchanged for now)
class QDCalculationRequest(BaseModel):
    quantity: float
    lat: float
    lng: float
    k_factor: float = 40
    site_type: str = "DOD"
    material_type: str = "General Explosive"
    hazard_division: str = "1.1"
    k_factor_type: str = "IBD"
    unit_type: str = "lbs"
    sensitivity: float = 0.5
    det_velocity: float = 6000
    tnt_equiv: float = 1.0
    temperature: float = 298
    pressure: float = 101.325
    humidity: float = 50
    confinement_factor: float = 0.0
    include_fragments: bool = False
    risk_based: bool = False
    lop_class: str = None

@app.post("/api/calculate-qd", response_model=Dict[str, Any])
async def calculate_qd(request: QDCalculationRequest):
    try:
        qd_engine = get_engine(request.site_type)
        material_props = MaterialProperties(
            sensitivity=request.sensitivity,
            det_velocity=request.det_velocity,
            tnt_equiv=request.tnt_equiv
        )
        env_conditions = EnvironmentalConditions(
            temperature=request.temperature,
            pressure=request.pressure,
            humidity=request.humidity,
            confinement_factor=request.confinement_factor
        )

        # Create parameters for calculations
        params = QDParameters(
            quantity=request.quantity,
            site_type=request.site_type,
            unit_type=request.unit_type,
            k_factor_type=request.k_factor_type,
            hazard_division=request.hazard_division,
            material_props=material_props,
            env_conditions=env_conditions,
            risk_based=request.risk_based
        )

        # Calculate safe distance with detailed info
        qd_result = qd_engine.calculate_safe_distance(
            quantity=request.quantity,
            k_factor_type=request.k_factor_type,
            unit_type=request.unit_type,
            lop_class=request.lop_class,
            material_props=material_props,
            env_conditions=env_conditions,
            risk_based=request.risk_based
        )

        safe_distance = qd_result["distance_ft"]

        # Generate buffer zones
        buffer_zones = qd_engine.generate_k_factor_rings(
            center=[request.lng, request.lat],
            parameters=params
        )

        # Add fragment analysis if requested
        fragment_data = None
        if request.include_fragments:
            fragment_data = qd_engine.calculate_fragment_distance(
                quantity=request.quantity,
                unit_type=request.unit_type,
                material_type=request.material_type
            )

            # Add fragment distance ring to the buffer zones
            if fragment_data and "hazard_distance" in fragment_data:
                frag_distance = fragment_data["hazard_distance"]
                frag_ring = qd_engine._create_circle_feature(
                    center=[request.lng, request.lat],
                    radius=frag_distance,
                    k_factor=0,
                    label=f"Fragment Distance {frag_distance:.0f} ft",
                    description=f"Maximum Hazardous Fragment Distance",
                    qd_type="FRAG",
                    hazard_division=request.hazard_division
                )
                buffer_zones.append(frag_ring)

        # Prepare response
        response = {
            "safe_distance": safe_distance,
            "units": "feet",
            "material_type": request.material_type,
            "site_type": request.site_type,
            "k_factor_type": request.k_factor_type,
            "k_factor": qd_engine.get_k_factor(request.k_factor_type, request.lop_class),
            "calculation_details": qd_result["calculation_steps"],
            "standard_reference": qd_result["standard_reference"],
            "buffer_zones": {
                "type": "FeatureCollection",
                "features": buffer_zones
            }
        }

        # Add fragment data if available
        if fragment_data:
            response["fragment_analysis"] = fragment_data

        # Add risk analysis if available
        if request.risk_based and qd_result.get("risk_analysis"):
            response["risk_analysis"] = qd_result["risk_analysis"]

        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/calculate-fragments")
async def calculate_fragments(request: Request):
    """Calculate hazardous fragment distances"""
    try:
        data = await request.json()
        quantity = data.get("quantity", 0)
        unit_type = data.get("unit_type", "lbs")
        material_type = data.get("material_type", "Steel")
        casing_thickness = data.get("casing_thickness", 0.5)
        site_type = data.get("site_type", "DOD")

        # Initialize QD engine
        qd_engine = get_engine(site_type)

        # Calculate fragment distance
        result = qd_engine.calculate_fragment_distance(
            quantity=quantity,
            unit_type=unit_type,
            material_type=material_type,
            casing_thickness=casing_thickness
        )

        return result
    except Exception as e:
        logger.error(f"Fragment calculation error: {str(e)}")
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.post("/api/analyze-location")
async def analyze_location(request: Request):
    """Analyze a location using QD analysis for all facilities"""
    try:
        data = await request.json()
        location_id = data.get("location_id")
        features = data.get("features", [])
        site_type = data.get("site_type", "DOD")
        analysis_options = data.get("analysis_options", {})

        # Get analysis parameters
        use_risk_based = analysis_options.get("risk_based", False)
        include_fragments = analysis_options.get("include_fragments", False)
        k_factor_type = analysis_options.get("k_factor_type", "IBD")
        display_unit = analysis_options.get("display_unit", "lbs")
        include_standards = analysis_options.get("include_standards", True)

        # Initialize QD engine with specified site type
        qd_engine = get_engine(site_type)

        # Separate explosive facilities from other features
        facilities = []
        other_features = []

        for feature in features:
            properties = feature.get("properties", {})
            try:
                # Convert explosive weight safely with proper error handling
                new_value = properties.get("net_explosive_weight")
                if new_value is None or new_value == "":
                    new_value = 0
                elif isinstance(new_value, str):
                    new_value = float(new_value.strip() or 0)
                else:
                    new_value = float(new_value)
                
                # Consider any feature with explosive weight as a facility
                if properties and new_value > 0:
                    facilities.append(feature)
                else:
                    other_features.append(feature)
            except (ValueError, TypeError) as e:
                logger.warning(f"Feature has invalid NEW value: {str(e)}")
                # Add to other features if conversion fails
                other_features.append(feature)

        # Run analysis for each facility with improved logging
        logger.info(f"Starting QD analysis for {len(facilities)} facilities and {len(other_features)} other features")
        logger.info(f"Full feature count breakdown: Facilities={len(facilities)}, Other features={len(other_features)}, Total={len(features)}")
        
        # Log facility layer info for debugging
        layers_info = {}
        for facility in facilities:
            layer_name = facility.get("properties", {}).get("layerName", "unknown")
            if layer_name not in layers_info:
                layers_info[layer_name] = 0
            layers_info[layer_name] += 1
        
        logger.info(f"Facilities by layer: {layers_info}")
        
        results = []
        for facility in facilities:
            facility_id = facility.get('id', 'unknown')
            layer_name = facility.get("properties", {}).get("layerName", "unknown")
            logger.info(f"Analyzing facility ID: {facility_id} from layer: {layer_name}")
            properties = facility.get("properties", {})

            # Get explosive weight and unit
            try:
                new_value = float(properties.get("net_explosive_weight", 0))
                unit_type = properties.get("unit", "lbs")
                hazard_division = properties.get("hazard_division", "1.1")
                logger.info(f"Facility {facility_id} NEW: {new_value} {unit_type}")
            except (ValueError, TypeError) as e:
                logger.error(f"Invalid facility properties: {str(e)}")
                continue

            # Skip if NEW is 0
            if new_value <= 0:
                logger.warning(f"Skipping facility {facility_id} with NEW value of 0")
                continue

            # Create parameters object for QD calculations
            params = QDParameters(
                quantity=new_value,
                site_type=site_type,
                unit_type=unit_type,
                k_factor_type=k_factor_type,
                hazard_division=hazard_division,
                risk_based=use_risk_based
            )

            # Calculate safe distance with detailed information
            try:
                safe_distance_result = qd_engine.calculate_safe_distance(
                    quantity=new_value,
                    k_factor_type=k_factor_type,
                    unit_type=unit_type,
                    risk_based=use_risk_based
                )

                safe_distance = safe_distance_result["distance_ft"]
            except Exception as calc_error:
                logger.error(f"Safe distance calculation error: {str(calc_error)}")
                continue

            # Extract facility data and get centroid for QD rings
            try:
                # Use the new extract_facility_data method
                facility_data = qd_engine.extract_facility_data(facility)
                facility_centroid = facility_data["centroid"]

                # Generate QD rings from the centroid
                qd_rings = qd_engine.generate_k_factor_rings(
                    center=facility_centroid,
                    parameters=params,
                    k_factors=[1.0, 1.25, 1.5]
                )
            except Exception as e:
                logger.error(f"Error generating QD rings: {str(e)}\n{traceback.format_exc()}")
                qd_rings = []
                facility_centroid = [0, 0]

            # Calculate fragment distance if requested
            fragment_data = None
            if include_fragments:
                try:
                    fragment_data = qd_engine.calculate_fragment_distance(
                        quantity=new_value,
                        unit_type=unit_type
                    )

                    # Add a fragment distance ring
                    if fragment_data and "hazard_distance" in fragment_data:
                        frag_distance = fragment_data["hazard_distance"]
                        frag_ring = qd_engine._create_circle_feature(
                            center=facility_centroid,
                            radius=frag_distance,
                            k_factor=0,  # Not a K-factor based ring
                            label=f"Fragment Distance {frag_distance:.0f} ft",
                            description=f"Maximum Hazardous Fragment Distance",
                            qd_type="FRAG",
                            hazard_division=hazard_division
                        )
                        qd_rings.append(frag_ring)
                except Exception as frag_error:
                    logger.error(f"Error calculating fragmentation: {str(frag_error)}")
                    fragment_data = {"error": str(frag_error)}

            # Check for violations using enhanced analysis
            try:
                # Combine all features for analysis, excluding the current facility
                # Ensure we analyze against ALL other features from ALL layers
                all_analysis_features = other_features + [f for f in facilities if f.get('id') != facility.get('id')]
                
                facility_name = properties.get('name', 'unknown')
                logger.info(f"Analyzing facility {facility_name} (ID: {facility.get('id')}) against {len(all_analysis_features)} other features")
                
                # Print the first few surrounding features for debugging
                for i, feat in enumerate(all_analysis_features[:3]):
                    feat_name = feat.get("properties", {}).get("name", "unnamed")
                    feat_layer = feat.get("properties", {}).get("layerName", "unknown")
                    feat_id = feat.get("id", "unknown")
                    logger.info(f"Surrounding feature {i}: {feat_name} (ID: {feat_id}) from layer: {feat_layer}")
                
                # Log analysis parameters for debugging
                logger.info(f"Analysis parameters: k_factor_type={k_factor_type}, unit_type={unit_type}")
                logger.info(f"Facility explosives: {new_value} {unit_type}")
                
                # Force facility and all features to have IDs for proper identification
                if not facility.get("id"):
                    facility["id"] = f"facility_{hash(json.dumps(facility))}"
                
                for af in all_analysis_features:
                    if not af.get("id"):
                        af["id"] = f"feature_{hash(json.dumps(af))}"
                
                facility_analysis = qd_engine.analyze_facility(
                    facility=facility,
                    surrounding_features=all_analysis_features,
                    k_factor_type=k_factor_type,
                    unit_type=unit_type
                )
                
                # Log findings
                violations_count = len(facility_analysis.get("violations", []))
                logger.info(f"Analysis complete for {facility_name}: {violations_count} violations found")
                if violations_count > 0:
                    logger.info(f"Violations: {json.dumps(facility_analysis.get('violations', []), indent=2)}")
                
            except Exception as analysis_error:
                logger.error(f"Facility analysis error: {str(analysis_error)}\n{traceback.format_exc()}")
                facility_analysis = {"violations": [], "error": str(analysis_error)}

            # Get unit-converted values for display
            try:
                new_value_display = new_value
                if unit_type != display_unit:
                    # Convert to pounds first if not already
                    new_lbs = qd_engine.convert_to_pounds(new_value, unit_type)
                    # Then convert to display unit
                    new_value_display = qd_engine.convert_from_pounds(new_lbs, display_unit)
            except Exception as e:
                logger.error(f"Unit conversion error: {str(e)}")
                new_value_display = new_value

            # Add to results with enhanced information
            facility_result = {
                "facility_id": facility.get("id", "unknown"),
                "facility_name": properties.get("name", "Unnamed Facility"),
                "net_explosive_weight": new_value,
                "net_explosive_weight_display": round(new_value_display, 4),
                "unit_original": unit_type,
                "unit_display": display_unit,
                "hazard_division": hazard_division,
                "site_type": site_type,
                "safe_distance": round(safe_distance, 2),
                "k_factor_type": k_factor_type,
                "k_factor_value": qd_engine.get_k_factor(k_factor_type),
                "qd_rings": qd_rings,
                "facility_centroid": facility_centroid,
                "violations": facility_analysis.get("violations", []),
                "calculation_details": safe_distance_result["calculation_steps"] if include_standards else None,
                "standard_reference": safe_distance_result["standard_reference"] if include_standards else None
            }

            # Add fragment data if available
            if fragment_data:
                facility_result["fragment_analysis"] = fragment_data

            # Add risk analysis if available
            if use_risk_based and safe_distance_result.get("risk_analysis"):
                facility_result["risk_analysis"] = safe_distance_result["risk_analysis"]

            results.append(facility_result)

        # Generate a timestamp for the analysis
        timestamp = datetime.now().isoformat()

        # Compile the final analysis with standards information
        analysis_result = {
            "timestamp": timestamp,
            "location_id": location_id,
            "site_type": site_type,
            "k_factor_type": k_factor_type,
            "display_unit": display_unit,
            "total_facilities": len(facilities),
            "total_violations": sum(len(result.get("violations", [])) for result in results),
            "facilities_analyzed": results,
            "analysis_options": analysis_options,
            "features_analyzed": len(features)
        }

        # Add standards information if requested
        if include_standards:
            # Import the Standards class
            try:
                from standards_db import Standards, StandardType
                standards_info = Standards.get_all_references(site_type)
                analysis_result["standards_information"] = {
                    "site_type": site_type,
                    "references": standards_info
                }
            except ImportError:
                logger.warning("Standards database not available")

        # Add multiple units support information
        analysis_result["supported_units"] = {
            "g": "Grams",
            "kg": "Kilograms",
            "lbs": "Pounds",
            "NEQ": "NATO Net Explosive Quantity"
        }

        return analysis_result
    except Exception as e:
        logger.error(f"QD Analysis error: {str(e)}\n{traceback.format_exc()}")
        return JSONResponse(status_code=500, content={
            "error": str(e), 
            "message": "QD Analysis encountered an error. Please check that all features have valid geometries and properties."
        })

# Report Generation Endpoint
@app.post("/api/generate-report")
async def generate_report(request: Request):
    try:
        data = await request.json()
        report_data = data.get("report")
        map_snapshot = data.get("map_snapshot")

        # Import Report and generate_pdf_report
        from reports import Report, generate_pdf_report
        from datetime import datetime

        # Create a Report object
        report = Report(
            title=report_data.get("title", "QD Analysis Report"),
            generated_at=datetime.fromisoformat(report_data.get("generated_at")),
            data=report_data.get("data", {})
        )

        # Ensure reports directory exists
        os.makedirs("data/reports", exist_ok=True)

        # Generate filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"data/reports/qd_analysis_{timestamp}.pdf"

        # Generate the PDF
        result = await generate_pdf_report(report, filename, map_snapshot)

        # Setup a static route for the reports directory if it doesn't exist
        if not any(route.path == "/reports" for route in app.routes):
            app.mount("/reports", StaticFiles(directory="data/reports"), name="reports")

        return result
    except Exception as e:
        logger.error(f"Report generation error: {str(e)}\n{traceback.format_exc()}")
        return JSONResponse(status_code=500, content={"error": str(e)})

# Database Initialization
def init_db():
    db_url = os.environ.get('DATABASE_URL', "postgresql://postgres:postgres@localhost:5432/postgres")
    print(f"Using DB: {db_url}")
    try:
        conn = psycopg2.connect(db_url)
        conn.autocommit = True  # Ensure autocommit is on
        cur = conn.cursor()

        # Check if locations table exists
        cur.execute("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'locations')")
        locations_exists = cur.fetchone()[0]

        if not locations_exists:
            # Create locations table if it doesn't exist
            cur.execute("""
                CREATE TABLE locations (
                    id SERIAL PRIMARY KEY,
                    location_name VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    deleted BOOLEAN DEFAULT FALSE,
                    deleted_at TIMESTAMP WITH TIME ZONE
                )
            """)
            print("Created locations table")
        else:
            # Add 'deleted' column if it doesn't exist
            cur.execute("SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'locations' AND column_name = 'deleted')")
            deleted_exists = cur.fetchone()[0]
            if not deleted_exists:
                cur.execute("ALTER TABLE locations ADD COLUMN deleted BOOLEAN DEFAULT FALSE")
                cur.execute("ALTER TABLE locations ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE")
                print("Added deleted columns to locations table")

        # Check if map_layers table exists
        cur.execute("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'map_layers')")
        map_layers_exists = cur.fetchone()[0]

        if not map_layers_exists:
            # Create map_layers table if it doesn't exist
            cur.execute("""
                CREATE TABLE map_layers (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    layer_config JSONB,
                    location_id INTEGER,
                    is_active BOOLEAN DEFAULT TRUE
                )
            """)
            print("Created map_layers table")
        else:
            # Check if location_id column exists and add if it doesn't
            cur.execute("SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'map_layers' AND column_name = 'location_id')")
            location_id_exists = cur.fetchone()[0]
            if not location_id_exists:
                cur.execute("ALTER TABLE map_layers ADD COLUMN location_id INTEGER")
                print("Added location_id column to map_layers table")

        # Force run db init now - drop and recreate tables if needed
        if map_layers_exists:
            try:
                # Test a query to make sure the schema is correct
                cur.execute("INSERT INTO map_layers (name, layer_config, location_id, is_active) VALUES ('test', '{}'::jsonb, 1, TRUE) RETURNING id")
                test_id = cur.fetchone()[0]
                cur.execute("DELETE FROM map_layers WHERE id = %s", (test_id,))

                # Check for and drop the single-column name constraint if it exists
                cur.execute("""
                    SELECT constraint_name FROM information_schema.table_constraints
                    WHERE table_name = 'map_layers' AND constraint_name = 'map_layers_name_key'
                """)

                if cur.fetchone():
                    try:
                        cur.execute("ALTER TABLE map_layers DROP CONSTRAINT map_layers_name_key")
                        print("Dropped simple name constraint")
                    except psycopg2.Error as e:
                        print(f"Error dropping constraint: {e}")
                        conn.rollback()

                # Check if there's a unique constraint for (name, location_id)
                cur.execute("""
                    SELECT COUNT(*) FROM pg_constraint 
                    WHERE conname = 'map_layers_name_location_key'
                """)
                has_constraint = cur.fetchone()[0] > 0

                if not has_constraint:
                    try:
                        # Add a composite unique constraint if it doesn't exist
                        cur.execute("""
                            ALTER TABLE map_layers 
                            ADD CONSTRAINT map_layers_name_location_key 
                            UNIQUE (name, location_id)
                        """)
                        print("Added unique constraint for name and location_id")
                    except psycopg2.Error as constraint_error:
                        conn.rollback()
                        print(f"Could not add constraint: {constraint_error}")

                print("Map layers table structure is valid")
            except psycopg2.Error as e:
                print(f"Map layers table structure issue detected: {e}")
                # Drop and recreate the table if there's an error with its structure
                cur.execute("DROP TABLE map_layers")
                conn.commit()
                cur.execute("""
                    CREATE TABLE map_layers (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR(255) NOT NULL,
                        layer_config JSONB,
                        location_id INTEGER,
                        is_active BOOLEAN DEFAULT TRUE,
                        UNIQUE (name, location_id)
                    )
                """)
                print("Recreated map_layers table with correct structure")

        conn.commit()
        print("Database initialized successfully")
    except Exception as e:
        print(f"Error initializing DB: {e}")
        traceback.print_exc()
    finally:
        if 'cur' in locals(): cur.close()
        if 'conn' in locals(): conn.close()

if __name__ == "__main__":
    init_db()
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True, access_log=True)