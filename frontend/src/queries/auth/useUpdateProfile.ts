import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/api/auth-api';
import { useAuthStore } from '@/stores/authStore';
import type { ProfileUpdateRequest } from '@/types/auth.types';
import { AUTH_PROFILE_KEY } from './useProfile';

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  const { setUser } = useAuthStore();

  return useMutation({
    mutationFn: (payload: ProfileUpdateRequest) => authApi.updateProfile(payload),
    onSuccess: (updatedProfile) => {
      queryClient.invalidateQueries({ queryKey: AUTH_PROFILE_KEY });
    },
  });
};

export const getProfileError = (error: unknown): string | null => {
  if (!error) return null;
  const e = error as { response?: { data?: { message?: string } } };
  return e?.response?.data?.message ?? 'Failed to update profile. Please try again.';
};
