
import numpy as np
import math
import json
import logging
from typing import List, Dict, Tuple, Optional, Literal, Union
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)

@dataclass
class MaterialProperties:
    sensitivity: float
    det_velocity: float
    tnt_equiv: float

@dataclass
class EnvironmentalConditions:
    temperature: float
    pressure: float
    humidity: float
    confinement_factor: float

class SiteType(str, Enum):
    DOD = "DOD"
    DOE = "DOE"
    NATO = "NATO"
    AIR_FORCE = "AIR_FORCE"

class UnitType(str, Enum):
    GRAMS = "g"
    KILOGRAMS = "kg"
    POUNDS = "lbs"
    NEQ = "NEQ"  # NATO Net Explosive Quantity

class KFactorType(str, Enum):
    IBD = "IBD"  # Inhabited Building Distance
    ILD = "ILD"  # Intraline Distance
    IMD = "IMD"  # Intermagazine Distance
    PTRD = "PTRD"  # Public Traffic Route Distance
    LOP = "LOP"  # Level of Protection (DoE)

@dataclass
class QDParameters:
    quantity: float
    site_type: SiteType = SiteType.DOD
    material_type: str = "default"
    unit_type: UnitType = UnitType.POUNDS
    k_factor_type: KFactorType = KFactorType.IBD
    location: Optional[Dict[str, float]] = None
    material_props: Optional[MaterialProperties] = None
    env_conditions: Optional[EnvironmentalConditions] = None
    hazard_division: str = "1.1"  # Default to HD 1.1
    lab_environment: bool = False
    risk_based: bool = False

    def validate(self):
        if self.quantity <= 0:
            raise ValueError("Quantity must be positive")
        if self.site_type not in [st.value for st in SiteType]:
            raise ValueError(f"Invalid site type: {self.site_type}")
        if self.unit_type not in [ut.value for ut in UnitType]:
            raise ValueError(f"Invalid unit type: {self.unit_type}")


def get_engine(site_type: str = "DOD") -> 'QDEngine':
    """Create and return a QDEngine instance based on site type."""
    site_type = site_type.upper()
    if site_type not in [st.value for st in SiteType]:
        logger.warning(f"Unknown site type {site_type}, defaulting to DOD")
        site_type = "DOD"
        
    return QDEngine(site_type=site_type)

