import { ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

interface RoleGuardProps {
  /**
   * Array of role codes allowed to access this route.
   * If provided, the user must possess at least one of these roles.
   */
  allowedRoles?: string[];
  
  /**
   * Array of permission codes required to access this route.
   * If provided, the user must possess all of these permissions in at least one scope.
   */
  requiredPermissions?: string[];
  
  children?: ReactNode;
}

/**
 * RoleGuard provides role and permission-based access control for routes.
 * It dynamically evaluates the user's roles and permissions fetched from the backend.
 */
export const RoleGuard = ({ 
  allowedRoles = [], 
  requiredPermissions = [], 
  children 
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
