import { Loader2, Monitor, Smartphone, Tablet, XCircle, ShieldCheck, Clock } from 'lucide-react';
import { useSessions } from '@/queries/auth/useSessions';
import { useRevokeSession } from '@/queries/auth/useRevokeSession';

const getDeviceIcon = (userAgent: string) => {
  const ua = userAgent.toLowerCase();
  if (ua.includes('mobi') || ua.includes('android')) return Smartphone;
  if (ua.includes('tablet') || ua.includes('ipad')) return Tablet;
  return Monitor;
};

export const ActiveSessionsList = () => {
  const { data: sessions, isLoading, error } = useSessions();
  const { mutate: revokeSession, isPending: isRevoking } = useRevokeSession();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', padding: '48px 0', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: 'var(--color-text-muted)' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        Failed to load active sessions.
      </div>
    );
  }

  const activeSessions = (sessions as any[])?.filter(s => s.is_active) || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
        <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={20} style={{ color: 'var(--color-accent)' }} />
          Current Active Logins
        </h3>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
          Manage your active sessions across different devices and browsers.
        </p>
      </div>

      <div className="session-list">
        {activeSessions.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
            No active sessions found.
          </div>
        ) : (
          activeSessions.map((session) => {
            const Icon = getDeviceIcon(session.user_agent);
            return (
              <div key={session.id} className="session-item">
                <div className="session-info">
                  <div className="session-icon-wrap">
                    <Icon size={20} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div className="session-name" title={session.user_agent}>
                      {session.user_agent.length > 60 ? session.user_agent.substring(0, 60) + '...' : session.user_agent}
                      {/* {session.user_agent} */}
                    </div>
                    <div className="session-meta-row">
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-success)' }} />
                        {session.ip_address}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} />
                        {new Date(session.login_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  className="btn btn-danger"
                  style={{ height: '32px', padding: '0 12px', fontSize: '12px' }}
                  onClick={() => revokeSession(session.id)}
                  disabled={isRevoking}
                  title="Revoke session"
                >
                  {isRevoking ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                  Terminate
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
