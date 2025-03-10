
#!/usr/bin/env python3
"""
QD Engine Command Line Interface
This tool provides a simple command-line interface to the QD engine functionality.
"""

import argparse
import json
import logging
import sys
from qd_engine import get_engine, MaterialProperties, EnvironmentalConditions

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("qd_cli")

def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description="Quantity Distance (QD) Engine CLI")
    
    # Create subparsers for different commands
    subparsers = parser.add_subparsers(dest="command", help="Command to execute")
    
    # Calculate safe distance command
    calc_parser = subparsers.add_parser("calculate", help="Calculate safe distance")
    calc_parser.add_argument("--quantity", type=float, required=True, help="Explosive quantity")
    calc_parser.add_argument("--unit", type=str, default="lbs", help="Unit type (lbs, kg, g, NEQ)")
    calc_parser.add_argument("--site-type", type=str, default="DOD", help="Site type (DOD, DOE, NATO, AIR_FORCE)")
    calc_parser.add_argument("--k-factor-type", type=str, default="IBD", help="K-factor type (IBD, ILD, IMD, PTRD, LOP)")
    calc_parser.add_argument("--lop-class", type=str, help="Level of Protection class (for DOE with LOP)")
    calc_parser.add_argument("--output", type=str, default="json", choices=["json", "text"], help="Output format")
    
    # Fragment calculation command
    frag_parser = subparsers.add_parser("fragments", help="Calculate fragment distance")
    frag_parser.add_argument("--quantity", type=float, required=True, help="Explosive quantity")
    frag_parser.add_argument("--unit", type=str, default="lbs", help="Unit type (lbs, kg, g, NEQ)")
    frag_parser.add_argument("--material", type=str, default="Steel", help="Material type")
    frag_parser.add_argument("--thickness", type=float, default=0.5, help="Casing thickness")
    frag_parser.add_argument("--output", type=str, default="json", choices=["json", "text"], help="Output format")
    
    # QD Ring generation command
    rings_parser = subparsers.add_parser("rings", help="Generate QD rings for GIS")
    rings_parser.add_argument("--quantity", type=float, required=True, help="Explosive quantity")
    rings_parser.add_argument("--unit", type=str, default="lbs", help="Unit type (lbs, kg, g, NEQ)")
    rings_parser.add_argument("--lat", type=float, required=True, help="Latitude of center point")
    rings_parser.add_argument("--lng", type=float, required=True, help="Longitude of center point")
    rings_parser.add_argument("--k-factor-type", type=str, default="IBD", help="K-factor type (IBD, ILD, IMD, PTRD, LOP)")
    rings_parser.add_argument("--hazard-division", type=str, default="1.1", help="Hazard division")
    rings_parser.add_argument("--output-file", type=str, help="Output GeoJSON file")
    
    return parser.parse_args()

def format_output(data, format_type):
    """Format output data based on format_type."""
    if format_type == "json":
        return json.dumps(data, indent=2)
    elif format_type == "text":
        if isinstance(data, dict):
            return "\n".join([f"{k}: {v}" for k, v in data.items()])
        return str(data)
    return str(data)

def calculate_safe_distance(args):
    """Calculate safe distance using QD engine."""
    try:
        engine = get_engine(args.site_type)
        
        # Create default material and environment properties
        material_props = MaterialProperties(sensitivity=1.0, det_velocity=6000, tnt_equiv=1.0)
        env_conditions = EnvironmentalConditions(temperature=298, pressure=101.325, humidity=50, confinement_factor=0.0)
        
        # Calculate safe distance
        result = engine.calculate_safe_distance(
            quantity=args.quantity,
            k_factor_type=args.k_factor_type,
            unit_type=args.unit,
            lop_class=args.lop_class,
            material_props=material_props,
            env_conditions=env_conditions
        )
        
        print(format_output(result, args.output))
        return 0
    except Exception as e:
        logger.error(f"Error calculating safe distance: {str(e)}")
        return 1

def calculate_fragments(args):
    """Calculate fragment distance using QD engine."""
    try:
        engine = get_engine("DOD")  # Site type doesn't matter much for fragments
        
        # Calculate fragment distance
        result = engine.calculate_fragment_distance(
            quantity=args.quantity,
            unit_type=args.unit,
            material_type=args.material,
            casing_thickness=args.thickness
        )
        
        print(format_output(result, args.output))
        return 0
    except Exception as e:
        logger.error(f"Error calculating fragment distance: {str(e)}")
        return 1

def generate_rings(args):
    """Generate QD rings and output as GeoJSON."""
    try:
        engine = get_engine("DOD")
        
        # Create a parameters object for the rings
        class SimpleParams:
            def __init__(self, quantity, k_factor_type, unit_type, hazard_division):
                self.quantity = quantity
                self.k_factor_type = k_factor_type
                self.unit_type = unit_type
                self.hazard_division = hazard_division
        
        params = SimpleParams(
            quantity=args.quantity,
            k_factor_type=args.k_factor_type,
            unit_type=args.unit,
            hazard_division=args.hazard_division
        )
        
        # Generate the rings
        rings = engine.generate_k_factor_rings(
            center=[args.lng, args.lat],
            parameters=params
        )
        
        # Create GeoJSON feature collection
        feature_collection = {
            "type": "FeatureCollection",
            "features": rings
        }
        
        # Output to file or stdout
        if args.output_file:
            with open(args.output_file, 'w') as f:
                json.dump(feature_collection, f, indent=2)
            print(f"QD rings written to {args.output_file}")
        else:
            print(json.dumps(feature_collection, indent=2))
        
        return 0
    except Exception as e:
        logger.error(f"Error generating QD rings: {str(e)}")
        return 1

def main():
    """Main entry point for the CLI."""
    args = parse_arguments()
    
    if args.command == "calculate":
        return calculate_safe_distance(args)
    elif args.command == "fragments":
        return calculate_fragments(args)
    elif args.command == "rings":
        return generate_rings(args)
    else:
        print("No command specified. Use --help for usage information.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
