from ..models import (
    PermissionGroupMaster,
    PermissionMaster,
    RoleMaster,
    RolePermissionMaster,
    UserRoleMaster
)
from .base_service import BaseRBACService


class PermissionGroupService(BaseRBACService):
    model = PermissionGroupMaster


class PermissionService(BaseRBACService):
    model = PermissionMaster


class RoleService(BaseRBACService):
    model = RoleMaster


class RolePermissionService(BaseRBACService):
    model = RolePermissionMaster


class UserRoleService(BaseRBACService):
    model = UserRoleMaster