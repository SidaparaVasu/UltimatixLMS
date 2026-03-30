import { useUIStore } from "@/stores/uiStore";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/utils/cn";
import { 
  ChartNoAxesColumn, 
  BookOpen, 
  Calendar, 
  CheckSquare, 
  LayoutDashboard, 
  Award, 
  Trophy,
  Star,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { getFullName, getInitials, getPrimaryRoleName } from "@/utils/user.utils";

export const Sidebar = () => {
  const { isSidebarOpen } = useUIStore();
  const { user } = useAuthStore();
  const location = useLocation();

  const sections = [
    {
      title: "General",
      items: [
        { label: "Overview", icon: LayoutDashboard, path: "/dashboard", badge: null },
        { label: "My Courses", icon: BookOpen, path: "/courses", badge: "3" },
        { label: "Skill Matrix", icon: Star, path: "/skills", badge: null },
      ]
    },
    {
      title: "Training",
      items: [
        { label: "Training Calendar", icon: Calendar, path: "/calendar", badge: null },
        { label: "Assessments", icon: CheckSquare, path: "/assessments", badge: "1" },
        { label: "Certifications", icon: Award, path: "/certifications", badge: null },
      ]
    },
    {
      title: "Analytics",
      items: [
        { label: "Reports", icon: ChartNoAxesColumn, path: "/reports", badge: null },
        { label: "Leaderboard", icon: Trophy, path: "/leaderboard", badge: null },
      ]
    }
  ];

  const fullName = getFullName(user);
  const initials = getInitials(user);
  const roleName = getPrimaryRoleName(user);

  return (
    <aside className="sidebar">
      {/* Sidebar Logo Section */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark">
          <img 
            src="/assets/images/ultimatix-logo.jpg" 
            alt="Ultimatix Logo" 
            className="sidebar-logo-img w-full h-full object-contain rounded-[inherit]"
          />
        </div>
        <span className="sidebar-logo-text">Ultimatix LMS</span>
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
