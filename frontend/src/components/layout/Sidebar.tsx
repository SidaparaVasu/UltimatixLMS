import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { usePermission } from "@/hooks/usePermission";
import { PERMISSIONS, type PermissionCode } from "@/constants/permissions";
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
  Bell,
  Brain,
  Blocks,
  CalendarDays,
  CheckCircle,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { getFullName, getInitials, getPrimaryRoleName } from "@/utils/user.utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  badge?: string | null;
  /** If set, the item is only rendered when the user holds this permission. */
  requiredPermission?: PermissionCode;
}

interface NavSection {
  title: string;
  items: NavItem[];
  /** If set, the entire section is hidden when the user holds none of its items' permissions. */
  requiresAnyPermission?: PermissionCode[];
}

// ---------------------------------------------------------------------------
// NAV_CONFIG — single source of truth for all navigation items
//
// Rules:
//   - Items with no requiredPermission are always visible to authenticated users.
//   - Items with requiredPermission are shown only when usePermission() returns true.
//   - Sections with no visible items are automatically hidden.
// ---------------------------------------------------------------------------

const NAV_CONFIG: NavSection[] = [
  // ── Learner (always visible) ──────────────────────────────────────────────
  {
    title: "General",
    items: [
      { label: "Overview",          icon: LayoutDashboard, path: "/dashboard" },
      { label: "My Learning",       icon: Star,            path: "/my-learning" },
      { label: "Explore Courses",   icon: BookOpen,        path: "/courses",             requiredPermission: PERMISSIONS.COURSE_VIEW },
      { label: "Skill Assessment",  icon: ClipboardList,   path: "/my-tni" },
      { label: "Skill Matrix",      icon: GraduationCap,   path: "/my-skills" },
    ],
  },
  {
    title: "Training",
    items: [
      { label: "Training Calendar", icon: Calendar,    path: "/training-calendar" },
      { label: "Assessments",       icon: CheckSquare, path: "/assessments",             requiredPermission: PERMISSIONS.ASSESSMENT_ATTEMPT },
      { label: "Certifications",    icon: Award,       path: "/certifications",          requiredPermission: PERMISSIONS.CERTIFICATE_VIEW },
    ],
  },

  // ── HR / Management ───────────────────────────────────────────────────────
  {
    title: "Management",
    requiresAnyPermission: [
      PERMISSIONS.EMPLOYEE_VIEW,
      PERMISSIONS.TNI_MANAGE,
      PERMISSIONS.TRAINING_PLAN_VIEW,
      PERMISSIONS.TRAINING_PLAN_APPROVE,
      PERMISSIONS.TRAINING_CALENDAR_APPROVE,
      PERMISSIONS.ENROLLMENT_MANAGE,
    ],
    items: [
      { label: "Employees",           icon: Users,         path: "/admin/employees",         requiredPermission: PERMISSIONS.EMPLOYEE_VIEW },
      { label: "Training Needs",      icon: ClipboardList, path: "/admin/tni",               requiredPermission: PERMISSIONS.TNI_MANAGE },
      { label: "Training Plans",      icon: GraduationCap, path: "/admin/training-plans",    requiredPermission: PERMISSIONS.TRAINING_PLAN_VIEW },
      { label: "Training Calendar",   icon: CalendarDays,  path: "/admin/training-calendar", requiredPermission: PERMISSIONS.TRAINING_CALENDAR_APPROVE },
      { label: "Approvals",           icon: CheckCircle,   path: "/admin/approvals",         requiredPermission: PERMISSIONS.TRAINING_PLAN_APPROVE },
    ],
  },

  // ── Organisation ──────────────────────────────────────────────────────────
  {
    title: "Organisation",
    requiresAnyPermission: [PERMISSIONS.ORG_STRUCTURE_MANAGE],
    items: [
      { label: "Business Units",  icon: Building2,     path: "/admin/business-units",  requiredPermission: PERMISSIONS.ORG_STRUCTURE_MANAGE },
      { label: "Departments",     icon: Network,       path: "/admin/departments",     requiredPermission: PERMISSIONS.ORG_STRUCTURE_MANAGE },
      { label: "Job Roles",       icon: ClipboardList, path: "/admin/job-roles",       requiredPermission: PERMISSIONS.ORG_STRUCTURE_MANAGE },
      { label: "Unit Locations",  icon: MapPin,        path: "/admin/unit-locations",  requiredPermission: PERMISSIONS.ORG_STRUCTURE_MANAGE },
    ],
  },

  // ── Content ───────────────────────────────────────────────────────────────
  {
    title: "Content",
    requiresAnyPermission: [
      PERMISSIONS.COURSE_CREATE,
      PERMISSIONS.COURSE_UPDATE,
      PERMISSIONS.COURSE_CATEGORY_MANAGE,
      PERMISSIONS.SKILL_MANAGE,
      PERMISSIONS.SKILL_CATEGORY_MANAGE,
      PERMISSIONS.ASSESSMENT_MANAGE,
    ],
    items: [
      { label: "Courses",                icon: Blocks,        path: "/admin/courses",           requiredPermission: PERMISSIONS.COURSE_UPDATE },
      { label: "Course Categories",      icon: BookMarked,    path: "/admin/course-categories", requiredPermission: PERMISSIONS.COURSE_CATEGORY_MANAGE },
      { label: "Competencies & Skills",  icon: Brain,         path: "/admin/competency",        requiredPermission: PERMISSIONS.SKILL_MANAGE },
    ],
  },

  // ── System ────────────────────────────────────────────────────────────────
  {
    title: "System",
    requiresAnyPermission: [
      PERMISSIONS.ROLE_VIEW,
      PERMISSIONS.REPORTS_VIEW,
      PERMISSIONS.CONFIG_VIEW,
    ],
    items: [
      { label: "Roles",         icon: ShieldCheck, path: "/admin/roles",    requiredPermission: PERMISSIONS.ROLE_VIEW },
      { label: "Reports",       icon: BarChart2,   path: "/admin/reports",  requiredPermission: PERMISSIONS.REPORTS_VIEW },
      { label: "Settings",      icon: Settings,    path: "/admin/settings", requiredPermission: PERMISSIONS.CONFIG_VIEW },
    ],
  },

  // ── Analytics (learner) ───────────────────────────────────────────────────
  {
    title: "Analytics",
    items: [
      { label: "Reports",     icon: ChartNoAxesColumn, path: "/reports" },
      { label: "Leaderboard", icon: Trophy,            path: "/leaderboard" },
    ],
  },

  // ── Account (always visible) ──────────────────────────────────────────────
  {
    title: "Account",
    items: [
      { label: "Notifications", icon: Bell,        path: "/notifications" },
      { label: "My Profile",    icon: User,        path: "/profile" },
      { label: "Security",      icon: ShieldCheck, path: "/security" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Sidebar = () => {
  const { isSidebarOpen } = useUIStore();
  const { user } = useAuthStore();
  const location = useLocation();

  const fullName = getFullName(user);
  const initials = getInitials(user);
  const roleName = getPrimaryRoleName(user);

  // Build a permission map with a stable, fixed set of hook calls.
  // All usePermission calls must be at the top level of the component.
  const permMap: Record<string, boolean> = {
    [PERMISSIONS.COURSE_VIEW]:               usePermission(PERMISSIONS.COURSE_VIEW),
    [PERMISSIONS.ASSESSMENT_ATTEMPT]:        usePermission(PERMISSIONS.ASSESSMENT_ATTEMPT),
    [PERMISSIONS.CERTIFICATE_VIEW]:          usePermission(PERMISSIONS.CERTIFICATE_VIEW),
    [PERMISSIONS.EMPLOYEE_VIEW]:             usePermission(PERMISSIONS.EMPLOYEE_VIEW),
    [PERMISSIONS.EMPLOYEE_MANAGE]:           usePermission(PERMISSIONS.EMPLOYEE_MANAGE),
    [PERMISSIONS.ORG_STRUCTURE_MANAGE]:      usePermission(PERMISSIONS.ORG_STRUCTURE_MANAGE),
    [PERMISSIONS.TNI_MANAGE]:                usePermission(PERMISSIONS.TNI_MANAGE),
    [PERMISSIONS.TRAINING_PLAN_VIEW]:        usePermission(PERMISSIONS.TRAINING_PLAN_VIEW),
    [PERMISSIONS.TRAINING_PLAN_APPROVE]:     usePermission(PERMISSIONS.TRAINING_PLAN_APPROVE),
    [PERMISSIONS.TRAINING_CALENDAR_APPROVE]: usePermission(PERMISSIONS.TRAINING_CALENDAR_APPROVE),
    [PERMISSIONS.ENROLLMENT_MANAGE]:         usePermission(PERMISSIONS.ENROLLMENT_MANAGE),
    [PERMISSIONS.COURSE_UPDATE]:             usePermission(PERMISSIONS.COURSE_UPDATE),
    [PERMISSIONS.COURSE_CREATE]:             usePermission(PERMISSIONS.COURSE_CREATE),
    [PERMISSIONS.COURSE_CATEGORY_MANAGE]:    usePermission(PERMISSIONS.COURSE_CATEGORY_MANAGE),
    [PERMISSIONS.SKILL_MANAGE]:              usePermission(PERMISSIONS.SKILL_MANAGE),
    [PERMISSIONS.SKILL_CATEGORY_MANAGE]:     usePermission(PERMISSIONS.SKILL_CATEGORY_MANAGE),
    [PERMISSIONS.ASSESSMENT_MANAGE]:         usePermission(PERMISSIONS.ASSESSMENT_MANAGE),
    [PERMISSIONS.ROLE_VIEW]:                 usePermission(PERMISSIONS.ROLE_VIEW),
    [PERMISSIONS.REPORTS_VIEW]:              usePermission(PERMISSIONS.REPORTS_VIEW),
    [PERMISSIONS.CONFIG_VIEW]:               usePermission(PERMISSIONS.CONFIG_VIEW),
  };

  /** Returns only the items the current user is allowed to see. */
  const getVisibleItems = (items: NavItem[]): NavItem[] =>
    items.filter((item) => {
      if (!item.requiredPermission) return true;
      return permMap[item.requiredPermission] ?? false;
    });

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
        {NAV_CONFIG.map((section) => {
          const visibleItems = getVisibleItems(section.items);

          // Hide the entire section if it has no visible items
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.title}>
              <div className="nav-section-label">{section.title}</div>
              {visibleItems.map((item) => (
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
          );
        })}
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
