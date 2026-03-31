import { useState } from 'react';
import { User, Phone, Calendar, Mail, CheckCircle2, Loader2, Save } from 'lucide-react';
import { useUpdateProfile, getProfileError } from '@/queries/auth/useUpdateProfile';
import type { User as UserType, ProfileUpdateRequest } from '@/types/auth.types';

interface ProfileEditFormProps {
  user: UserType;
  onCancel?: () => void;
}

export const ProfileEditForm = ({ user, onCancel }: ProfileEditFormProps) => {
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
    updateProfile(formData, {
      onSuccess: () => {
        if (onCancel) onCancel();
      }
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ 
      ...prev, 
      [name]: (name === 'gender' && value === '') ? null : value 
    }));
  };

  return (
    <div className="chart-panel">
      <form onSubmit={handleSubmit} style={{ maxWidth: 800 }}>
        <div className="settings-grid">
          {/* First Name */}
          <div className="form-group">
            <label htmlFor="first_name" className="form-label">First Name</label>
            <div className="form-control-wrap">
              <User className="form-control-icon" size={16} />
              <input
                id="first_name"
                name="first_name"
                type="text"
                value={formData.first_name}
                onChange={handleChange}
                placeholder="John"
                disabled={isPending}
                className="form-control has-icon"
              />
            </div>
          </div>

          {/* Last Name */}
          <div className="form-group">
            <label htmlFor="last_name" className="form-label">Last Name</label>
            <div className="form-control-wrap">
              <User className="form-control-icon" size={16} />
              <input
                id="last_name"
                name="last_name"
                type="text"
                value={formData.last_name}
                onChange={handleChange}
                placeholder="Doe"
                disabled={isPending}
                className="form-control has-icon"
              />
            </div>
          </div>
        </div>

        <div className="settings-grid">
          {/* Phone Number */}
          <div className="form-group">
            <label htmlFor="phone_number" className="form-label">Phone Number</label>
            <div className="form-control-wrap">
              <Phone className="form-control-icon" size={16} />
              <input
                id="phone_number"
                name="phone_number"
                type="tel"
                value={formData.phone_number}
                onChange={handleChange}
                placeholder="+91 1234567890"
                disabled={isPending}
                className="form-control has-icon"
              />
            </div>
          </div>

          {/* Gender */}
          <div className="form-group">
            <label htmlFor="gender" className="form-label">Gender</label>
            <select
              id="gender"
              name="gender"
              value={formData.gender ?? ''}
              onChange={handleChange}
              disabled={isPending}
              className="form-control"
            >
              <option value="">Not Specified</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
              <option value="O">Other</option>
            </select>
          </div>
        </div>

        {/* Date of Birth */}
        <div className="form-group" style={{ maxWidth: 'calc(50% - var(--space-5)/2)' }}>
          <label htmlFor="date_of_birth" className="form-label">Date of Birth</label>
          <div className="form-control-wrap">
            <Calendar className="form-control-icon" size={16} />
            <input
              id="date_of_birth"
              name="date_of_birth"
              type="date"
              value={formData.date_of_birth}
              onChange={handleChange}
              disabled={isPending}
              className="form-control has-icon"
            />
          </div>
        </div>

        {error && (
          <div className="alert alert-error">
            {getProfileError(error)}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: 'var(--space-2)' }}>
          <button type="submit" disabled={isPending} className="btn">
            {isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isPending ? 'Saving...' : 'Save Changes'}
          </button>
          
          {onCancel && (
            <button type="button" onClick={onCancel} disabled={isPending} className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: '40px', padding: '0 var(--space-5)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', fontWeight: 600, cursor: 'pointer' }}>
              Cancel
            </button>
          )}

          {isSuccess && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-success)', fontSize: '13px', fontWeight: 500 }}>
              <CheckCircle2 size={16} />
              Profile updated successfully
            </div>
          )}
        </div>
      </form>
    </div>
  );
};
