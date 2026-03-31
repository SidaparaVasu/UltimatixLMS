import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { Bell, Menu, Search } from 'lucide-react';
import { getFullName, getInitials } from '@/utils/user.utils';
import { ThemeSwitcher } from '@/components/layout/ThemeSwitcher';

export const Header = () => {
  const { toggleSidebar } = useUIStore();
  const { user } = useAuthStore();

  const fullName = getFullName(user);
  const initials = getInitials(user);

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

      {/* Page Title (Optional or context based) */}
      <span className="topnav-title"></span>

      {/* Global Search */}
      <div className="topnav-search">
        <Search className="topnav-search-icon" size={14} />
        <input type="text" placeholder="Search courses, skills..." />
      </div>

      {/* Right Actions */}
      <div className="topnav-actions">
        <button className="topnav-icon-btn" title="Notifications">
          <Bell size={18} />
          <span className="notif-dot"></span>
        </button>
        <ThemeSwitcher />
        <div className="topnav-avatar" title={fullName}>{initials}</div>
      </div>
    </header>
  );
};
