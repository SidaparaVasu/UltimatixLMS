import { ChangePasswordForm } from '@/modules/security/ChangePasswordForm';
import { ActiveSessionsList } from '@/modules/security/ActiveSessionsList';

export const SecuritySettingsPage = () => {
  return (
    <>
      <div className="anim delay-1">
        <h1 style={{ fontSize: '24px', fontWeight: '600', marginBottom: 'var(--space-4)', padding: '0 var(--space-4)' }}>Security Settings</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-8)', padding: 'var(--space-4)' }}>
        <section className="anim delay-2">
          <ChangePasswordForm />
        </section>

        <section className="anim delay-3">
          <ActiveSessionsList />
        </section>
      </div>
    </>
  );
};

export default SecuritySettingsPage;
