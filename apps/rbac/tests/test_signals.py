from django.test import TestCase
from django.core.cache import cache
from apps.auth_security.models import AuthUser

from ..models import (
    RoleMaster,
    PermissionGroupMaster,
    PermissionMaster,
    RolePermissionMaster,
    UserRoleMaster,
)
from ..constants import ScopeType
from ..services.rbac_engine import RBACEngine


class TestRBACSignals(TestCase):
    def setUp(self):
        cache.clear()

        # Users
        self.user1 = AuthUser.objects.create_user(username="u1", email="u1@test.com", password="pwd")
        self.user2 = AuthUser.objects.create_user(username="u2", email="u2@test.com", password="pwd")

        # RBAC Structure
        self.perm_group = PermissionGroupMaster.objects.create(group_name="Test", group_code="TEST")
        self.perm = PermissionMaster.objects.create(permission_group=self.perm_group, permission_name="View", permission_code="TEST_VIEW")

        self.role = RoleMaster.objects.create(role_name="Manager", role_code="MGR")
        RolePermissionMaster.objects.create(role=self.role, permission=self.perm)

        # Assign Role directly to both
        UserRoleMaster.objects.create(user=self.user1, role=self.role, scope_type=ScopeType.GLOBAL)
        UserRoleMaster.objects.create(user=self.user2, role=self.role, scope_type=ScopeType.GLOBAL)

    def tearDown(self):
        cache.clear()

    def test_cache_hit_performance(self):
        """Verify that caching completely bypasses expensive DB aggregation queries."""
        # 1. 1st Call evaluates DB logic and sets cache
        first_call = RBACEngine.get_user_permissions(self.user1)
        self.assertIsNotNone(cache.get(f"rbac_user_perms_{self.user1.id}"))

        # 2. 2nd Call accesses cache only. Enforce that 0 database queries fire!
        with self.assertNumQueries(0):
            second_call = RBACEngine.get_user_permissions(self.user1)
            
        self.assertEqual(first_call, second_call)

    def test_signal_user_role_invalidation(self):
        """Verify caching invalidates exclusively for the targeted user when their assignment changes."""
        RBACEngine.get_user_permissions(self.user1)
        RBACEngine.get_user_permissions(self.user2)

        # Only give a new role to User 1
        new_role = RoleMaster.objects.create(role_name="New Role", role_code="NEW")
        UserRoleMaster.objects.create(user=self.user1, role=new_role, scope_type=ScopeType.GLOBAL)

        # User 1 cache should be gone
        self.assertIsNone(cache.get(f"rbac_user_perms_{self.user1.id}"))
        
        # User 2 cache must remain perfectly intact, protecting performance!
        self.assertIsNotNone(cache.get(f"rbac_user_perms_{self.user2.id}"))

    def test_signal_role_permission_invalidation(self):
        """Verify caching invalidates for ALL users mapping to a role when its permissions are modified."""
        RBACEngine.get_user_permissions(self.user1)
        RBACEngine.get_user_permissions(self.user2)

        # Add a shiny new permission to the 'Manager' role
        new_perm = PermissionMaster.objects.create(permission_group=self.perm_group, permission_name="Edit", permission_code="TEST_EDIT")
        RolePermissionMaster.objects.create(role=self.role, permission=new_perm)

        # Since BOTH users share 'Manager', both of their caches must defensively drop to prevent access leaks!
        self.assertIsNone(cache.get(f"rbac_user_perms_{self.user1.id}"))
        self.assertIsNone(cache.get(f"rbac_user_perms_{self.user2.id}"))

    def test_signal_role_invalidation(self):
        """Verify modifying the base Role metadata drops users' caches."""
        RBACEngine.get_user_permissions(self.user1)
        
        # Deactivate the Role
        self.role.is_active = False
        self.role.save()
        
        self.assertIsNone(cache.get(f"rbac_user_perms_{self.user1.id}"))

    def test_signal_permission_invalidation(self):
        """Verify modifying an atomic Permission code forces cache drops for overlapping roles."""
        RBACEngine.get_user_permissions(self.user1)
        
        # Deactivate the specific permission
        self.perm.is_active = False
        self.perm.save()
        
        self.assertIsNone(cache.get(f"rbac_user_perms_{self.user1.id}"))
