import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Send, KeyRound, Smartphone } from 'lucide-react';
import { cn } from '@/utils/cn';

interface Step1Props {
  onSubmit: (identifier: string) => void;
  isLoading: boolean;
  error: string | null;
}

interface Step2Props {
  identifier: string;
  onSubmit: (otpCode: string) => void;
  onResend: () => void;
  onBack: () => void;
  isLoading: boolean;
  error: string | null;
}

const RequestStep = ({ onSubmit, isLoading, error }: Step1Props) => {
  const [identifier, setIdentifier] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;
    onSubmit(identifier.trim());
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Sign in with OTP</h2>
        <p className="text-sm text-slate-500">
          Enter your email or username. We'll send you a login code.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="otp-identifier" className="text-sm font-medium text-slate-700">
            Email or Username
          </label>
          <div className="relative">
            <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              id="otp-identifier"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="you@example.com"
              disabled={isLoading}
              className={cn(
                'w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3.5 py-2.5 text-sm text-slate-900',
                'placeholder:text-slate-400 outline-none',
                'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
                'disabled:cursor-not-allowed disabled:bg-slate-50',
                'transition-colors'
              )}
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !identifier.trim()}
          className="flex items-center justify-center gap-2 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {isLoading ? 'Sending...' : 'Send Login Code'}
        </button>
      </form>

      <Link
        to="/login"
        className="flex items-center justify-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to password login
      </Link>
    </div>
  );
};

const ConfirmStep = ({ identifier, onSubmit, onResend, onBack, isLoading, error }: Step2Props) => {
  const [otpCode, setOtpCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length < 4) return;
    onSubmit(otpCode);
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Enter login code</h2>
        <p className="text-sm text-slate-500">
          We've sent a code to <span className="font-medium text-slate-900">{identifier}</span>.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="otp-code" className="text-sm font-medium text-slate-700">
            Verification Code
          </label>
          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              id="otp-code"
              type="text"
              inputMode="numeric"
              maxLength={10}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              disabled={isLoading}
              className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3.5 py-2.5 text-sm text-slate-900 tracking-widest placeholder:tracking-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 transition-colors"
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
          {isLoading ? 'Verifying...' : 'Sign In'}
        </button>
      </form>

      <div className="flex flex-col gap-4 text-center">
        <button
          onClick={onResend}
          disabled={isLoading}
          className="text-sm font-medium text-blue-600 hover:text-blue-700 disabled:text-blue-300 transition-colors"
        >
          Resend code
        </button>
        <button
          onClick={onBack}
          disabled={isLoading}
          className="flex items-center justify-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Use a different identifier
        </button>
      </div>
    </div>
  );
};

interface OtpLoginFormProps {
  step: 1 | 2;
  identifier: string;
  onStep1Submit: (id: string) => void;
  onStep2Submit: (code: string) => void;
  onResend: () => void;
  onBack: () => void;
  isLoading: boolean;
  error: string | null;
}

export const OtpLoginForm = ({
  step,
  identifier,
  onStep1Submit,
  onStep2Submit,
  onResend,
  onBack,
  isLoading,
  error,
}: OtpLoginFormProps) => {
  return step === 1 ? (
    <RequestStep onSubmit={onStep1Submit} isLoading={isLoading} error={error} />
  ) : (
    <ConfirmStep
      identifier={identifier}
      onSubmit={onStep2Submit}
      onResend={onResend}
      onBack={onBack}
      isLoading={isLoading}
      error={error}
    />
  );
};
