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
            'ref': 'DESR 6055.09_DAFMAN 91-201',
            'chapters': ['Chapter 12', 'Chapter 14', 'Chapter 15'],
            'description': 'Air Force Explosives Safety Standards and Supplements'
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
            'ref': 'DESR 6055.09 Edition 2',
            'chapters': ['V1.E6.4', 'V1.E6.5', 'V1.E6.6'],
            'description': 'Explosive compatibility storage requirements'
        },
        'handling': {
            'ref': 'DA PAM 385-64 2023',
            'chapters': ['Chapter 5', 'Chapter 6'],
            'description': 'Ammunition and explosives handling requirements'
        }
    }

    DOE_REFERENCES = {
        'facility_safety': {
            'ref': 'DOE-STD-1212-2025',
            'chapters': ['Chapter 3', 'Chapter 4'],
            'description': 'Explosives safety requirements for facilities'
        },
        'storage_limits': {
            'ref': 'DOE O 440.1C',
            'chapters': ['Attachment 2', 'Attachment 3'],
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