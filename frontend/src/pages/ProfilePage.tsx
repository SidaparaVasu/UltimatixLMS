import { useState } from 'react';
import { ProfileEditForm } from '@/modules/profile/ProfileEditForm';
import { useProfile } from '@/queries/auth/useProfile';
import { Loader2, Pencil, Check, Lock, Calendar, Phone, User as UserIcon } from 'lucide-react';
import { getFullName, getInitials } from '@/utils/user.utils';

export const ProfilePage = () => {
  const { data: user, isLoading, error } = useProfile();
  const [isEditing, setIsEditing] = useState(false);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', minHeight: '400px', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: 'var(--color-text-muted)' }} />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="alert alert-error" style={{ margin: 'var(--space-8)' }}>
        Failed to load profile.
      </div>
    );
  }

  const fullName = getFullName(user);
  const initials = getInitials(user);

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  };

  const getGenderLabel = (gender?: string | null) => {
    switch (gender) {
      case 'M': return 'Male';
      case 'F': return 'Female';
      case 'O': return 'Other';
      default: return '-';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', maxWidth: '100vw' }}>
      
      <div className="anim delay-1">
        <h1 style={{ fontSize: '24px', fontWeight: '600' }}>My Profile</h1>
      </div>

      {/* Profile Header Card */}
      <div className="anim delay-1" style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        padding: 'var(--space-6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-5)' }}>
          {/* Avatar Area */}
          <div style={{ position: 'relative' }}>
            {user.profile?.profile_image_url ? (
              <img 
                src={user.profile.profile_image_url} 
                alt={fullName}
                style={{
                  width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover',
                  border: '3px solid var(--color-surface)', boxShadow: '0 0 0 1px var(--color-border)'
                }}
              />
            ) : (
              <div style={{
                width: '80px', height: '80px', borderRadius: '50%',
                background: '#a56c4a', color: '#fff', 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '28px', fontWeight: 700,
                border: '3px solid var(--color-surface)', boxShadow: '0 0 0 1px var(--color-border)'
              }}>
                {initials}
              </div>
            )}
            {/* Online Indicator */}
            <div style={{
              position: 'absolute', bottom: '2px', right: '2px',
              width: '16px', height: '16px', borderRadius: '50%',
              background: 'var(--color-success)', border: '3px solid var(--color-surface)'
            }} />
          </div>

          {/* User Info Texts */}
          <div style={{ display: 'flex', flexDirection: 'column'}}>
            <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
              {fullName}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                {user.email}
              </span>
              
              {user.is_email_verified && (
                <span style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  background: '#ECFDF5', color: '#10B981', 
                  padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600
                }}>
                  <Check size={12} strokeWidth={3} /> Email Verified
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="anim delay-2">
        {isEditing ? (
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 'var(--space-4)' }}>
              Edit Personal Information
            </h2>
            <ProfileEditForm user={user} onCancel={() => setIsEditing(false)} />
          </div>
        ) : (
          <div style={{
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-sm)',
            overflow: 'hidden'
          }}>
            {/* Panel Header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: 'var(--space-4) var(--space-5)',
              background: 'var(--color-surface)',
              borderBottom: '1px solid var(--color-border)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-primary)', fontWeight: 600, fontSize: '14px' }}>
                <UserIcon size={16} style={{ color: 'var(--color-text-primary)' }} />
                Personal Information
              </div>
              {/* Global Action */}
              <button 
                className={isEditing ? 'btn-secondary' : 'btn'}
                style={{  }}
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? (
                  <>Cancel Edit</>
                ) : (
                  <><Pencil size={14} /> Edit Profile</>
                )}
              </button>
            </div>

            {/* Panel Body - Grid Layout */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
            }}>
              {/* Field: First Name */}
              <div style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--color-border)', borderRight: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
                  First Name
                </div>
                <div style={{ fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: 500 }}>
                  {user.profile?.first_name || '-'}
                </div>
              </div>

              {/* Field: Last Name */}
              <div style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
                  Last Name
                </div>
                <div style={{ fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: 500 }}>
                  {user.profile?.last_name || '-'}
                </div>
              </div>

              {/* Field: Phone Number */}
              <div style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--color-border)', borderRight: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
                  Phone Number
                </div>
                <div style={{ fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: 500, fontFamily: 'var(--font-mono)' }}>
                  {user.profile?.phone_number || '-'}
                </div>
              </div>

              {/* Field: Date of Birth */}
              <div style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
                  Date of Birth
                </div>
                <div style={{ fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={14} style={{ color: 'var(--color-text-muted)' }} />
                  {formatDate(user.profile?.date_of_birth)}
                </div>
              </div>

              {/* Field: Gender */}
              <div style={{ padding: 'var(--space-4) var(--space-5)', borderRight: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
                  Gender
                </div>
                <div style={{ fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <UserIcon size={14} style={{ color: 'var(--color-text-muted)' }} />
                  {getGenderLabel(user.profile?.gender)}
                </div>
              </div>

              {/* Empty slot because department is removed */}
              <div style={{ padding: 'var(--space-4) var(--space-5)' }}>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
