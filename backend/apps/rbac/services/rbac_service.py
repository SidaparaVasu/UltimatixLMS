from common.services.base import BaseService
from common.exceptions import PermissionDeniedException
from django.db import transaction
from ..repositories import (
    PermissionGroupRepository,
    PermissionRepository,
    RoleRepository,
    RolePermissionRepository,
    UserRoleRepository,
)


class PermissionGroupService(BaseService):
    repository_class = PermissionGroupRepository


class PermissionService(BaseService):
    repository_class = PermissionRepository


class RoleService(BaseService):
    repository_class = RoleRepository

    def _check_privilege_escalation(self, requesting_user, permission_ids: list) -> list:
        """
        Verifies that every requested permission is held by the requesting user.

        Returns the list of PermissionMaster objects on success.
        Raises PermissionDeniedException listing the disallowed codes if any
        permission is not in the requesting user's own effective permission map.
        Superusers bypass this check entirely.
        """
        if requesting_user.is_superuser:
            perm_repo = PermissionRepository()
            return list(perm_repo.filter(id__in=permission_ids))

        from .rbac_engine import RBACEngine
        perm_repo = PermissionRepository()
        permissions = list(perm_repo.filter(id__in=permission_ids))

        if len(permissions) != len(permission_ids):
            raise ValueError("One or more permission IDs are invalid.")

        user_perm_map = RBACEngine.get_user_permissions(requesting_user)
        disallowed = [p.permission_code for p in permissions if p.permission_code not in user_perm_map]

        if disallowed:
            raise PermissionDeniedException(
                f"Privilege escalation blocked. You do not hold: {', '.join(sorted(disallowed))}"
            )

        return permissions

    @transaction.atomic
    def create_custom_role(self, company, requesting_user, **kwargs) -> "RoleMaster":
        """
        Creates a company-specific custom role.

        Enforces:
        - is_system_role is always False for custom roles
        - company is always set to the requesting user's company
        - Privilege escalation check on any permission_ids provided
        """
        permission_ids = kwargs.pop("permission_ids", [])

        if permission_ids:
            permissions = self._check_privilege_escalation(requesting_user, permission_ids)
        else:
            permissions = []

        kwargs["is_system_role"] = False
        kwargs["company"] = company

        role = self.repository.create(**kwargs)

        if permissions:
            mapping_repo = RolePermissionRepository()
            mapping_repo.clear_and_assign(role, permissions)

        return role

    @transaction.atomic
    def assign_permissions(self, role_id: int, permission_ids: list, requesting_user=None):
        """
        Bulk-assigns permissions to a role, replacing any existing mappings.

        When requesting_user is provided (non-superuser), the privilege
        escalation check runs before any writes occur.
        """
        role = self.get_by_id(role_id)
        if not role:
            return None, "Role not found."

        if requesting_user and not requesting_user.is_superuser and permission_ids:
            try:
                permissions = self._check_privilege_escalation(requesting_user, permission_ids)
            except PermissionDeniedException as exc:
                return None, str(exc)
            except ValueError as exc:
                return None, str(exc)
        else:
            perm_repo = PermissionRepository()
            permissions = list(perm_repo.filter(id__in=permission_ids))
            if len(permissions) != len(permission_ids):
                return None, "One or more permission IDs are invalid."

        mapping_repo = RolePermissionRepository()
        mapping_repo.clear_and_assign(role, permissions)
        return True, "Permissions assigned successfully."

    def get_role_permissions(self, role_id: int):
        """Fetch all permissions currently mapped to this role."""
        role = self.get_by_id(role_id)
        if not role:
            return None
        mapping_repo = RolePermissionRepository()
        return mapping_repo.get_permissions_for_role(role)

    def delete(self, pk: int, soft_delete: bool = True) -> bool:
        """System roles cannot be deleted."""
        role = self.get_by_id(pk)
        if role and role.is_system_role:
            raise PermissionDeniedException("Cannot delete a system-defined role.")
        return super().delete(pk, soft_delete)


class RolePermissionService(BaseService):
    repository_class = RolePermissionRepository


class UserRoleService(BaseService):
    repository_class = UserRoleRepository

    def assign_role(self, requesting_user, target_user, role, scope_type: str, scope_id=None):
        """
        Assigns a role to a user with privilege escalation and scope checks.

        Rules:
        - GLOBAL scope is blocked for non-superusers (enforced here and in the serializer)
        - The role's permissions must be a subset of the requesting user's own permissions
        - Superusers bypass both checks
        """
        from ..constants import ScopeType
        from .rbac_engine import RBACEngine
        from ..models import RolePermissionMaster

        if scope_type == ScopeType.GLOBAL and not requesting_user.is_superuser:
            raise PermissionDeniedException("GLOBAL scope is not permitted for company admin users.")

        if not requesting_user.is_superuser:
            role_perm_codes = set(
                RolePermissionMaster.objects.filter(role=role)
                .values_list("permission__permission_code", flat=True)
            )
            requester_perm_map = RBACEngine.get_user_permissions(requesting_user)
            disallowed = role_perm_codes - set(requester_perm_map.keys())
            if disallowed:
                raise PermissionDeniedException(
                    f"Privilege escalation blocked. Role grants permissions you do not hold: "
                    f"{', '.join(sorted(disallowed))}"
                )

        assignment, _ = self.repository.model.objects.get_or_create(
            user=target_user,
            role=role,
            scope_type=scope_type,
            scope_id=scope_id,
            defaults={"is_active": True},
        )
        if not assignment.is_active:
            assignment.is_active = True
            assignment.save(update_fields=["is_active", "updated_at"])

        return assignment

    def get_user_permissions(self, user):
        """
        Returns a flat list of permission dicts for a user across all active roles.
        Used by MyPermissionsAPIView for the legacy list format.
        """
        user_roles = self.repository.get_active_user_roles(user)
        mapping_repo = RolePermissionRepository()
        permissions_data = []
        for ur in user_roles:
            role_perms = mapping_repo.get_permissions_for_role(ur.role)
            for rp in role_perms:
                permissions_data.append({
                    "permission_code": rp.permission.permission_code,
                    "permission_name": rp.permission.permission_name,
                    "scope_type": ur.scope_type,
                    "scope_id": ur.scope_id,
                })
        return permissions_data
