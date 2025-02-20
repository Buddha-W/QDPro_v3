
from typing import Dict, Any, List
from dataclasses import dataclass
from datetime import datetime

@dataclass
class ComplianceRule:
    code: str
    description: str
    validator: callable
    severity: str

class ComplianceChecker:
    def __init__(self):
        self.rules = self._initialize_rules()
    
    def _initialize_rules(self) -> List[ComplianceRule]:
        return [
            ComplianceRule(
                code="QD-001",
                description="Minimum separation distance",
                validator=lambda x: x["distance"] >= x["required_distance"],
                severity="critical"
            ),
            ComplianceRule(
                code="QD-002",
                description="Maximum NEW validation",
                validator=lambda x: x["new"] <= x["max_allowed_new"],
                severity="critical"
            ),
            ComplianceRule(
                code="QD-003",
                description="Proper facility categorization",
                validator=lambda x: x["category"] in x["allowed_categories"],
                severity="major"
            )
        ]
    
    def check_compliance(self, site_data: Dict[str, Any]) -> Dict[str, Any]:
        results = {
            "timestamp": datetime.now().isoformat(),
            "site_id": site_data.get("id"),
            "violations": [],
            "warnings": [],
            "passed": True
        }
        
        for rule in self.rules:
            try:
                if not rule.validator(site_data):
                    results["violations"].append({
                        "code": rule.code,
                        "description": rule.description,
                        "severity": rule.severity
                    })
                    if rule.severity == "critical":
                        results["passed"] = False
            except Exception as e:
                results["warnings"].append({
                    "code": rule.code,
                    "error": str(e)
                })
        
        return results
