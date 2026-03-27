import { useState } from 'react';
import { ArrowLeft, Loader2, KeyRound, MailCheck } from 'lucide-react';
import { cn } from '@/utils/cn';

interface EmailVerificationFormProps {
  email: string;
  onSubmit: (otpCode: string) => void;
  onResend: () => void;
  onBack: () => void;
  isLoading: boolean;
  error: string | null;
}

export const EmailVerificationForm = ({
  email,
  onSubmit,
  onResend,
  onBack,
  isLoading,
  error,
}: EmailVerificationFormProps) => {
  const [otpCode, setOtpCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length < 4) return;
    onSubmit(otpCode);
  };

  return (
    <div className="flex flex-col gap-8 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
          <MailCheck className="h-8 w-8 text-blue-600" />
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Verify your email</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            We've sent a 6-digit verification code to<br />
            <span className="font-semibold text-slate-900">{email}</span>
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
        <div className="flex flex-col gap-1.5 text-left">
          <label htmlFor="verify-code" className="text-sm font-medium text-slate-700">
            Verification Code
          </label>
          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              id="verify-code"
              type="text"
              inputMode="numeric"
              maxLength={10}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              disabled={isLoading}
              className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3.5 py-2.5 text-sm text-slate-900 tracking-[0.5em] placeholder:tracking-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50 transition-colors"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || otpCode.length < 4}
          className="flex items-center justify-center gap-2 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {isLoading ? 'Verifying...' : 'Verify Email'}
        </button>
      </form>

      <div className="flex flex-col gap-4">
        <p className="text-sm text-slate-500">
          Didn't receive the code?{' '}
          <button
            onClick={onResend}
            disabled={isLoading}
            className="font-medium text-blue-600 hover:text-blue-700 disabled:text-blue-300 transition-colors"
          >
            Resend
          </button>
        </p>
        <button
          onClick={onBack}
          disabled={isLoading}
          className="flex items-center justify-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Edit email address
        </button>
      </div>
    </div>
  );
};
