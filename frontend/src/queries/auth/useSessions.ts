import { useQuery } from '@tanstack/react-query';
import { authApi } from '@/api/auth-api';
import { useAuthStore } from '@/stores/authStore';

export const AUTH_SESSIONS_KEY = ['auth', 'sessions'];

export const useSessions = () => {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: AUTH_SESSIONS_KEY,
    queryFn: () => authApi.getSessions(),
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};
