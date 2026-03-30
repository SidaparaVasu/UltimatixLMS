import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/api/auth-api';
import { AUTH_SESSIONS_KEY } from './useSessions';

export const useRevokeSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: number) => authApi.revokeSession(sessionId),
    onSuccess: () => {
      // Refresh the sessions list after revoking one
      queryClient.invalidateQueries({ queryKey: AUTH_SESSIONS_KEY });
    },
  });
};
