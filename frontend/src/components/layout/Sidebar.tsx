import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { usePermission } from "@/hooks/usePermission";
import { PERMISSIONS, type PermissionCode } from "@/constants/permissions";
import { cn } from "@/utils/cn";
import {
  LayoutDashboard,
  BookOpen,
  Calendar,
  CheckSquare,   // Assessments — not yet developed
  Trophy,
  Star,
  User,
  ShieldCheck,
  Users,
  Building2,
  Network,
  MapPin,
  ClipboardList,
  // BarChart2,     // Reports — not yet developed
  // Settings,      // Settings — not yet developed
  GraduationCap,
  BookMarked,
  // ChartNoAxesColumn,
  Bell,
  Brain,
  Blocks,
  CalendarDays,
  CheckCircle,
  UserCheck,
  ClipboardCheck,
  FilePenLine,
  BadgeCheck,
  History,
  CircleQuestionMark,
  Award,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useMemo } from "react";
import { useGamificationEnabled } from "@/modules/gamification/hooks/useGamificationEnabled";
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
      { label: "Training Calendar", icon: Calendar,    path: "/training-calendar",       requiredPermission: PERMISSIONS.SESSION_VIEW },
      { label: "Assessments",       icon: CheckSquare, path: "/assessments",             requiredPermission: PERMISSIONS.ASSESSMENT_CATALOG_VIEW },
      { label: "My Certificates",   icon: Award,       path: "/my-certificates",         requiredPermission: PERMISSIONS.CERTIFICATE_VIEW },
    ],
  },

  // ── HR / Management ───────────────────────────────────────────────────────
  {
    title: "Management",
    requiresAnyPermission: [
      PERMISSIONS.TNI_MANAGE,
      PERMISSIONS.TNI_APPROVE,
      PERMISSIONS.TRAINING_PLAN_VIEW,
      PERMISSIONS.TRAINING_PLAN_APPROVE,
      PERMISSIONS.TRAINING_CALENDAR_APPROVE,
      PERMISSIONS.ENROLLMENT_MANAGE,
      PERMISSIONS.ASSESSMENT_REVIEW_MANAGE,
      PERMISSIONS.SKILL_UPGRADE_APPROVE,
      PERMISSIONS.EMPLOYEE_VIEW,
    ],
    items: [
      { label: "TNI Review",          icon: UserCheck,     path: "/manager/tni",             requiredPermission: PERMISSIONS.TNI_APPROVE },
      { label: "Training Needs",      icon: ClipboardList, path: "/admin/tni",               requiredPermission: PERMISSIONS.TNI_MANAGE },
      { label: "Training Plans",      icon: GraduationCap, path: "/admin/training-plans",    requiredPermission: PERMISSIONS.TRAINING_PLAN_VIEW },
      { label: "Training Plan Approval",           icon: CheckCircle,   path: "/admin/approvals",         requiredPermission: PERMISSIONS.TRAINING_PLAN_APPROVE },
      { label: "Training Calendar",   icon: CalendarDays,  path: "/admin/training-calendar", requiredPermission: PERMISSIONS.TRAINING_CALENDAR_APPROVE },
      { label: "Question Bank",       icon: CircleQuestionMark, path: "/admin/assessments/questions", requiredPermission: PERMISSIONS.ASSESSMENT_MANAGE },
      { label: "Manage Assessments",          icon: FilePenLine, path: "/admin/assessments", requiredPermission: PERMISSIONS.ASSESSMENT_MANAGE},
      { label: "Assessment Review",      icon: ClipboardCheck, path: "/admin/assessments/review",     requiredPermission: PERMISSIONS.ASSESSMENT_REVIEW_MANAGE },
      { label: "Skill Upgrade Approval",      icon: BadgeCheck, path: "/admin/assessments/skill-upgrades", requiredPermission: PERMISSIONS.SKILL_UPGRADE_APPROVE },
      { label: "Skill History",          icon: History,     path: "/admin/skill-history",              requiredPermission: PERMISSIONS.EMPLOYEE_VIEW },
    ],
  },

  // ── Certificates ─────────────────────────────────────────────────────────
  {
    title: "Certificates",
    requiresAnyPermission: [PERMISSIONS.CERTIFICATE_MANAGE],
    items: [
      { label: "All Certificates", icon: Award, path: "/admin/certificates", requiredPermission: PERMISSIONS.CERTIFICATE_MANAGE },
    ],
  },

  // ── Organisation ──────────────────────────────────────────────────────────
  {
    title: "Organisation",
    requiresAnyPermission: [PERMISSIONS.ORG_STRUCTURE_MANAGE, PERMISSIONS.EMPLOYEE_VIEW],
    items: [
      { label: "Employees",       icon: Users,         path: "/admin/employees",       requiredPermission: PERMISSIONS.EMPLOYEE_VIEW },
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
      { label: "Course Master",          icon: Blocks,         path: "/admin/courses",                requiredPermission: PERMISSIONS.COURSE_UPDATE },
      { label: "Course Categories",      icon: BookMarked,     path: "/admin/course-categories",      requiredPermission: PERMISSIONS.COURSE_CATEGORY_MANAGE },
      { label: "Competencies & Skills",  icon: Brain,          path: "/admin/competency",             requiredPermission: PERMISSIONS.SKILL_MANAGE },
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
      // { label: "Settings",      icon: Settings,    path: "/admin/settings", requiredPermission: PERMISSIONS.CONFIG_VIEW },
    ],
  },

  // ── Analytics (learner) ───────────────────────────────────────────────────
  {
    title: "Analytics",
    items: [
      // { label: "Reports",     icon: BarChart2, path: "/admin/reports",  requiredPermission: PERMISSIONS.REPORTS_VIEW }, // TODO: not yet developed
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
  const { isEnabled: gamificationEnabled } = useGamificationEnabled();

  const navConfig = useMemo(() => {
    if (!gamificationEnabled) return NAV_CONFIG;
    return NAV_CONFIG.map((section) => {
      if (section.title === "Analytics") {
        return {
          ...section,
          items: [
            ...section.items,
            { label: "Leaderboard", icon: Trophy, path: "/leaderboard" },
          ],
        };
      }
      if (section.title === "Management") {
        return {
          ...section,
          requiresAnyPermission: [
            ...(section.requiresAnyPermission ?? []),
            PERMISSIONS.GAMIFICATION_VIEW_TEAM,
          ],
          items: [
            ...section.items,
            {
              label: "Team Rewards",
              icon: Trophy,
              path: "/manager/team-gamification",
              requiredPermission: PERMISSIONS.GAMIFICATION_VIEW_TEAM,
            },
          ],
        };
      }
      return section;
    });
  }, [gamificationEnabled]);

  const fullName = getFullName(user);
  const initials = getInitials(user);
  const roleName = getPrimaryRoleName(user);

  // Build a permission map with a stable, fixed set of hook calls.
  // All usePermission calls must be at the top level of the component.
  const permMap: Record<string, boolean> = {
    [PERMISSIONS.COURSE_VIEW]:               usePermission(PERMISSIONS.COURSE_VIEW),
    [PERMISSIONS.SESSION_VIEW]:              usePermission(PERMISSIONS.SESSION_VIEW),
    [PERMISSIONS.ASSESSMENT_CATALOG_VIEW]:   usePermission(PERMISSIONS.ASSESSMENT_CATALOG_VIEW),
    [PERMISSIONS.ASSESSMENT_ATTEMPT]:        usePermission(PERMISSIONS.ASSESSMENT_ATTEMPT),
    [PERMISSIONS.CERTIFICATE_VIEW]:          usePermission(PERMISSIONS.CERTIFICATE_VIEW),
    [PERMISSIONS.CERTIFICATE_MANAGE]:        usePermission(PERMISSIONS.CERTIFICATE_MANAGE),
    [PERMISSIONS.EMPLOYEE_VIEW]:             usePermission(PERMISSIONS.EMPLOYEE_VIEW),
    [PERMISSIONS.EMPLOYEE_MANAGE]:           usePermission(PERMISSIONS.EMPLOYEE_MANAGE),
    [PERMISSIONS.ORG_STRUCTURE_MANAGE]:      usePermission(PERMISSIONS.ORG_STRUCTURE_MANAGE),
    [PERMISSIONS.TNI_MANAGE]:                usePermission(PERMISSIONS.TNI_MANAGE),
    [PERMISSIONS.TNI_APPROVE]:               usePermission(PERMISSIONS.TNI_APPROVE),
    [PERMISSIONS.TRAINING_PLAN_VIEW]:        usePermission(PERMISSIONS.TRAINING_PLAN_VIEW),
    [PERMISSIONS.TRAINING_PLAN_APPROVE]:     usePermission(PERMISSIONS.TRAINING_PLAN_APPROVE),
    [PERMISSIONS.TRAINING_CALENDAR_VIEW]:    usePermission(PERMISSIONS.TRAINING_CALENDAR_VIEW),
    [PERMISSIONS.TRAINING_CALENDAR_APPROVE]: usePermission(PERMISSIONS.TRAINING_CALENDAR_APPROVE),
    [PERMISSIONS.ENROLLMENT_MANAGE]:         usePermission(PERMISSIONS.ENROLLMENT_MANAGE),
    [PERMISSIONS.COURSE_UPDATE]:             usePermission(PERMISSIONS.COURSE_UPDATE),
    [PERMISSIONS.COURSE_CREATE]:             usePermission(PERMISSIONS.COURSE_CREATE),
    [PERMISSIONS.COURSE_CATEGORY_MANAGE]:    usePermission(PERMISSIONS.COURSE_CATEGORY_MANAGE),
    [PERMISSIONS.SKILL_MANAGE]:              usePermission(PERMISSIONS.SKILL_MANAGE),
    [PERMISSIONS.SKILL_CATEGORY_MANAGE]:     usePermission(PERMISSIONS.SKILL_CATEGORY_MANAGE),
    [PERMISSIONS.ASSESSMENT_MANAGE]:         usePermission(PERMISSIONS.ASSESSMENT_MANAGE),
    [PERMISSIONS.ASSESSMENT_REVIEW_MANAGE]:  usePermission(PERMISSIONS.ASSESSMENT_REVIEW_MANAGE),
    [PERMISSIONS.SKILL_UPGRADE_APPROVE]:     usePermission(PERMISSIONS.SKILL_UPGRADE_APPROVE),
    [PERMISSIONS.ROLE_VIEW]:                 usePermission(PERMISSIONS.ROLE_VIEW),
    [PERMISSIONS.REPORTS_VIEW]:              usePermission(PERMISSIONS.REPORTS_VIEW),
    [PERMISSIONS.CONFIG_VIEW]:               usePermission(PERMISSIONS.CONFIG_VIEW),
    [PERMISSIONS.GAMIFICATION_VIEW_TEAM]:    usePermission(PERMISSIONS.GAMIFICATION_VIEW_TEAM),
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
        {navConfig.map((section) => {
          const visibleItems = getVisibleItems(section.items);

          // Hide the entire section if it has no visible items
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.title}>
              <div className="nav-section-label">{section.title}</div>
              {visibleItems.map((item) => {
                // Use prefix match for paths that have nested routes (anything under /admin/*)
                // and exact match for leaf learner routes to avoid false positives.
                const isActive =
                  location.pathname === item.path ||
                  (item.path !== '/dashboard' &&
                   item.path !== '/' &&
                   location.pathname.startsWith(item.path + '/'));

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn("nav-item", isActive && "active")}
                  >
                    <item.icon size={18} />
                    <span className="nav-item-label">{item.label}</span>
                    {item.badge && <span className="nav-badge">{item.badge}</span>}
                  </Link>
                );
              })}
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
