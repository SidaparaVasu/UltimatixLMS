import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft, Loader2, Mail, KeyRound } from 'lucide-react';
import { cn } from '@/utils/cn';

interface Step1Props {
  onSubmit: (email: string) => void;
  isLoading: boolean;
  error: string | null;
}

interface Step2Props {
  email: string;
  onSubmit: (otpCode: string, newPassword: string) => void;
  onBack: () => void;
  isLoading: boolean;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Step 1 — Request OTP
// ---------------------------------------------------------------------------

const RequestOtpStep = ({ onSubmit, isLoading, error }: Step1Props) => {
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    onSubmit(email.trim().toLowerCase());
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Reset your password</h2>
        <p className="text-sm text-slate-500">
          Enter your registered email. We'll send you a one-time code to reset your password.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="reset-email" className="text-sm font-medium text-slate-700">
            Email address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              id="reset-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={isLoading}
              className={cn(
                'w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3.5 py-2.5 text-sm text-slate-900',
                'placeholder:text-slate-400 outline-none',
                'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
                'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400',
                'transition-colors'
              )}
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !email.trim()}
          className={cn(
            'flex items-center justify-center gap-2 w-full rounded-lg',
            'bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white',
            'hover:bg-blue-700 active:bg-blue-800',
            'disabled:cursor-not-allowed disabled:bg-blue-300',
            'transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50'
          )}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : null}
          {isLoading ? 'Sending code…' : 'Send reset code'}
        </button>
      </form>

      <Link
        to="/login"
        className="flex items-center justify-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to sign in
      </Link>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Step 2 — Confirm OTP + New Password
// ---------------------------------------------------------------------------

const ConfirmResetStep = ({ email, onSubmit, onBack, isLoading, error }: Step2Props) => {
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim() || !newPassword.trim()) return;
    onSubmit(otpCode.trim(), newPassword);
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Check your email</h2>
        <p className="text-sm text-slate-500">
          We sent a 6-digit code to{' '}
          <span className="font-medium text-slate-700">{email}</span>. Enter it below along with your new password.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        {/* OTP Code */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="otp-code" className="text-sm font-medium text-slate-700">
            Verification code
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
              className={cn(
                'w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3.5 py-2.5 text-sm text-slate-900 tracking-widest',
                'placeholder:text-slate-400 placeholder:tracking-normal outline-none',
                'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
                'disabled:cursor-not-allowed disabled:bg-slate-50',
                'transition-colors'
              )}
              required
            />
          </div>
        </div>

        {/* New Password */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="new-password" className="text-sm font-medium text-slate-700">
            New password
          </label>
          <div className="relative">
            <input
              id="new-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min. 8 characters"
              disabled={isLoading}
              className={cn(
                'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 pr-10 text-sm text-slate-900',
                'placeholder:text-slate-400 outline-none',
                'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
                'disabled:cursor-not-allowed disabled:bg-slate-50',
                'transition-colors'
              )}
              required
              minLength={8}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !otpCode.trim() || newPassword.length < 8}
          className={cn(
            'flex items-center justify-center gap-2 w-full rounded-lg',
            'bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white',
            'hover:bg-blue-700 active:bg-blue-800',
            'disabled:cursor-not-allowed disabled:bg-blue-300',
            'transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50'
          )}
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {isLoading ? 'Resetting…' : 'Reset password'}
        </button>
      </form>

      <button
        type="button"
        onClick={onBack}
        className="flex items-center justify-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Use a different email
      </button>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Composed Export — PasswordResetForm
// ---------------------------------------------------------------------------

interface PasswordResetFormProps {
  step: 1 | 2;
  submittedEmail: string;
  onStep1Submit: (email: string) => void;
  onStep2Submit: (otpCode: string, newPassword: string) => void;
  onBack: () => void;
  isLoading: boolean;
  error: string | null;
}

export const PasswordResetForm = ({
  step,
  submittedEmail,
  onStep1Submit,
  onStep2Submit,
  onBack,
  isLoading,
  error,
}: PasswordResetFormProps) => {
  return step === 1 ? (
    <RequestOtpStep onSubmit={onStep1Submit} isLoading={isLoading} error={error} />
  ) : (
    <ConfirmResetStep
      email={submittedEmail}
      onSubmit={onStep2Submit}
      onBack={onBack}
      isLoading={isLoading}
      error={error}
    />
  );
};
