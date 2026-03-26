from django.test import TestCase
from django.core.cache import cache
from apps.auth_security.models import AuthUser

from ..models import (
    PermissionGroupMaster,
    PermissionMaster,
    RoleMaster,
    RolePermissionMaster,
    UserRoleMaster,
)
from ..constants import ScopeType
from ..services.rbac_engine import RBACEngine


class TestRBACEngine(TestCase):
    def setUp(self):
        # Clear cache to prevent test leakage
        cache.clear()

        # Create basic logic users
        self.user = AuthUser.objects.create_user(
            email="test_user@example.com",
            username="testuser",
            password="TestPassword123!"
        )

        self.superuser = AuthUser.objects.create_superuser(
            email="test_superuser@example.com",
            username="testsuperuser",
            password="TestPassword123!",
            is_superuser=True
        )

        # Create basic RBAC structures
        self.perm_group = PermissionGroupMaster.objects.create(
            group_name="Course Management", 
            group_code="COURSE_MGMT"
        )
        self.perm_view = PermissionMaster.objects.create(
            permission_group=self.perm_group, 
            permission_name="View Course", 
            permission_code="COURSE_VIEW"
        )
        self.perm_edit = PermissionMaster.objects.create(
            permission_group=self.perm_group, 
            permission_name="Edit Course", 
            permission_code="COURSE_EDIT"
        )

        self.role_a = RoleMaster.objects.create(role_name="Role A", role_code="ROLE_A")
        self.role_b = RoleMaster.objects.create(role_name="Role B", role_code="ROLE_B")

    def tearDown(self):
        cache.clear()

    def test_superuser_bypass(self):
        """Verify that a superuser automatically has any permission requested, without explicit mappings."""
        # Check against a completely random permission that doesn't even exist in DB
        self.assertTrue(RBACEngine.has_permission(self.superuser, "ANY_RANDOM_CODE"))
        self.assertTrue(RBACEngine.has_permission(self.superuser, "COURSE_VIEW"))

    def test_unauthenticated_user(self):
        """Verify that an unauthenticated user or None resolves to zero permissions safely."""
        unauth_user = AuthUser()  # Not saved, no ID, not formally authenticated
        
        # Test None
        self.assertEqual(RBACEngine.get_user_permissions(None), {})
        self.assertFalse(RBACEngine.has_permission(None, "COURSE_VIEW"))
        
        # Test unauthenticated User object
        self.assertEqual(RBACEngine.get_user_permissions(unauth_user), {})
        self.assertFalse(RBACEngine.has_permission(unauth_user, "COURSE_VIEW"))

    def test_global_scope_override(self):
        """Verify that if a user has GLOBAL scope, it overrides restricted scopes for the exact same permission."""
        RolePermissionMaster.objects.create(role=self.role_a, permission=self.perm_view)
        
        # User has Role A as COMPANY limitation
        UserRoleMaster.objects.create(
            user=self.user, role=self.role_a, 
            scope_type=ScopeType.COMPANY, scope_id=1
        )
        
        # User has Role A as GLOBAL
        UserRoleMaster.objects.create(
            user=self.user, role=self.role_a, 
            scope_type=ScopeType.GLOBAL
        )

        perms = RBACEngine.get_user_permissions(self.user)
        
        # The key assertion: Even though COMPANY=1 was assigned, GLOBAL is True and the limited scopes are cleared out.
        self.assertTrue(perms["COURSE_VIEW"][ScopeType.GLOBAL])
        self.assertEqual(perms["COURSE_VIEW"][ScopeType.COMPANY], [])

    def test_granular_scope_accumulation(self):
        """Verify that multiple granular assignments for the same permission aggregate correctly."""
        RolePermissionMaster.objects.create(role=self.role_a, permission=self.perm_view)
        RolePermissionMaster.objects.create(role=self.role_b, permission=self.perm_view)

        UserRoleMaster.objects.create(
            user=self.user, role=self.role_a, scope_type=ScopeType.DEPARTMENT, scope_id=5
        )
        UserRoleMaster.objects.create(
            user=self.user, role=self.role_b, scope_type=ScopeType.DEPARTMENT, scope_id=10
        )
        
        # User also gets a separate permission through Role B
        RolePermissionMaster.objects.create(role=self.role_b, permission=self.perm_edit)

        perms = RBACEngine.get_user_permissions(self.user)
        
        # Expectation: They have DEPARTMENT access to 5 AND 10 for COURSE_VIEW
        self.assertIn(5, perms["COURSE_VIEW"][ScopeType.DEPARTMENT])
        self.assertIn(10, perms["COURSE_VIEW"][ScopeType.DEPARTMENT])
        
        # For COURSE_EDIT, they only have it from Role B (DEPARTMENT=10)
        self.assertIn(10, perms["COURSE_EDIT"][ScopeType.DEPARTMENT])
        self.assertNotIn(5, perms["COURSE_EDIT"][ScopeType.DEPARTMENT])

    def test_exact_scope_matching(self):
        """Verify exact scope matching logic in the has_permission utility."""
        RolePermissionMaster.objects.create(role=self.role_a, permission=self.perm_view)
        UserRoleMaster.objects.create(
            user=self.user, role=self.role_a, scope_type=ScopeType.BUSINESS_UNIT, scope_id=7
        )

        # Basic Check - Does the user have this permission anywhere at all?
        self.assertTrue(RBACEngine.has_permission(self.user, "COURSE_VIEW"))
        
        # Strict Check - Do they have it for BU 7?
        self.assertTrue(RBACEngine.has_permission(self.user, "COURSE_VIEW", ScopeType.BUSINESS_UNIT, 7))
        
        # Strict Check - Do they have it for BU 8?
        self.assertFalse(RBACEngine.has_permission(self.user, "COURSE_VIEW", ScopeType.BUSINESS_UNIT, 8))
        
        # Strict Check - Do they have it for COMPANY 7? (Wrong scope type)
        self.assertFalse(RBACEngine.has_permission(self.user, "COURSE_VIEW", ScopeType.COMPANY, 7))

    def test_inactive_roles_and_permissions(self):
        """Verify that inactive components do not grant permissions."""
        inactive_role = RoleMaster.objects.create(role_name="Inactive", role_code="INACT", is_active=False)
        RolePermissionMaster.objects.create(role=inactive_role, permission=self.perm_view)
        UserRoleMaster.objects.create(user=self.user, role=inactive_role, scope_type=ScopeType.GLOBAL)

        # Evaluate permissions, should be completely empty because the Role itself is inactive.
        perms = RBACEngine.get_user_permissions(self.user)
        self.assertEqual(perms, {})
