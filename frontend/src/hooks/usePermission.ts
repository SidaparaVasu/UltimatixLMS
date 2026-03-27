import { useAuthStore } from '@/stores/authStore';

// Returns true if the authenticated user holds the given permission
// in at least one scope (GLOBAL, DEPARTMENT, COMPANY, etc.).
// Superusers are handled on the backend; this is UI-level guarding only.
export const usePermission = (permissionCode: string): boolean => {
  const user = useAuthStore((s) => s.user);

  if (!user) return false;

  const perm = user.permissions[permissionCode];
  if (!perm) return false;

  return (
    perm.GLOBAL === true ||
    perm.SELF === true ||
    perm.COMPANY.length > 0 ||
    perm.BUSINESS_UNIT.length > 0 ||
    perm.DEPARTMENT.length > 0
  );
};
