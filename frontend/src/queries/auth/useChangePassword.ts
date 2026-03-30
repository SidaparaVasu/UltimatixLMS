import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/api/auth-api';
import type { PasswordChangeRequest } from '@/types/auth.types';

export const useChangePassword = () => {
  return useMutation({
    mutationFn: (payload: PasswordChangeRequest) => authApi.changePassword(payload),
  });
};

export const getPasswordError = (error: unknown): string | null => {
  if (!error) return null;
  const e = error as { response?: { data?: { message?: string } } };
  return e?.response?.data?.message ?? 'Failed to change password. Please check your current password.';
};
