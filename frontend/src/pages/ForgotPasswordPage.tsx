import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PasswordResetForm } from '@/modules/auth/PasswordResetForm';
import { authApi } from '@/api/auth-api';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2>(1);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Step 1 — Request password reset OTP
  // ---------------------------------------------------------------------------

  const handleStep1Submit = async (email: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await authApi.requestPasswordReset({ email });
      // Backend always returns 200 regardless of email existence
      // Move to Step 2 unconditionally (security: don't leak user existence)
      setSubmittedEmail(email);
      setStep(2);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      const message =
        axiosError?.response?.data?.message ??
        'Something went wrong. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Step 2 — Confirm OTP + set new password
  // ---------------------------------------------------------------------------

  const handleStep2Submit = async (otpCode: string, newPassword: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await authApi.confirmPasswordReset({
        email: submittedEmail,
        otp_code: otpCode,
        new_password: newPassword,
      });
      // Navigate to login with a success flag so LoginPage
      navigate('/login', { state: { passwordReset: true }, replace: true });
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      const message =
        axiosError?.response?.data?.message ??
        'Invalid or expired code. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Back to Step 1
  // ---------------------------------------------------------------------------

  const handleBack = () => {
    setStep(1);
    setError(null);
    setSubmittedEmail('');
  };

  return (
    <PasswordResetForm
      step={step}
      submittedEmail={submittedEmail}
      onStep1Submit={handleStep1Submit}
      onStep2Submit={handleStep2Submit}
      onBack={handleBack}
      isLoading={isLoading}
      error={error}
    />
  );
};

export default ForgotPasswordPage;
