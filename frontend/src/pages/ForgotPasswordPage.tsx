import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { PasswordResetForm } from '@/modules/auth/PasswordResetForm';
import { authApi } from '@/api/auth-api';

const extractMessage = (err: unknown, fallback: string): string => {
  const e = err as { response?: { data?: { message?: string } } };
  return e?.response?.data?.message ?? fallback;
};

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const requestReset = useMutation({
    mutationFn: (email: string) => authApi.requestPasswordReset({ email }),
    onSuccess: (_data, email) => {
      setSubmittedEmail(email);
      setStep(2);
    },
  });

  const confirmReset = useMutation({
    mutationFn: ({ otpCode, newPassword }: { otpCode: string; newPassword: string }) =>
      authApi.confirmPasswordReset({
        email: submittedEmail,
        otp_code: otpCode,
        new_password: newPassword,
      }),
    onSuccess: () => {
      navigate('/login', { state: { passwordReset: true }, replace: true });
    },
  });

  const handleBack = () => {
    setStep(1);
    setSubmittedEmail('');
    requestReset.reset();
    confirmReset.reset();
  };

  const isLoading = requestReset.isPending || confirmReset.isPending;

  const error =
    step === 1
      ? extractMessage(requestReset.error, 'Something went wrong. Please try again.')
      : extractMessage(confirmReset.error, 'Invalid or expired code. Please try again.');

  return (
    <PasswordResetForm
      step={step}
      submittedEmail={submittedEmail}
      onStep1Submit={(email) => requestReset.mutate(email)}
      onStep2Submit={(otpCode, newPassword) => confirmReset.mutate({ otpCode, newPassword })}
      onBack={handleBack}
      isLoading={isLoading}
      error={requestReset.error || confirmReset.error ? error : null}
    />
  );
};

export default ForgotPasswordPage;
