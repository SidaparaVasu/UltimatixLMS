import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/api/auth-api';
import type { RegisterRequest } from '@/types/auth.types';

export const useRegister = () => {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (payload: RegisterRequest) => authApi.register(payload),
    onSuccess: (_data, variables) => {
      // After registration, redirect to email verification interstitial
      // Pass email via state so EmailVerificationPage can display it
      navigate('/verify-email', {
        state: { email: variables.email },
        replace: true,
      });
    },
  });
};

export const getRegisterError = (error: unknown): string | null => {
  if (!error) return null;
  const e = error as { response?: { data?: { message?: string; email?: string[]; username?: string[]; password?: string[] } } };
  const data = e?.response?.data;
  // DRF field-level validation errors
  if (data?.email) return `Email: ${data.email[0]}`;
  if (data?.username) return `Username: ${data.username[0]}`;
  if (data?.password) return `Password: ${data.password[0]}`;
  return data?.message ?? 'Registration failed. Please try again.';
};
