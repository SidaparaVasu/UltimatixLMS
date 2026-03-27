import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { EmailVerificationForm } from '@/modules/auth/EmailVerificationForm';
import { useVerifyEmail, getVerifyEmailError } from '@/queries/auth/useVerifyEmail';
import { authApi } from '@/api/auth-api';

const EmailVerificationPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email || '';

  const [resendSuccess, setResendSuccess] = useState(false);
  const { mutate: verify, isPending, error } = useVerifyEmail();

  const handleVerify = (otp_code: string) => {
    if (!email) return;
    verify({ email, otp_code, purpose: 'EMAIL_VERIFICATION' });
  };

  const handleResend = async () => {
    if (!email) return;
    try {
      setResendSuccess(false);
      await authApi.requestOtp(email, 'EMAIL_VERIFICATION');
      setResendSuccess(true);
    } catch (err) {
      // resend handle
    }
  };

  const handleBack = () => {
    navigate('/register');
  };

  return (
    <div className="flex flex-col gap-6">
      {resendSuccess && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          A new verification code has been sent to your email.
        </div>
      )}
      <EmailVerificationForm
        email={email}
        onSubmit={handleVerify}
        onResend={handleResend}
        onBack={handleBack}
        isLoading={isPending}
        error={getVerifyEmailError(error)}
      />
    </div>
  );
};

export default EmailVerificationPage;
