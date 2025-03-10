
import logging
import json
from qd_engine import get_engine, SiteType, UnitType, KFactorType

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_basic_calculation():
    """Test basic QD calculation functionality"""
    try:
        # Get QD engine instance
        engine = get_engine("DOD")
        
        # Test basic calculation
        result = engine.calculate_safe_distance(
            quantity=1000,
            k_factor_type=KFactorType.IBD.value,
            unit_type=UnitType.POUNDS.value
        )
        
        logger.info(f"Calculation result: {json.dumps(result, indent=2)}")
        
        # Test k-factor ring generation
        from dataclasses import dataclass
        
        @dataclass
        class TestParams:
            quantity: float = 1000
            site_type: str = SiteType.DOD.value
            unit_type: str = UnitType.POUNDS.value
            k_factor_type: str = KFactorType.IBD.value
            hazard_division: str = "1.1"
        
        rings = engine.generate_k_factor_rings(
            center=[-98.5795, 39.8283],  # [lng, lat]
            parameters=TestParams()
        )
        
        logger.info(f"Generated {len(rings)} QD rings")
        
        return True
    except Exception as e:
        logger.error(f"Test failed: {str(e)}")
        return False

def test_fragment_calculation():
    """Test fragment distance calculation"""
    try:
        engine = get_engine("DOD")
        
        result = engine.calculate_fragment_distance(
            quantity=1000,
            unit_type=UnitType.POUNDS.value,
            material_type="Steel"
        )
        
        logger.info(f"Fragment calculation result: {json.dumps(result, indent=2)}")
        return True
    except Exception as e:
        logger.error(f"Fragment test failed: {str(e)}")
        return False

def test_facility_analysis():
    """Test facility analysis functionality"""
    try:
        engine = get_engine("DOD")
        
        # Create test facility
        facility = {
            "id": "test-facility-1",
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [-98.5795, 39.8283]
            },
            "properties": {
                "name": "Test Explosive Facility",
                "type": "Storage",
                "net_explosive_weight": 1000,
                "unit": "lbs",
                "hazard_division": "1.1"
            }
        }
        
        # Create test surrounding features
        surrounding_features = [
            {
                "id": "test-feature-1",
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [-98.5795, 39.8383]  # 0.01 degree north
                },
                "properties": {
                    "name": "Nearby Building",
                    "type": "Building"
                }
            }
        ]
        
        # Run analysis
        result = engine.analyze_facility(
            facility=facility,
            surrounding_features=surrounding_features,
            k_factor_type=KFactorType.IBD.value
        )
        
        logger.info(f"Facility analysis result: {json.dumps(result, indent=2)}")
        return True
    except Exception as e:
        logger.error(f"Facility analysis test failed: {str(e)}")
        return False

if __name__ == "__main__":
    logger.info("Starting QD engine tests")
    
    tests = [
        ("Basic calculation", test_basic_calculation),
        ("Fragment calculation", test_fragment_calculation),
        ("Facility analysis", test_facility_analysis)
    ]
    
    for test_name, test_func in tests:
        logger.info(f"Running test: {test_name}")
        result = test_func()
        status = "PASSED" if result else "FAILED"
        logger.info(f"Test {test_name}: {status}")
    
    logger.info("QD engine tests completed")
