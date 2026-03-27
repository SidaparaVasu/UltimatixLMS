import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/api/auth-api';
import type { RegisterRequest } from '@/types/auth.types';

export const useRegister = () => {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (payload: RegisterRequest) => authApi.register(payload),
    onSuccess: (_data, variables) => {
      // Dispatch verification OTP from frontend as per user requirement
      authApi.requestOtp(variables.email, 'EMAIL_VERIFICATION').catch(() => {
        // Silent catch for initial dispatch — user can manually resend on verify page if this fails
      });

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
