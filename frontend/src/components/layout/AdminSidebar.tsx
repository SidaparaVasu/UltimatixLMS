import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/utils/cn';
import { 
  Users, 
  ShieldAlert, 
  Settings, 
  LayoutDashboard, 
  BarChart,
  User,
  ShieldCheck,
  Building2,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { getFullName, getInitials, getPrimaryRoleName } from "@/utils/user.utils";

export const AdminSidebar = () => {
  const { isSidebarOpen } = useUIStore();
  const { user } = useAuthStore();
  const location = useLocation();

  const sections = [
    {
      title: "Administration",
      items: [
        { label: "Dashboard", icon: LayoutDashboard, path: "/admin", badge: null },
        { label: "User Management", icon: Users, path: "/admin/users", badge: null },
        { label: "Roles & Permissions", icon: ShieldAlert, path: "/admin/roles", badge: null },
      ]
    },
    {
      title: "Organization",
      items: [
        { label: "Business Units", icon: Building2, path: "/admin/business-units", badge: null },
      ]
    },
    {
      title: "System",
      items: [
        { label: "Audit Reports", icon: BarChart, path: "/admin/reports", badge: null },
        { label: "Settings", icon: Settings, path: "/admin/settings", badge: null },
      ]
    },
    {
      title: "Account",
      items: [
        { label: "My Profile", icon: User, path: "/profile", badge: null },
        { label: "Security", icon: ShieldCheck, path: "/security", badge: null },
      ]
    }
  ];

  const fullName = getFullName(user);
  const initials = getInitials(user);
  const roleName = getPrimaryRoleName(user);

  return (
    <aside className="sidebar" style={{ borderRight: '1px solid var(--color-danger)', borderRightColor: 'rgba(220, 38, 38, 0.2)' }}>
      {/* Sidebar Logo Section */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark">
          <img 
            src="/assets/images/ultimatix-logo.jpg" 
            alt="Ultimatix Logo" 
            className="sidebar-logo-img w-full h-full object-contain rounded-[inherit]"
          />
        </div>
        <span className="sidebar-logo-text">Ultimatix Admin</span>
      </div>

      {/* Navigation Section */}
      <nav className="sidebar-nav">
        {sections.map((section) => (
          <div key={section.title}>
            <div className="nav-section-label">{section.title}</div>
            {section.items.map((item) => (
              <Link
                key={item.label}
                to={item.path}
                className={cn(
                  "nav-item",
                  location.pathname === item.path && "active"
                )}
              >
                <item.icon size={18} />
                <span className="nav-item-label">{item.label}</span>
                {item.badge && <span className="nav-badge">{item.badge}</span>}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      {/* Sidebar User Section */}
      <div className="sidebar-user">
        <div className="sidebar-avatar">{initials}</div>
        <div className="sidebar-user-info">
          <div className="sidebar-user-name">{fullName}</div>
          <div className="sidebar-user-role">{roleName}</div>
        </div>
        {!isSidebarOpen && <div className="sidebar-avatar opacity-0"></div>}
      </div>
    </aside>
  );
};
