import { useState } from 'react';
import { KeyRound, Eye, EyeOff, Loader2, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useChangePassword, getPasswordError } from '@/queries/auth/useChangePassword';

export const ChangePasswordForm = () => {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [formData, setFormData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });

  const { mutate: changePassword, isPending, isSuccess, error } = useChangePassword();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.new_password !== formData.confirm_password) return;
    changePassword({
      old_password: formData.old_password,
      new_password: formData.new_password,
    });
    setFormData({ old_password: '', new_password: '', confirm_password: '' });
  };

  const isFormValid = formData.old_password && formData.new_password && formData.new_password === formData.confirm_password;

  return (
    <div className="flex flex-col gap-6 max-w-md">
      <div className="flex items-start gap-4 p-4 rounded-xl bg-amber-50 border border-amber-100">
        <ShieldAlert className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-800 leading-relaxed">
          Ensure your new password is secure. After a successful change, you may need to re-authenticate on your other devices.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Current Password */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-slate-700">Current Password</label>
          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type={showCurrent ? 'text' : 'password'}
              value={formData.old_password}
              onChange={(e) => setFormData(prev => ({ ...prev, old_password: e.target.value }))}
              placeholder="••••••••"
              disabled={isPending}
              className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-10 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50 transition-colors"
              required
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* New Password */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-slate-700">New Password</label>
          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type={showNew ? 'text' : 'password'}
              value={formData.new_password}
              onChange={(e) => setFormData(prev => ({ ...prev, new_password: e.target.value }))}
              placeholder="Min. 8 characters"
              disabled={isPending}
              className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-10 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50 transition-colors"
              required
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Confirm New Password */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-slate-700">Confirm New Password</label>
          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="password"
              value={formData.confirm_password}
              onChange={(e) => setFormData(prev => ({ ...prev, confirm_password: e.target.value }))}
              placeholder="Confirm new password"
              disabled={isPending}
              className={cn(
                "w-full rounded-lg border bg-white pl-9 pr-10 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 transition-colors",
                formData.confirm_password && formData.new_password !== formData.confirm_password 
                  ? "border-red-400 focus:border-red-500 ring-red-500/10" 
                  : "border-slate-300 focus:border-blue-500"
              )}
              required
            />
          </div>
          {formData.confirm_password && formData.new_password !== formData.confirm_password && (
            <span className="text-[11px] font-medium text-red-500">Passwords do not match.</span>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {getPasswordError(error)}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending || !isFormValid}
          className="flex items-center justify-center gap-2 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {isPending ? 'Updating password...' : 'Update Password'}
        </button>

        {isSuccess && (
          <div className="flex items-center justify-center gap-2 text-sm font-medium text-green-600 p-2 border border-green-100 bg-green-50 rounded-lg">
            <CheckCircle2 className="h-4 w-4" />
            Password updated successfully
          </div>
        )}
      </form>
    </div>
  );
};
