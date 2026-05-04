import { ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import type { PermissionCode } from '@/constants/permissions';

interface RoleGuardProps {
  /**
   * Array of role codes allowed to access this route.
   * At least one must match. Kept for backward compatibility — prefer
   * requiredPermissions for new routes.
   */
  allowedRoles?: string[];

  /**
   * Array of permission codes required to access this route.
   * The user must hold ALL listed permissions in at least one scope.
   * Unauthenticated users are redirected to /login; unauthorised users
   * to /unauthorized.
   */
  requiredPermissions?: PermissionCode[];

  children?: ReactNode;
}

/**
 * RoleGuard — route-level access control.
 *
 * Evaluation order:
 *   1. Unauthenticated → /login
 *   2. allowedRoles check (any match required)
 *   3. requiredPermissions check (all must be held in at least one scope)
 *   4. Pass through to <Outlet /> or children
 */
export const RoleGuard = ({
  allowedRoles = [],
  requiredPermissions = [],
  children,
}: RoleGuardProps) => {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0) {
    const hasRole = user.roles.some((role) => allowedRoles.includes(role.role_code));
    if (!hasRole) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  if (requiredPermissions.length > 0) {
    const hasAllPermissions = requiredPermissions.every((perm) => {
      const scope = user.permissions[perm];
      if (!scope) return false;
      return (
        scope.GLOBAL ||
        scope.SELF ||
        scope.COMPANY.length > 0 ||
        scope.BUSINESS_UNIT.length > 0 ||
        scope.DEPARTMENT.length > 0
      );
    });

    if (!hasAllPermissions) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return children ? <>{children}</> : <Outlet />;
};

export default RoleGuard;
