import { useUIStore, type DashboardView } from "@/stores/uiStore";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/utils/cn";
import {
  LayoutDashboard,
  BookOpen,
  Calendar,
  CheckSquare,
  Award,
  Trophy,
  Star,
  User,
  ShieldCheck,
  Users,
  Building2,
  Network,
  MapPin,
  ClipboardList,
  BarChart2,
  Settings,
  GraduationCap,
  BookMarked,
  ChartNoAxesColumn,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { getFullName, getInitials, getPrimaryRoleName } from "@/utils/user.utils";
import { getAllowedViews } from "@/pages/dashboard/DashboardPage";

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  badge?: string | null;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

// ─── Nav definitions per dashboard view ──────────────────────────────────────

const EMPLOYEE_NAV: NavSection[] = [
  {
    title: "General",
    items: [
      { label: "Overview",          icon: LayoutDashboard, path: "/dashboard" },
      { label: "My Learning",       icon: Star,            path: "/my-learning", badge: null },
      { label: "Explore Courses",   icon: BookOpen,        path: "/courses" },
      { label: "Skill Assessment",  icon: ClipboardList,   path: "/my-tni" },
      { label: "Skill Matrix",      icon: GraduationCap,   path: "/my-skills" },
    ],
  },
  {
    title: "Training",
    items: [
      { label: "Training Calendar", icon: Calendar,     path: "/training-calendar" },
      { label: "Assessments",       icon: CheckSquare,  path: "/assessments", badge: null },
      { label: "Certifications",    icon: Award,        path: "/certifications" },
    ],
  },
  {
    title: "Analytics",
    items: [
      { label: "Reports",      icon: ChartNoAxesColumn, path: "/reports" },
      { label: "Leaderboard",  icon: Trophy,            path: "/leaderboard" },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "My Profile", icon: User,        path: "/profile" },
      { label: "Security",   icon: ShieldCheck, path: "/security" },
    ],
  },
];

const HR_NAV: NavSection[] = [
  {
    title: "Overview",
    items: [
      { label: "HR Dashboard",    icon: LayoutDashboard, path: "/dashboard" },
      { label: "Employees",       icon: Users,           path: "/admin/employees" },
    ],
  },
  {
    title: "Learning",
    items: [
      { label: "Courses",         icon: BookOpen,        path: "/courses" },
      { label: "Enrollments",     icon: BookMarked,      path: "/my-learning" },
      { label: "Training Calendar", icon: Calendar,     path: "/training-calendar" },
      { label: "Certifications",  icon: Award,           path: "/certifications" },
    ],
  },
  {
    title: "Management",
    items: [
      { label: "TNI Rating/Review", icon: Users,          path: "/manager/tni" },
      { label: "Training Needs",    icon: ClipboardList,  path: "/admin/tni" },
      { label: "Training Plans",    icon: GraduationCap,  path: "/admin/training-plans" },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "My Profile", icon: User,        path: "/profile" },
      { label: "Security",   icon: ShieldCheck, path: "/security" },
    ],
  },
];

const ADMIN_NAV: NavSection[] = [
  {
    title: "Overview",
    items: [
      { label: "Admin Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    ],
  },
  {
    title: "Organisation",
    items: [
      { label: "Employees",       icon: Users,         path: "/admin/employees" },
      { label: "Business Units",  icon: Building2, path: "/admin/business-units" },
      { label: "Departments",     icon: Network, path: "/admin/departments" },
      { label: "Job Roles",       icon: ClipboardList, path: "/admin/job-roles" },
      { label: "Unit Locations",  icon: MapPin, path: "/admin/unit-locations" },
    ],
  },
  {
    title: "Learning",
    items: [
      { label: "Courses",                  icon: BookOpen,      path: "/admin/courses" },
      { label: "Course Categories",               icon: BookMarked,    path: "/admin/course-categories" },
      { label: "Competencies & Skills",    icon: GraduationCap, path: "/admin/competency" },
    ],
  },
  {
    title: "Training",
    items: [
      { label: "Training Calendar", icon: Calendar,     path: "/admin/training-calendar" },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Roles",           icon: ShieldCheck,   path: "/admin/roles" },
      { label: "Reports",         icon: BarChart2,     path: "/admin/reports" },
      { label: "Settings",        icon: Settings,      path: "/admin/settings" },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "My Profile", icon: User,        path: "/profile" },
      { label: "Security",   icon: ShieldCheck, path: "/security" },
    ],
  },
];

const NAV_BY_VIEW: Record<DashboardView, NavSection[]> = {
  employee: EMPLOYEE_NAV,
  manager:  HR_NAV,
  admin:    ADMIN_NAV,
};

// ─── Component ───────────────────────────────────────────────────────────────

export const Sidebar = () => {
  const { isSidebarOpen, activeDashboardView } = useUIStore();
  const { user } = useAuthStore();
  const location = useLocation();

  const roleCodes  = user?.roles?.map((r) => r.role_code) ?? [];
  const allowedViews = getAllowedViews(roleCodes);

  // Use the active view only if the user is actually allowed to see it
  const view: DashboardView = allowedViews.includes(activeDashboardView)
    ? activeDashboardView
    : 'employee';

  const sections = NAV_BY_VIEW[view];

  const fullName = getFullName(user);
  const initials = getInitials(user);
  const roleName = getPrimaryRoleName(user);

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark">
          <img
            src="/assets/images/ultimatix-logo.jpg"
            alt="Ultimatix LMS"
            className="sidebar-logo-img w-full h-full object-contain rounded-[inherit]"
          />
        </div>
        <span className="sidebar-logo-text">Ultimatix LMS</span>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {sections.map((section) => (
          <div key={section.title}>
            <div className="nav-section-label">{section.title}</div>
            {section.items.map((item) => (
              <Link
                key={item.path}
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

      {/* User footer */}
      <div className="sidebar-user">
        <div className="sidebar-avatar">{initials}</div>
        <div className="sidebar-user-info">
          <div className="sidebar-user-name">{fullName}</div>
          <div className="sidebar-user-role">{roleName}</div>
        </div>
        {!isSidebarOpen && <div className="sidebar-avatar opacity-0" />}
      </div>
    </aside>
  );
};
