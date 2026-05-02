from common.repositories.base import BaseRepository
from ..models import (
    PermissionGroupMaster,
    PermissionMaster,
    RoleMaster,
    RolePermissionMaster,
    UserRoleMaster
)


class PermissionGroupRepository(BaseRepository[PermissionGroupMaster]):
    model = PermissionGroupMaster


class PermissionRepository(BaseRepository[PermissionMaster]):
    model = PermissionMaster


class RoleRepository(BaseRepository[RoleMaster]):
    model = RoleMaster


class RolePermissionRepository(BaseRepository[RolePermissionMaster]):
    model = RolePermissionMaster

    def clear_and_assign(self, role, permissions):
        """Standardizes Role-Permission bulk assignments."""
        from django.db import transaction
        with transaction.atomic():
            self.filter(role=role).delete()
            mappings = [RolePermissionMaster(role=role, permission=p) for p in permissions]
            self.model.objects.bulk_create(mappings)

    def get_permissions_for_role(self, role):
        """Fetch all permissions assigned to a role."""
        return self.filter(role=role).select_related("permission")


class UserRoleRepository(BaseRepository[UserRoleMaster]):
    model = UserRoleMaster

    def get_active_user_roles(self, user):
        """Aggregates all active roles for a user."""
        return self.filter(user=user, is_active=True).select_related("role")


class CompanyPermissionGroupRepository(BaseRepository):
    model = None

    def __init__(self):
        from ..models import CompanyPermissionGroup
        self.model = CompanyPermissionGroup
