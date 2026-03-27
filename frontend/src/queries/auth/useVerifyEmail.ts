import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/api/auth-api';
import type { EmailVerifyRequest } from '@/types/auth.types';

export const useVerifyEmail = () => {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (payload: EmailVerifyRequest) => authApi.verifyEmail(payload),
    onSuccess: () => {
      // Redirect to login with a success banner flag
      navigate('/login', { state: { emailVerified: true }, replace: true });
    },
  });
};

export const getVerifyEmailError = (error: unknown): string | null => {
  if (!error) return null;
  const e = error as { response?: { data?: { message?: string } } };
  return e?.response?.data?.message ?? 'Invalid or expired code. Please try again.';
};
