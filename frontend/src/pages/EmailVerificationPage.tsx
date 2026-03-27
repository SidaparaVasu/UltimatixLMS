import { useLocation, useNavigate } from 'react-router-dom';
import { EmailVerificationForm } from '@/modules/auth/EmailVerificationForm';
import { useVerifyEmail, getVerifyEmailError } from '@/queries/auth/useVerifyEmail';
import { authApi } from '@/api/auth-api';

const EmailVerificationPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email || '';

  const { mutate: verify, isPending, error } = useVerifyEmail();

  const handleVerify = (otp_code: string) => {
    if (!email) return;
    verify({ email, otp_code });
  };

  const handleResend = async () => {
    if (!email) return;
    try {
      await authApi.requestPasswordReset({ email });
    } catch (err) {
      // resend handle
    }
  };

  const handleBack = () => {
    navigate('/register');
  };

  return (
    <EmailVerificationForm
      email={email}
      onSubmit={handleVerify}
      onResend={handleResend}
      onBack={handleBack}
      isLoading={isPending}
      error={getVerifyEmailError(error)}
    />
  );
};

export default EmailVerificationPage;
