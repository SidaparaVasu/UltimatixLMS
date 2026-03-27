import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, LogIn, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { LoginRequest } from '@/types/auth.types';

interface LoginFormProps {
  onSubmit: (payload: LoginRequest) => void;
  isLoading: boolean;
  error: string | null;
}

export const LoginForm = ({ onSubmit, isLoading, error }: LoginFormProps) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) return;
    onSubmit({ identifier: identifier.trim(), password });
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Welcome back</h2>
        <p className="text-sm text-slate-500">Sign in to your account to continue.</p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        {/* Email / Username */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="identifier"
            className="text-sm font-medium text-slate-700"
          >
            Email or Username
          </label>
          <input
            id="identifier"
            type="text"
            autoComplete="username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="your.email@example.com"
            disabled={isLoading}
            className={cn(
              'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900',
              'placeholder:text-slate-400 outline-none',
              'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
              'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400',
              'transition-colors'
            )}
            required
          />
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className="text-sm font-medium text-slate-700"
            >
              Password
            </label>
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isLoading}
              className={cn(
                'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 pr-10 text-sm text-slate-900',
                'placeholder:text-slate-400 outline-none',
                'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
                'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400',
                'transition-colors'
              )}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading || !identifier.trim() || !password.trim()}
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
          ) : (
            <LogIn className="h-4 w-4" />
          )}
          {isLoading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      {/* OTP Login link */}
      <p className="text-center text-sm text-slate-500">
        Prefer a code?{' '}
        <Link
          to="/login/otp"
          className="font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors"
        >
          Sign in with OTP
        </Link>
      </p>
    </div>
  );
};
