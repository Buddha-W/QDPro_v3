
from enum import Enum
from typing import Dict, List

class StandardType(Enum):
    DOD = "DOD"
    DOE = "DOE"

class Standards:
    DOD_REFERENCES = {
        'quantity_distance': {
            'ref': 'DoD 6055.09-M',
            'chapters': ['V7.E4', 'V1.E6'],
            'description': 'Standards for Quantity-Distance relationships'
        },
        'air_force': {
            'ref': 'AFMAN 91-201',
            'chapters': ['Chapter 12', 'Chapter 14'],
            'description': 'Air Force Explosives Safety Standards'
        },
        'aircraft_siting': {
            'ref': 'DoD 6055.09-M',
            'chapters': ['V4.E5.6', 'V4.E5.7'],
            'description': 'Aircraft and Airfield Quantity-Distance criteria'
        },
        'doe_crossref': {
            'ref': 'DOE-STD-1212-2019',
            'chapters': ['Chapter 3.4'],
            'description': 'DOE to DoD standard cross-references'
        },
        'storage_compatibility': {
            'ref': 'DESR 6055.09 Edition 1',
            'chapters': ['V1.E6.4', 'V1.E6.5'],
            'description': 'Explosive compatibility storage requirements'
        },
        'handling': {
            'ref': 'DA PAM 385-64',
            'chapters': ['Chapter 5'],
            'description': 'Ammunition and explosives handling requirements'
        }
    }
    
    DOE_REFERENCES = {
        'facility_safety': {
            'ref': 'DOE-STD-1212-2019',
            'chapters': ['Chapter 3', 'Chapter 4'],
            'description': 'Explosives safety requirements for facilities'
        },
        'storage_limits': {
            'ref': 'DOE O 440.1B',
            'chapters': ['Attachment 2'],
            'description': 'Storage limits and requirements'
        },
        'laboratory_operations': {
            'ref': 'DOE-STD-1212-2025',
            'chapters': ['Chapter 11'],
            'description': 'Laboratory operations with explosives'
        }
    }

    @staticmethod
    def get_reference(org_type: StandardType, operation: str) -> Dict:
        if org_type == StandardType.DOD:
            return Standards.DOD_REFERENCES.get(operation, {})
        return Standards.DOE_REFERENCES.get(operation, {})

    @staticmethod
    def get_all_references(org_type: StandardType) -> Dict:
        if org_type == StandardType.DOD:
            return Standards.DOD_REFERENCES
        return Standards.DOE_REFERENCES
