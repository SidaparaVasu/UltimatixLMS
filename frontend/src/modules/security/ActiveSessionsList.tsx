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
      <div className="flex py-12 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Failed to load active sessions.
      </div>
    );
  }

  const activeSessions = (sessions as any[])?.filter(s => s.is_active) || [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 mb-2">
        <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-blue-600" />
          Current Active Logins
        </h3>
        <p className="text-sm text-slate-500">
          Managed your active sessions across different devices and browsers.
        </p>
      </div>

      <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white overflow-hidden">
        {activeSessions.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500 italic">No active sessions found.</div>
        ) : (
          activeSessions.map((session) => {
            const Icon = getDeviceIcon(session.user_agent);
            return (
              <div key={session.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-slate-100/80 text-slate-500 border border-slate-200">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-slate-900 truncate max-w-[200px] md:max-w-md">
                      {session.user_agent}
                    </span>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        {session.ip_address}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(session.login_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => revokeSession(session.id)}
                  disabled={isRevoking}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100 active:bg-red-100 disabled:opacity-50"
                  title="Revoke session"
                >
                  {isRevoking ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
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
