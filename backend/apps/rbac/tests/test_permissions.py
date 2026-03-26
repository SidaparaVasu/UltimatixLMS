from django.test import TestCase
from django.core.cache import cache
from rest_framework.test import APIRequestFactory
from apps.auth_security.models import AuthUser

from ..models import (
    RoleMaster,
    PermissionGroupMaster,
    PermissionMaster,
    RolePermissionMaster,
    UserRoleMaster,
)
from ..constants import ScopeType
from ..permissions import HasScopedPermission


class MockViewWithoutPerm:
    pass


class MockViewWithPerm:
    required_permission = "SPECIAL_VIEW"


class TestHasScopedPermission(TestCase):
    def setUp(self):
        cache.clear()
        self.factory = APIRequestFactory()
        
        # Setup basic users and roles
        self.user = AuthUser.objects.create_user(
            email="perm_test@example.com",
            username="testperm",
            password="pwd"
        )
        self.superuser = AuthUser.objects.create_superuser(
            email="super_test@example.com",
            username="supertest",
            password="pwd",
            is_superuser=True
        )

        perm_group = PermissionGroupMaster.objects.create(group_name="Test", group_code="TEST")
        self.perm = PermissionMaster.objects.create(
            permission_group=perm_group, 
            permission_name="Special View", 
            permission_code="SPECIAL_VIEW"
        )
        self.role = RoleMaster.objects.create(role_name="Special Role", role_code="SP_ROLE")
        RolePermissionMaster.objects.create(role=self.role, permission=self.perm)

        self.permission_checker = HasScopedPermission()

    def tearDown(self):
        cache.clear()

    def test_missing_required_permission_attr(self):
        """Verify that a view completely missing 'required_permission' fails closed."""
        request = self.factory.get("/")
        # Even if a user physically HAS the permission on their account...
        request.user = self.user
        UserRoleMaster.objects.create(user=self.user, role=self.role, scope_type=ScopeType.GLOBAL)
        
        view = MockViewWithoutPerm()
        has_perm = self.permission_checker.has_permission(request, view)
        
        # ...If the developers forgot to explicitly label the ViewSet, we lock it down!
        self.assertFalse(has_perm)

    def test_permission_granted(self):
        """Verify the class correctly grants access to properly configured users."""
        request = self.factory.get("/")
        request.user = self.user
        
        # Grant the user the role globally
        UserRoleMaster.objects.create(user=self.user, role=self.role, scope_type=ScopeType.GLOBAL)
        
        view = MockViewWithPerm()
        has_perm = self.permission_checker.has_permission(request, view)
        
        self.assertTrue(has_perm)

    def test_permission_denied(self):
        """Verify the class actively blocks authenticated users who lack the required permission mapping."""
        request = self.factory.get("/")
        request.user = self.user
        
        # We DELIBERATELY DO NOT grant the user this role mapping!
        
        view = MockViewWithPerm()
        has_perm = self.permission_checker.has_permission(request, view)
        
        self.assertFalse(has_perm)

    def test_unauthenticated_request(self):
        """Verify anonymous/unauthenticated requests instantly fail."""
        request = self.factory.get("/")
        request.user = None
        
        view = MockViewWithPerm()
        has_perm = self.permission_checker.has_permission(request, view)
        
        self.assertFalse(has_perm)

    def test_superuser_always_granted(self):
        """Verify superusers automatically bypass the engine and receive True."""
        request = self.factory.get("/")
        request.user = self.superuser
        
        view = MockViewWithPerm()
        has_perm = self.permission_checker.has_permission(request, view)
        
        self.assertTrue(has_perm)
