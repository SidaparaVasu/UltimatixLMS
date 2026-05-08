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
  Network,
  MapPin,
  Briefcase,
  Users2,
  Brain,
  BookOpen,
  Blocks,
  ClipboardList,
  CalendarDays,
  CheckCircle,
  HelpCircle,
  ClipboardCheck,
  TrendingUp,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { getFullName, getInitials, getPrimaryRoleName } from "@/utils/user.utils";
import { usePermission } from '@/hooks/usePermission';
import { PERMISSIONS } from '@/constants/permissions';

export const AdminSidebar = () => {
  const { isSidebarOpen } = useUIStore();
  const { user } = useAuthStore();
  const location = useLocation();

  // Permission checks for the Assessments section
  const canManageAssessments  = usePermission(PERMISSIONS.ASSESSMENT_MANAGE);
  const canReviewAssessments  = usePermission(PERMISSIONS.ASSESSMENT_REVIEW_MANAGE);
  const canApproveSkillUpgrade = usePermission(PERMISSIONS.SKILL_UPGRADE_APPROVE);

  // Build assessment items dynamically based on permissions
  const assessmentItems = [
    ...(canManageAssessments ? [
      { label: "Question Bank",  icon: HelpCircle,     path: "/admin/assessments/questions", badge: null },
      { label: "Assessments",    icon: ClipboardCheck, path: "/admin/assessments",           badge: null },
    ] : []),
    ...(canReviewAssessments ? [
      { label: "Review Queue",   icon: ClipboardList,  path: "/admin/assessments/review",    badge: null },
    ] : []),
    ...(canApproveSkillUpgrade ? [
      { label: "Skill Upgrades", icon: TrendingUp,     path: "/admin/assessments/skill-upgrades", badge: null },
    ] : []),
  ];

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
        { label: "Employee Directory", icon: Users2, path: "/admin/employees", badge: null },
        { label: "Business Units", icon: Building2, path: "/admin/business-units", badge: null },
        { label: "Departments", icon: Network, path: "/admin/departments", badge: null },
        { label: "Unit Locations", icon: MapPin, path: "/admin/unit-locations", badge: null },
        { label: "Job Roles", icon: Briefcase, path: "/admin/job-roles", badge: null },
      ]
    },
    {
      title: "Skill Management",
      items: [
        { label: "Competency & Skills", icon: Brain, path: "/admin/competency", badge: null },
      ]
    },
    {
      title: "Training",
      items: [
        { label: "Training Plans",    icon: ClipboardList, path: "/admin/training-plans",    badge: null },
        { label: "Training Calendar", icon: CalendarDays,  path: "/admin/training-calendar", badge: null },
        { label: "Approvals",         icon: CheckCircle,   path: "/admin/approvals",         badge: null },
      ]
    },
    {
      title: "Course Management",
      items: [
        { label: "Course Categories", icon: BookOpen, path: "/admin/course-categories", badge: null },
        { label: "Course Catalog", icon: Blocks, path: "/admin/courses", badge: null },
      ]
    },
    // Assessments section — items are permission-gated (built above)
    ...(assessmentItems.length > 0 ? [{
      title: "Assessments",
      items: assessmentItems,
    }] : []),
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
                  (location.pathname === item.path ||
                    (item.path !== '/admin' && location.pathname.startsWith(item.path))
                  ) && "active"
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
