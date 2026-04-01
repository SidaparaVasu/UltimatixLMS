import { useState, useRef, useEffect } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { Bell, Menu, Search, Repeat, ChevronDown, LayoutDashboard, ShieldUser, ShieldCogCorner } from 'lucide-react';
import { ThemeSwitcher } from '@/components/layout/ThemeSwitcher';
import { UserMenu } from '@/components/layout/UserMenu';
import { useLocation, Link } from 'react-router-dom';

// Dashboard option definition
interface DashboardOption {
  label: string;
  path: string;
  icon: React.ReactNode;
}

export const Header = () => {
  const { toggleSidebar } = useUIStore();
  const { user } = useAuthStore();
  const location = useLocation();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.roles.some(r =>
    ['ADMIN', 'SUPER_ADMIN', 'HR', 'LMS_ADMIN'].includes(r.role_code)
  );
  const isCurrentlyAdmin = location.pathname.startsWith('/admin');

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

  // Build available dashboard options based on user roles
  const dashboardOptions: DashboardOption[] = [
    {
      label: 'User Dashboard',
      path: '/dashboard',
      icon: <LayoutDashboard size={15} strokeWidth={1.75} />,
    },
    ...(isAdmin ? [{
      label: 'Admin Dashboard',
      path: '/admin',
      icon: <ShieldUser size={21} strokeWidth={1.5} />,
    }] : []),
  ];

  const activePath = isCurrentlyAdmin ? '/admin' : '/dashboard';

  return (
    <header className="topnav">
      {/* Sidebar Toggle */}
      <button
        onClick={toggleSidebar}
        className="topnav-toggle"
        title="Toggle sidebar"
      >
        <Menu size={18} />
      </button>

      {/* Page Title */}
      <span className="topnav-title"></span>

      {/* Global Search */}
      <div className="topnav-search">
        <Search className="topnav-search-icon" size={14} />
        <input type="text" placeholder="Search courses, skills..." />
      </div>

      {/* Right Actions */}
      <div className="topnav-actions">

        {/* Notifications */}
        <button className="topnav-icon-btn" title="Notifications">
          <Bell size={18} />
          <span className="notif-dot"></span>
        </button>

        {/* Theme Switcher */}
        <ThemeSwitcher />

        {/* Switch Dashboard dropdown */}
        <div ref={dropdownRef} style={{ position: 'relative', flexShrink: 0 }}>

          {/* Trigger button */}
          <button
            onClick={() => setDropdownOpen(prev => !prev)}
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
            onMouseEnter={e => {
              if (!dropdownOpen) {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.background = 'var(--color-surface-alt)';
                el.style.color = 'var(--color-text-primary)';
                el.style.borderColor = 'var(--color-border-strong)';
              }
            }}
            onMouseLeave={e => {
              if (!dropdownOpen) {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.background = 'transparent';
                el.style.color = 'var(--color-text-secondary)';
                el.style.borderColor = 'var(--color-border)';
              }
            }}
          >
            <Repeat size={14} strokeWidth={2} style={{ flexShrink: 0 }} />
            Switch Dashboard
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

          {/* Dropdown panel */}
          {dropdownOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              minWidth: '232px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)',
              overflow: 'hidden',
              zIndex: 200,
              animation: 'ddFadeIn 140ms ease both',
            }}>
              <style>{`
                @keyframes ddFadeIn {
                  from { opacity: 0; transform: translateY(-6px); }
                  to   { opacity: 1; transform: translateY(0); }
                }
              `}</style>

              {/* Header label */}
              <div style={{
                padding: '10px 14px 8px',
                borderBottom: '1px solid var(--color-border)',
              }}>
                <p style={{
                  margin: 0,
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--color-sidebar-text)',
                }}>
                  Your Dashboards
                </p>
              </div>

              {/* Dashboard options */}
              <div style={{ padding: '6px', gap: '2px', display: 'flex', flexDirection: 'column' }}>
                {dashboardOptions.map(opt => {
                  const isActive = activePath === opt.path;
                  return (
                    <Link
                      key={opt.path}
                      to={opt.path}
                      onClick={() => setDropdownOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '9px 10px',
                        borderRadius: 'var(--radius-md)',
                        textDecoration: 'none',
                        background: isActive ? 'var(--color-accent-subtle)' : 'transparent',
                        transition: 'background-color 120ms ease',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={e => {
                        if (!isActive)
                          (e.currentTarget as HTMLAnchorElement).style.background = 'var(--color-surface-alt)';
                      }}
                      onMouseLeave={e => {
                        if (!isActive)
                          (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
                      }}
                    >

                      {/* Icon */}
                      <div style={{
                        width: '30px', height: '30px',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                        background: isActive ? 'var(--color-accent)' : 'var(--color-surface-alt)',
                        color: isActive ? '#fff' : 'var(--color-text-secondary)',
                      }}>
                        {opt.icon}
                      </div>

                      {/* Label */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          margin: 0,
                          fontSize: 'var(--text-sm)',
                          fontWeight: isActive ? 600 : 500,
                          color: isActive ? 'var(--color-accent)' : 'var(--color-text-primary)',
                          lineHeight: 1.3,
                        }}>
                          {opt.label}
                        </p>
                      </div>

                      {/* Active indicator dot */}
                      {isActive && (
                        <div style={{
                          width: '7px', height: '7px',
                          borderRadius: '50%',
                          background: 'var(--color-accent)',
                          flexShrink: 0,
                        }} />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <UserMenu />
      </div>
    </header>
  );
};