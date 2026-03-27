import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/api/auth-api';
import { useAuthStore } from '@/stores/authStore';

export const useLogout = () => {
  const navigate = useNavigate();
  const { refreshToken, clearAuth } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authApi.logout(refreshToken ?? ''),
    onSettled: () => {
      // Clear regardless of backend success/failure
      clearAuth();
      queryClient.clear();
      navigate('/login', { replace: true });
    },
  });
};
