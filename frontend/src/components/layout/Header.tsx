import { useState, useRef, useEffect } from 'react';
import { useUIStore, type DashboardView } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { Bell, Menu, Repeat, ChevronDown, LayoutDashboard, ShieldCheck, Users } from 'lucide-react';
import { ThemeSwitcher } from '@/components/layout/ThemeSwitcher';
import { UserMenu } from '@/components/layout/UserMenu';
import { useLocation } from 'react-router-dom';
import { getAllowedViews } from '@/pages/dashboard/DashboardPage';

const VIEW_META: Record<DashboardView, { label: string; icon: React.ReactNode }> = {
  employee: { label: 'My Dashboard',    icon: <LayoutDashboard size={15} strokeWidth={1.75} /> },
  manager:  { label: 'Team Dashboard',  icon: <Users size={15} strokeWidth={1.75} /> },
  admin:    { label: 'Admin Dashboard', icon: <ShieldCheck size={15} strokeWidth={1.75} /> },
};

export const Header = () => {
  const { toggleSidebar, activeDashboardView, setDashboardView } = useUIStore();
  const { user } = useAuthStore();
  const location = useLocation();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const roleCodes = user?.roles?.map((r) => r.role_code) ?? [];
  const allowedViews = getAllowedViews(roleCodes);
  const isDashboardRoute = location.pathname === '/dashboard';

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [dropdownOpen]);

  // Close on route change
  useEffect(() => { setDropdownOpen(false); }, [location.pathname]);

  const activeView = allowedViews.includes(activeDashboardView) ? activeDashboardView : 'employee';
  const activeMeta = VIEW_META[activeView];

  // Only show the switcher on /dashboard and when the user has more than one view
  const showSwitcher = isDashboardRoute && allowedViews.length > 1;

  return (
    <header className="topnav">
      {/* Sidebar Toggle */}
      <button onClick={toggleSidebar} className="topnav-toggle" title="Toggle sidebar">
        <Menu size={18} />
      </button>

      <span className="topnav-title" />

      <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
        <div className="topnav-actions">

          {/* Notifications */}
          <button className="topnav-icon-btn" title="Notifications">
            <Bell size={18} />
            <span className="notif-dot" />
          </button>

          {/* Theme Switcher */}
          <ThemeSwitcher />

          {/* Dashboard switcher — only shown on /dashboard when user has multiple views */}
          {showSwitcher && (
            <div ref={dropdownRef} style={{ position: 'relative', flexShrink: 0 }}>
              <button
                onClick={() => setDropdownOpen((prev) => !prev)}
                title="Switch Dashboard"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  height: '34px',
                  padding: '0 12px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 500,
                  fontFamily: 'var(--font-body)',
                  color: dropdownOpen ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                  whiteSpace: 'nowrap',
                  border: '1px solid var(--color-border)',
                  background: dropdownOpen ? 'var(--color-surface-alt)' : 'transparent',
                  transition: 'background-color 150ms ease, color 150ms ease, border-color 150ms ease',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  if (!dropdownOpen) {
                    const el = e.currentTarget as HTMLButtonElement;
                    el.style.background = 'var(--color-surface-alt)';
                    el.style.color = 'var(--color-text-primary)';
                    el.style.borderColor = 'var(--color-border-strong)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!dropdownOpen) {
                    const el = e.currentTarget as HTMLButtonElement;
                    el.style.background = 'transparent';
                    el.style.color = 'var(--color-text-secondary)';
                    el.style.borderColor = 'var(--color-border)';
                  }
                }}
              >
                <Repeat size={14} strokeWidth={2} style={{ flexShrink: 0 }} />
                {activeMeta.label}
                <ChevronDown
                  size={13}
                  strokeWidth={2}
                  style={{
                    flexShrink: 0,
                    transition: 'transform 150ms ease',
                    transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                />
              </button>

              {dropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    minWidth: '220px',
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-lg)',
                    overflow: 'hidden',
                    zIndex: 200,
                    animation: 'ddFadeIn 140ms ease both',
                  }}
                >
                  <style>{`
                    @keyframes ddFadeIn {
                      from { opacity: 0; transform: translateY(-6px); }
                      to   { opacity: 1; transform: translateY(0); }
                    }
                  `}</style>

                  <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid var(--color-border)' }}>
                    <p style={{
                      margin: 0,
                      fontSize: '10px',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'var(--color-text-muted)',
                    }}>
                      Switch Dashboard
                    </p>
                  </div>

                  <div style={{ padding: '6px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {allowedViews.map((view) => {
                      const meta = VIEW_META[view];
                      const isActive = view === activeView;
                      return (
                        <button
                          key={view}
                          onClick={() => { setDashboardView(view); setDropdownOpen(false); }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '9px 10px',
                            borderRadius: 'var(--radius-md)',
                            border: 'none',
                            width: '100%',
                            textAlign: 'left',
                            background: isActive ? 'var(--color-accent-subtle)' : 'transparent',
                            cursor: 'pointer',
                            transition: 'background-color 120ms ease',
                          }}
                          onMouseEnter={(e) => {
                            if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-surface-alt)';
                          }}
                          onMouseLeave={(e) => {
                            if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                          }}
                        >
                          <div style={{
                            width: 30, height: 30,
                            borderRadius: 'var(--radius-sm)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                            background: isActive ? 'var(--color-accent)' : 'var(--color-surface-alt)',
                            color: isActive ? '#fff' : 'var(--color-text-secondary)',
                          }}>
                            {meta.icon}
                          </div>
                          <span style={{
                            flex: 1,
                            fontSize: 'var(--text-sm)',
                            fontWeight: isActive ? 600 : 500,
                            color: isActive ? 'var(--color-accent)' : 'var(--color-text-primary)',
                          }}>
                            {meta.label}
                          </span>
                          {isActive && (
                            <div style={{
                              width: 7, height: 7,
                              borderRadius: '50%',
                              background: 'var(--color-accent)',
                              flexShrink: 0,
                            }} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* User Menu */}
          <UserMenu />
        </div>
      </div>
    </header>
  );
};
