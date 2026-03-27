import { useLocation, useNavigate } from 'react-router-dom';
import { OtpLoginForm } from '@/modules/auth/OtpLoginForm';
import { useRequestOtpLogin, useConfirmOtpLogin, getOtpError } from '@/queries/auth/useOtpLogin';
import { authApi } from '@/api/auth-api';

const OtpLoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Step state is derived from router state (passed by the request-otp mutation)
  const step = (location.state?.step as 1 | 2) || 1;
  const identifier = (location.state?.identifier as string) || '';

  const requestOtp = useRequestOtpLogin();
  const confirmOtp = useConfirmOtpLogin();

  const handleStep1Submit = (id: string) => {
    requestOtp.mutate(id);
  };

  const handleStep2Submit = (otp_code: string) => {
    confirmOtp.mutate({ identifier, otp_code });
  };

  const handleResend = async () => {
    if (!identifier) return;
    try {
      await authApi.requestOtpLogin(identifier);
    } catch (err) {
      // resend error handling
    }
  };

  const handleBack = () => {
    navigate('/login/otp', { state: { step: 1, identifier: '' }, replace: true });
    requestOtp.reset();
    confirmOtp.reset();
  };

  const isLoading = requestOtp.isPending || confirmOtp.isPending;
  const error = step === 1
    ? getOtpError(requestOtp.error, 'Failed to send code. Please try again.')
    : getOtpError(confirmOtp.error, 'Invalid or expired code.');

  return (
    <OtpLoginForm
      step={step}
      identifier={identifier}
      onStep1Submit={handleStep1Submit}
      onStep2Submit={handleStep2Submit}
      onResend={handleResend}
      onBack={handleBack}
      isLoading={isLoading}
      error={error}
    />
  );
};

export default OtpLoginPage;
