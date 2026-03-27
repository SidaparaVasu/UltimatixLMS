import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/api/auth-api';
import { useAuthStore } from '@/stores/authStore';

// Step 1 — request OTP to be sent to user's email/phone
export const useRequestOtpLogin = () => {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (identifier: string) => authApi.requestOtpLogin(identifier),
    onSuccess: (_data, identifier) => {
      // Navigate to step 2 carrying identifier in state
      navigate('/login/otp', { state: { identifier, step: 2 } });
    },
  });
};

// Step 2 — confirm OTP and log in
export const useConfirmOtpLogin = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  return useMutation({
    mutationFn: (payload: { identifier: string; otp_code: string }) =>
      authApi.confirmOtpLogin(payload),
    onSuccess: (result) => {
      setAuth(result.user, result.access, result.refresh);
      navigate('/dashboard', { replace: true });
    },
  });
};

export const getOtpError = (error: unknown, fallback: string): string | null => {
  if (!error) return null;
  const e = error as { response?: { data?: { message?: string } } };
  return e?.response?.data?.message ?? fallback;
};
