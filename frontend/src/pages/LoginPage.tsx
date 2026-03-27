import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LoginForm } from '@/modules/auth/LoginForm';
import { authApi } from '@/api/auth-api';
import { useLogin, getLoginError } from '@/queries/auth/useLogin';
import type { LoginRequest } from '@/types/auth.types';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { mutate: login, isPending, error } = useLogin();

  // Handle redirects for unverified accounts
  useEffect(() => {
    if (error) {
      const axiosError = error as { response?: { data?: { code?: string; errors?: { email?: string } } } };
      if (axiosError?.response?.data?.code === 'VERIFICATION_REQUIRED') {
        const email = axiosError?.response?.data?.errors?.email;
        if (email) {
          // Trigger the initial verification OTP from frontend as required
          authApi.requestOtp(email, "EMAIL_VERIFICATION").catch(() => {});
        }
        navigate("/verify-email", { state: { email }, replace: true });
      }
    }
  }, [error, navigate]);

  const handleLogin = (payload: LoginRequest) => login(payload);

  const isVerified = location.state?.emailVerified;
  const isReset = location.state?.passwordReset;

  return (
    <div className="flex flex-col gap-6">
      {(isVerified || isReset) && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {isVerified 
            ? 'Email verified successfully. You can now sign in.' 
            : 'Password reset successfully. Please sign in with your new password.'}
        </div>
      )}
      <LoginForm
        onSubmit={handleLogin}
        isLoading={isPending}
        error={getLoginError(error)}
      />
    </div>
  );
};

export default LoginPage;
