import { useQuery } from '@tanstack/react-query';
import { authApi } from '@/api/auth-api';
import { useAuthStore } from '@/stores/authStore';

export const AUTH_PROFILE_KEY = ['auth', 'profile'];

/**
 * Hook to fetch and synchronize the current authenticated user's profile.
 * Should be used in layout or profile pages to ensure local state is fresh.
 */
export const useProfile = () => {
  const { isAuthenticated, setUser } = useAuthStore();

  return useQuery({
    queryKey: AUTH_PROFILE_KEY,
    queryFn: async () => {
      const data = await authApi.getProfile();
      // Keep Zustand metadata updated (for name/avatar/etc. in sidebars)
      setUser(data);
      return data;
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
