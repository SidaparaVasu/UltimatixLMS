import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginForm } from '@/modules/auth/LoginForm';
import { authApi } from '@/api/auth-api';
import { useAuthStore } from '@/stores/authStore';
import type { LoginRequest } from '@/types/auth.types';

const LoginPage = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (payload: LoginRequest) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await authApi.login(payload);
      setAuth(result.user, result.access, result.refresh);
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      // Normalise DRF error shape { success: false, message: "..." }
      const axiosError = err as { response?: { data?: { message?: string } } };
      const message =
        axiosError?.response?.data?.message ??
        'Unable to sign in. Please check your credentials and try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LoginForm
      onSubmit={handleLogin}
      isLoading={isLoading}
      error={error}
    />
  );
};

export default LoginPage;
