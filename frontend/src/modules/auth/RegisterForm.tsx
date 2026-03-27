import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, UserPlus, Loader2, Mail, User } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { RegisterRequest } from '@/types/auth.types';

interface RegisterFormProps {
  onSubmit: (payload: RegisterRequest) => void;
  isLoading: boolean;
  error: string | null;
}

export const RegisterForm = ({ onSubmit, isLoading, error }: RegisterFormProps) => {
  const [formData, setFormData] = useState<RegisterRequest>({
    email: '',
    username: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.username || formData.password.length < 8) return;
    onSubmit(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Create an account</h2>
        <p className="text-sm text-slate-500">Join Ultimatix LMS to start your learning journey.</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        {/* Email */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="reg-email" className="text-sm font-medium text-slate-700">
            Email address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              id="reg-email"
              name="email"
              type="email"
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              disabled={isLoading}
              className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50 transition-colors"
              required
            />
          </div>
        </div>

        {/* Username */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="reg-username" className="text-sm font-medium text-slate-700">
            Username
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              id="reg-username"
              name="username"
              type="text"
              autoComplete="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="johndoe"
              disabled={isLoading}
              className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50 transition-colors"
              required
            />
          </div>
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="reg-password" className="text-sm font-medium text-slate-700">
            Password
          </label>
          <div className="relative">
            <input
              id="reg-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Min. 8 characters"
              disabled={isLoading}
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 pr-10 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50 transition-colors"
              required
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
          {/* Password complexity hint could be added here */}
        </div>

        <button
          type="submit"
          disabled={isLoading || !formData.email || !formData.username || formData.password.length < 8}
          className="flex items-center justify-center gap-2 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          {isLoading ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <p className="text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link
          to="/login"
          className="font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
};
