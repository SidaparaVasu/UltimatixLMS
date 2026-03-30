import { useState } from 'react';
import { User, Phone, Calendar, Mail, CheckCircle2, Loader2, Save } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useUpdateProfile, getProfileError } from '@/queries/auth/useUpdateProfile';
import type { User as UserType, ProfileUpdateRequest } from '@/types/auth.types';

interface ProfileEditFormProps {
  user: UserType;
}

export const ProfileEditForm = ({ user }: ProfileEditFormProps) => {
  const [formData, setFormData] = useState<ProfileUpdateRequest>({
    first_name: user.profile?.first_name || '',
    last_name: user.profile?.last_name || '',
    phone_number: user.profile?.phone_number || '',
    date_of_birth: user.profile?.date_of_birth || '',
    gender: user.profile?.gender || null,
  });

  const { mutate: updateProfile, isPending, isSuccess, error } = useUpdateProfile();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ 
      ...prev, 
      [name]: (name === 'gender' && value === '') ? null : value 
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-2xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* First Name */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="first_name" className="text-sm font-semibold text-slate-700">First Name</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              id="first_name"
              name="first_name"
              type="text"
              value={formData.first_name}
              onChange={handleChange}
              placeholder="John"
              disabled={isPending}
              className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3.5 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50 transition-colors"
            />
          </div>
        </div>

        {/* Last Name */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="last_name" className="text-sm font-semibold text-slate-700">Last Name</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              id="last_name"
              name="last_name"
              type="text"
              value={formData.last_name}
              onChange={handleChange}
              placeholder="Doe"
              disabled={isPending}
              className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3.5 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50 transition-colors"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Phone Number */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="phone_number" className="text-sm font-semibold text-slate-700">Phone Number</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              id="phone_number"
              name="phone_number"
              type="tel"
              value={formData.phone_number}
              onChange={handleChange}
              placeholder="+91 1234567890"
              disabled={isPending}
              className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3.5 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50 transition-colors"
            />
          </div>
        </div>

        {/* Gender */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="gender" className="text-sm font-semibold text-slate-700">Gender</label>
          <select
            id="gender"
            name="gender"
            value={formData.gender ?? ''}
            onChange={handleChange}
            disabled={isPending}
            className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50 transition-colors outline-none"
          >
            <option value="">Not Specified</option>
            <option value="M">Male</option>
            <option value="F">Female</option>
            <option value="O">Other</option>
          </select>
        </div>
      </div>

      {/* Date of Birth */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="date_of_birth" className="text-sm font-semibold text-slate-700">Date of Birth</label>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            id="date_of_birth"
            name="date_of_birth"
            type="date"
            value={formData.date_of_birth}
            onChange={handleChange}
            disabled={isPending}
            className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3.5 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50 transition-colors"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {getProfileError(error)}
        </div>
      )}

      <div className="flex items-center gap-4 mt-2">
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center justify-center gap-2 min-w-[140px] rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {isPending ? 'Saving...' : 'Save Changes'}
        </button>
        {isSuccess && (
          <div className="flex items-center gap-2 text-sm font-medium text-green-600 animate-in fade-in slide-in-from-left-2">
            <CheckCircle2 className="h-4 w-4" />
            Profile updated successfully
          </div>
        )}
      </div>
    </form>
  );
};
