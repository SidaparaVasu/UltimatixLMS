"""
rbac constants.

All ENUM values are defined here as typed Python classes.
Never use raw strings for enum values in code — always import from here.
"""

class ScopeType:
    """Supported boundaries/scopes for UserRoleMaster mapping."""
    GLOBAL = "GLOBAL"
    COMPANY = "COMPANY"
    BUSINESS_UNIT = "BUSINESS_UNIT"
    DEPARTMENT = "DEPARTMENT"
    SELF = "SELF"

    CHOICES = [
        (GLOBAL, "Global"),
        (COMPANY, "Company"),
        (BUSINESS_UNIT, "Business Unit"),
        (DEPARTMENT, "Department"),
        (SELF, "Self"),
    ]
