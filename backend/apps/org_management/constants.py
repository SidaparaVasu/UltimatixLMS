"""
org_management constants.

All ENUM values are defined here as typed Python classes.
Never use raw strings for enum values in code — always import from here.
"""


class EmploymentStatus:
    """Status for EmployeeMaster.employment_status."""
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    RESIGNED = "RESIGNED"
    TERMINATED = "TERMINATED"

    CHOICES = [
        (ACTIVE, "Active"),
        (INACTIVE, "Inactive"),
        (RESIGNED, "Resigned"),
        (TERMINATED, "Terminated"),
    ]


class RelationshipType:
    """Relationship type for EmployeeReportingManager.relationship_type."""
    DIRECT = "DIRECT"
    DOTTED = "DOTTED"

    CHOICES = [
        (DIRECT, "Direct"),
        (DOTTED, "Dotted"),
    ]
