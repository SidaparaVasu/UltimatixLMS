import { useQuery } from '@tanstack/react-query';
import { authApi } from '@/api/auth-api';
import { useAuthStore } from '@/stores/authStore';

export const AUTH_PROFILE_KEY = ['auth', 'profile'];

export const useProfile = () => {
  const { isAuthenticated, setUser } = useAuthStore();

  return useQuery({
    queryKey: AUTH_PROFILE_KEY,
    queryFn: async () => {
      const user = await authApi.getProfile();
      // Keep Zustand store in sync with the latest profile data
      setUser(user);
      return user;
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
