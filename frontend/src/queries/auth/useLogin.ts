import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/api/auth-api';
import { useAuthStore } from '@/stores/authStore';
import type { LoginRequest } from '@/types/auth.types';

const extractMessage = (err: unknown, fallback: string): string => {
  const e = err as { response?: { data?: { message?: string } } };
  return e?.response?.data?.message ?? fallback;
};

export const useLogin = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  return useMutation({
    mutationFn: (payload: LoginRequest) => authApi.login(payload),
    onSuccess: (result) => {
      setAuth(result.user, result.access, result.refresh);
      navigate('/dashboard', { replace: true });
    },
    onError: () => {
      // error message is read from mutation.error in the component
    },
  });
};

// Helper: extract a display-ready error string from a useLogin mutation error
export const getLoginError = (error: unknown): string | null => {
  if (!error) return null;
  return extractMessage(error, 'Unable to sign in. Please check your credentials and try again.');
};