class QDEngine:
    def __init__(self, site_type: str):
        self.site_type = site_type
        self.uncertainty_margin = 0.1
        self.confidence_level = 0.95
        
        # Unit conversion factors to pounds
        self.unit_conversions = {
            UnitType.GRAMS: 0.00220462,
            UnitType.KILOGRAMS: 2.20462,
            UnitType.POUNDS: 1.0,
            UnitType.NEQ: 2.20462  # NATO NEQ is equivalent to kg
        }
        
        # Standard K-factors per organization and type
        self.k_factors = {
            SiteType.DOD.value: {
                KFactorType.IBD.value: 40,
                KFactorType.ILD.value: 18,
                KFactorType.IMD.value: 9,
                KFactorType.PTRD.value: 24,
                "default": 40
            },
            SiteType.DOE.value: {
                KFactorType.IBD.value: 50,
                KFactorType.ILD.value: 25,
                KFactorType.IMD.value: 11,
                KFactorType.PTRD.value: 30,
                KFactorType.LOP.value: {
                    "A": 100,
                    "B": 50,
                    "C": 25,
                    "D": 15
                },
                "default": 50
            },
            SiteType.NATO.value: {
                KFactorType.IBD.value: 44.4,
                KFactorType.ILD.value: 22.2,
                KFactorType.IMD.value: 11.1,
                KFactorType.PTRD.value: 22.2,
                "default": 44.4
            },
            SiteType.AIR_FORCE.value: {
                KFactorType.IBD.value: 40,
                KFactorType.ILD.value: 18,
                KFactorType.IMD.value: 9,
                KFactorType.PTRD.value: 24,
                "flight_line": 45,
                "alert_aircraft": 50,
                "default": 40
            }
        }
        
        # Standards reference database
        self.standards_references = {
            SiteType.DOD.value: {
                KFactorType.IBD.value: "DESR 6055.09, Vol 3, Section 5.4.1.2",
                KFactorType.ILD.value: "DESR 6055.09, Vol 3, Section 5.4.2.1",
                KFactorType.IMD.value: "DESR 6055.09, Vol 3, Section 5.4.3.1",
                KFactorType.PTRD.value: "DESR 6055.09, Vol 3, Section 5.4.4.1",
                "default": "DESR 6055.09, Vol 3, Table V3.E3.T1"
            },
            SiteType.DOE.value: {
                KFactorType.IBD.value: "DOE-STD-1212-2025, Section 5.3.1",
                KFactorType.ILD.value: "DOE-STD-1212-2025, Section 5.3.2",
                KFactorType.IMD.value: "DOE-STD-1212-2025, Section 5.3.3",
                KFactorType.LOP.value: "DOE-STD-1212-2025, Section 5.2.1",
                "default": "DOE-STD-1212-2025, Table 5.1"
            },
            SiteType.NATO.value: {
                KFactorType.IBD.value: "AASTP-1, Part I, Section 2.3.1",
                KFactorType.ILD.value: "AASTP-1, Part I, Section 2.3.2",
                KFactorType.IMD.value: "AASTP-1, Part I, Section 2.3.3",
                "default": "AASTP-1, Annex I-A"
            },
            SiteType.AIR_FORCE.value: {
                KFactorType.IBD.value: "DAFMAN 91-201, Section 12.2.1",
                KFactorType.ILD.value: "DAFMAN 91-201, Section 12.2.2",
                KFactorType.IMD.value: "DAFMAN 91-201, Section 12.2.3",
                KFactorType.PTRD.value: "DAFMAN 91-201, Section 12.2.4",
                "flight_line": "DAFMAN 91-201, Section 12.3.1",
                "alert_aircraft": "DAFMAN 91-201, Section 12.3.4",
                "default": "DAFMAN 91-201, Table 12.1"
            }
        }
        
    def get_standard_text(self, k_factor_type: str, detail_level: str = "summary") -> str:
        """Get the relevant standard text for a given K-factor type"""
        # Pull the reference from the standards database
        ref = self.standards_references.get(self.site_type, {}).get(k_factor_type, 
                                                               self.standards_references.get(self.site_type, {}).get("default", ""))
        
        # For now, just return the reference. In a full implementation, this would pull actual text
        if detail_level == "full":
            return f"Reference: {ref}\n\nDetailed standard text would be shown here in a full implementation."
        else:
            return ref

    def monte_carlo_analysis(self, quantity: float, material_props: MaterialProperties,
                           env_conditions: EnvironmentalConditions,
                           iterations: int = 1000) -> Dict[str, float]:
        """Perform Monte Carlo simulation for uncertainty analysis."""
        # Generate variations around nominal values
        quantities = np.random.normal(quantity, quantity * self.uncertainty_margin, iterations)
        sensitivities = np.random.normal(material_props.sensitivity, 
                                       material_props.sensitivity * 0.05, iterations)
        temperatures = np.random.normal(env_conditions.temperature, 2.0, iterations)

        # Calculate distances for each variation
        distances = []
        for i in range(iterations):
            modified_quantity = max(0, quantities[i])
            temp_factor = 1.0 + 0.002 * (temperatures[i] - 298)  # Temperature correction
            base_distance = self.get_k_factor() * math.pow(modified_quantity, 1/3)
            adjusted_distance = base_distance * temp_factor * sensitivities[i]
            distances.append(adjusted_distance)

        distances = np.array(distances)
        mean_distance = np.mean(distances)
        std_distance = np.std(distances)
        confidence_interval = np.percentile(distances, [2.5, 97.5])

        return {
            "mean_distance": float(mean_distance),
            "std_deviation": float(std_distance),
            "confidence_interval": confidence_interval.tolist(),
            "iterations": iterations
        }

    def get_k_factor(self, k_factor_type: str = KFactorType.IBD.value, lop_class: str = None) -> float:
        """Get the K-factor value based on site type and K-factor type"""
        if self.site_type not in self.k_factors:
            logger.warning(f"Unknown site type {self.site_type}, using DOD")
            self.site_type = SiteType.DOD.value
            
        # Handle special case for DoE LOP classes
        if k_factor_type == KFactorType.LOP.value and self.site_type == SiteType.DOE.value:
            if lop_class:
                return self.k_factors[self.site_type][k_factor_type].get(lop_class, 
                                                                   self.k_factors[self.site_type]["default"])
        
        # Get the standard K-factor
        return self.k_factors[self.site_type].get(k_factor_type, self.k_factors[self.site_type]["default"])

    def convert_to_pounds(self, quantity: float, unit_type: UnitType) -> float:
        """Convert from any supported unit to pounds"""
        return quantity * self.unit_conversions.get(unit_type, 1.0)
    
    def convert_from_pounds(self, quantity_lbs: float, target_unit: UnitType) -> float:
        """Convert from pounds to any supported unit"""
        conversion_factor = self.unit_conversions.get(target_unit, 1.0)
        if conversion_factor == 0:
            return 0
        return quantity_lbs / conversion_factor

    def calculate_safe_distance(self, quantity: float, k_factor_type: str = KFactorType.IBD.value,
                               unit_type: UnitType = UnitType.POUNDS, lop_class: str = None,
                               material_props: MaterialProperties = None,
                               env_conditions: EnvironmentalConditions = None,
                               risk_based: bool = False) -> Dict[str, any]:
        """Calculate deterministic safe distance with environmental corrections."""
        
        # Convert to pounds for calculation
        quantity_lbs = self.convert_to_pounds(quantity, unit_type)
        
        # Set defaults if not provided
        if material_props is None:
            material_props = MaterialProperties(sensitivity=1.0, det_velocity=6000, tnt_equiv=1.0)
        if env_conditions is None:
            env_conditions = EnvironmentalConditions(temperature=298, pressure=101.325, humidity=50, confinement_factor=0.0)

        # Apply environmental corrections
        temp_factor = 1.0 + 0.002 * (env_conditions.temperature - 298)
        humidity_factor = 1.0 + 0.001 * (env_conditions.humidity - 50)
        
        # Get the appropriate K-factor
        k_factor = self.get_k_factor(k_factor_type, lop_class)
        
        # Calculate the base distance using cube root formula
        base_distance = k_factor * math.pow(quantity_lbs, 1/3)
        
        # Apply adjustments
        adjusted_distance = base_distance * temp_factor * humidity_factor * material_props.sensitivity
        
        # Get the standard reference
        standard_ref = self.get_standard_text(k_factor_type)
        
        # Optional risk-based calculation
        risk_info = None
        if risk_based:
            # This is a simplified placeholder for risk-based calculation
            risk_info = {
                "method": "DDESB TP-14",
                "annual_pf": 1e-6 * quantity_lbs / 1000,  # Simplified hazard calculation
                "risk_distance": adjusted_distance * 0.8,  # Simplified risk distance
                "reference": "DDESB TP-14, Section 4.2.1"
            }
        
        # Format the calculation steps for transparency
        calc_steps = f"""
QD engine calculation steps:
1. Applied standard: {standard_ref}
2. Net explosive weight: {quantity} {unit_type}
3. Converted to pounds: {quantity_lbs:.2f} lbs
4. K-factor applied: {k_factor}
5. Base formula: {k_factor} × ∛({quantity_lbs:.2f})
6. Base distance: {base_distance:.2f} ft
7. Environmental adjustments:
   - Temperature factor: {temp_factor:.3f}
   - Humidity factor: {humidity_factor:.3f}
   - Material sensitivity: {material_props.sensitivity}
8. Final distance: {adjusted_distance:.2f} ft
"""
        
        return {
            "distance_ft": round(adjusted_distance, 2),
            "k_factor": k_factor,
            "k_factor_type": k_factor_type,
            "standard_reference": standard_ref,
            "calculation_steps": calc_steps,
            "risk_analysis": risk_info,
            "unit_type": unit_type,
            "quantity_original": quantity,
            "quantity_lbs": quantity_lbs
        }

    def generate_k_factor_rings(self, center: List[float], 
                              parameters: QDParameters,
                              uncertainty: Optional[float] = None,
                              k_factors: List[float] = None) -> List[Dict]:
        """Generate QD rings based on parameters with proper labeling"""
        
        if k_factors is None:
            k_factors = [1.0, 1.5, 2.0]
            
        # Calculate the base safe distance
        result = self.calculate_safe_distance(
            quantity=parameters.quantity,
            k_factor_type=parameters.k_factor_type,
            unit_type=parameters.unit_type
        )
        
        safe_distance = result["distance_ft"]
        
        # Generate the features with appropriate labeling
        features = []
        for k in k_factors:
            radius = safe_distance * k
            
            # Create appropriate label
            if k == 1.0:
                # For the primary ring, include detailed info
                label = f"HD {parameters.hazard_division} {parameters.k_factor_type} {radius:.0f} ft"
                description = f"{parameters.k_factor_type} ({self.get_k_factor(parameters.k_factor_type)}) - {radius:.0f} ft"
            else:
                # For secondary rings, use simpler labels
                label = f"{k}x {parameters.k_factor_type} {radius:.0f} ft"
                description = f"{k}x {parameters.k_factor_type} Buffer - {radius:.0f} ft"
                
            # Create the ring feature with detailed properties
            features.append(self._create_circle_feature(
                center=center, 
                radius=radius, 
                k_factor=k,
                label=label,
                description=description,
                qd_type=parameters.k_factor_type,
                hazard_division=parameters.hazard_division,
                net_explosive_weight=parameters.quantity,
                unit=parameters.unit_type
            ))
            
            # Add uncertainty bands if requested
            if uncertainty:
                features.append(self._create_circle_feature(
                    center=center,
                    radius=radius * (1 - uncertainty),
                    k_factor=k,
                    label=f"{label} (-{uncertainty*100}%)",
                    description=f"{description} (-{uncertainty*100}%)",
                    is_uncertainty=True,
                    qd_type=parameters.k_factor_type,
                    hazard_division=parameters.hazard_division
                ))
                features.append(self._create_circle_feature(
                    center=center,
                    radius=radius * (1 + uncertainty),
                    k_factor=k,
                    label=f"{label} (+{uncertainty*100}%)",
                    description=f"{description} (+{uncertainty*100}%)",
                    is_uncertainty=True,
                    qd_type=parameters.k_factor_type,
                    hazard_division=parameters.hazard_division
                ))
                
        return features

    def _create_circle_feature(self, center: List[float], radius: float, k_factor: float,
                             label: str, description: str, qd_type: str, hazard_division: str,
                             num_points: int = 32, is_uncertainty: bool = False,
                             net_explosive_weight: float = None, unit: str = None) -> Dict:
        """Create a circle feature with enhanced properties"""
        coords = []
        for i in range(num_points):
            angle = (i / num_points) * 2 * math.pi
            dx = radius * math.cos(angle)
            dy = radius * math.sin(angle)
            coords.append([center[0] + dx, center[1] + dy])
        coords.append(coords[0])  # Close the polygon

        # Create the feature with rich metadata
        feature = {
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": [coords]
            },
            "properties": {
                "k_factor": k_factor,
                "radius": radius,
                "label": label,
                "description": description,
                "qd_type": qd_type,
                "hazard_division": hazard_division,
                "is_qd_arc": True,
                "is_uncertainty": is_uncertainty,
                "standard": self.get_standard_text(qd_type)
            }
        }
        
        # Add explosive weight info if provided
        if net_explosive_weight is not None:
            feature["properties"]["net_explosive_weight"] = net_explosive_weight
            feature["properties"]["unit"] = unit
            
        return feature

    def calculate_fragment_distance(self, quantity: float, unit_type: UnitType = UnitType.POUNDS,
                                 material_type: str = "Steel", casing_thickness: float = 0.5) -> Dict[str, any]:
        """Calculate hazardous fragment distance"""
        # Convert to pounds for calculation
        quantity_lbs = self.convert_to_pounds(quantity, unit_type)
        
        # Simple model for hazardous fragment distance based on Gurney energy
        # This is a simplified approach - a real implementation would use more sophisticated models
        if material_type.lower() == "steel":
            gurney_constant = 2700  # ft/s for steel
        else:
            gurney_constant = 2400  # ft/s default
            
        # Simple fragment distance calculation (simplified Gurney-based approach)
        initial_velocity = gurney_constant * math.sqrt(quantity_lbs / (2 * casing_thickness))
        max_fragment_distance = 0.0084 * initial_velocity**1.5 * casing_thickness**0.5
        hazard_distance = round(max_fragment_distance * 1.2, 0)  # Apply safety factor
        
        # Reference for this calculation
        if self.site_type == SiteType.DOD.value:
            reference = "DDESB TP-16, Methodologies for Calculating Primary Fragment Characteristics"
        else:
            reference = "Generic fragmentation model based on Gurney equations"
            
        return {
            "hazard_distance": hazard_distance,
            "reference": reference,
            "method": "Simplified Gurney equation model",
            "initial_velocity": initial_velocity,
            "material_type": material_type
        }

    def calculate_arc_radius(self, net_explosive_weight: float, unit_type: UnitType = UnitType.POUNDS,
                          k_factor_type: str = KFactorType.IBD.value) -> float:
        """Calculate the radius for QD arc based on NEW with unit conversion"""
        # Convert to pounds and get K-factor
        quantity_lbs = self.convert_to_pounds(net_explosive_weight, unit_type)
        k_factor = self.get_k_factor(k_factor_type)
        
        # Calculate using cube root formula
        return round(k_factor * math.pow(quantity_lbs, 1/3), 2)

    def analyze_facility(self, facility: Dict, surrounding_features: List[Dict], 
                        k_factor_type: str = KFactorType.IBD.value,
                        unit_type: UnitType = UnitType.POUNDS) -> Dict:
        """Analyze a facility against surrounding features with enhanced information"""
        
        new_value = facility.get("properties", {}).get("net_explosive_weight", 0)
        unit = facility.get("properties", {}).get("unit", UnitType.POUNDS.value)
        
        # Calculate the safe distance with detailed information
        calc_result = self.calculate_safe_distance(
            quantity=new_value,
            k_factor_type=k_factor_type,
            unit_type=unit
        )
        
        safe_distance = calc_result["distance_ft"]
        
        # Initialize results
        results = {
            "violations": [],
            "safe_distance": safe_distance,
            "facility_id": facility.get("id"),
            "facility_name": facility.get("properties", {}).get("name", "Unknown Facility"),
            "calculation_details": calc_result,
            "standards_reference": self.get_standard_text(k_factor_type)
        }
        
        # Check each surrounding feature for violations
        for feature in surrounding_features:
            # Skip if this is a QD arc
            if feature.get("properties", {}).get("is_qd_arc", False):
                continue
                
            # Calculate distance
            if feature["geometry"]["type"] == "Point":
                distance = self.calculate_distance(
                    facility["geometry"]["coordinates"],
                    feature["geometry"]["coordinates"]
                )
            else:
                # For polygons, use first point as approximation
                # A real implementation would do proper polygon-to-polygon distance
                distance = self.calculate_distance(
                    facility["geometry"]["coordinates"],
                    feature["geometry"]["coordinates"][0][0]
                )
                
            # Check for violation
            if distance < safe_distance:
                results["violations"].append({
                    "feature_id": feature.get("id", "unknown"),
                    "feature_name": feature.get("properties", {}).get("name", "Unknown Feature"),
                    "distance": round(distance, 2),
                    "required": safe_distance,
                    "deficiency": round(safe_distance - distance, 2),
                    "percent_deficient": round(100 * (safe_distance - distance) / safe_distance, 1),
                    "standard_reference": self.get_standard_text(k_factor_type, "summary")
                })
                
        return results

    def calculate_distance(self, point1: Union[List[float], Tuple[float, float]], 
                         point2: Union[List[float], Tuple[float, float]]) -> float:
        """Calculate distance between two points"""
        if isinstance(point1, list) and len(point1) == 2:
            x1, y1 = point1
        elif isinstance(point1, tuple) and len(point1) == 2:
            x1, y1 = point1
        else:
            raise ValueError(f"Invalid point1 format: {point1}")
            
        if isinstance(point2, list) and len(point2) == 2:
            x2, y2 = point2
        elif isinstance(point2, tuple) and len(point2) == 2:
            x2, y2 = point2
        else:
            raise ValueError(f"Invalid point2 format: {point2}")
            
        return math.sqrt(
            math.pow(x2 - x1, 2) + 
            math.pow(y2 - y1, 2)
        )
