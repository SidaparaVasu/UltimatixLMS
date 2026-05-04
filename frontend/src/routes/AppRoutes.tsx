import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { AdminLayout } from '@/layouts/AdminLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { RoleGuard } from '@/routes/RoleGuard';
import { useThemeStore } from '@/stores/themeStore';
import { GlobalToast } from '@/components/layout/GlobalToast';
import { PERMISSIONS } from '@/constants/permissions';

// Lazy-loaded pages
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const OtpLoginPage = lazy(() => import('@/pages/OtpLoginPage'));
const RegisterPage = lazy(() => import('@/pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage'));
const EmailVerificationPage = lazy(() => import('@/pages/EmailVerificationPage'));
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const SecuritySettingsPage = lazy(() => import('@/pages/SecuritySettingsPage'));
const UnauthorizedPage = lazy(() => import('@/pages/UnauthorizedPage'));
const BusinessUnitPage = lazy(() => import('@/pages/admin/masters/BusinessUnitPage'));
const DepartmentPage = lazy(() => import('@/pages/admin/masters/DepartmentPage'));
const LocationPage = lazy(() => import('@/pages/admin/masters/UnitLocationPage'));
const JobRolePage = lazy(() => import('@/pages/admin/masters/JobRolePage'));
const EmployeePage = lazy(() => import('@/pages/admin/masters/EmployeePage'));
const CompetencyMasterPage = lazy(() => import('@/pages/admin/masters/CompetencyMasterPage'));
const CourseCategoryPage = lazy(() => import('@/pages/admin/masters/CourseCategoryPage'));
const CourseMasterPage = lazy(() => import('@/pages/admin/masters/CourseMasterPage'));
const CourseBuilderStudio = lazy(() => import('@/pages/admin/builder/CourseBuilderStudio'));

// Learner pages
const CourseCatalogPage = lazy(() => import('@/pages/learner/CourseCatalogPage'));
const CourseDetailPage = lazy(() => import('@/pages/learner/CourseDetailPage'));
const MyLearningPage = lazy(() => import('@/pages/learner/MyLearningPage'));
const CoursePlayerPage = lazy(() => import('@/pages/learner/CoursePlayerPage'));
const SelfTNIRatingPage = lazy(() => import('@/pages/learner/SelfTNIRatingPage'));
const MySkillMatrixPage = lazy(() => import('@/pages/learner/MySkillMatrixPage'));
const ManagerTNIRatingPage = lazy(() => import('@/pages/manager/ManagerTNIRatingPage'));
const TrainingNeedsPage    = lazy(() => import('@/pages/admin/tni/TrainingNeedsPage'));
const TrainingPlansPage    = lazy(() => import('@/pages/admin/training/TrainingPlansPage'));
const TrainingPlanFormPage = lazy(() => import('@/pages/admin/training/TrainingPlanFormPage'));
const TrainingCalendarPage = lazy(() => import('@/pages/admin/training/TrainingCalendarPage'));
const ApprovalsPage        = lazy(() => import('@/pages/admin/training/ApprovalsPage'));
const NotificationsPage    = lazy(() => import('@/pages/NotificationsPage'));
const RolesPage            = lazy(() => import('@/pages/admin/rbac/RolesPage'));
// RoleDetailPage is preserved for future use — unlinked from routing intentionally
// const RoleDetailPage    = lazy(() => import('@/pages/admin/rbac/RoleDetailPage'));

// Placeholder for pages that are not yet implemented
const ComingSoon = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <span className="text-slate-500 font-medium italic">This feature is currently under development and will be available soon.</span>
  </div>
);

// Minimal fallback for lazy loading
const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-slate-50">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
  </div>
);

// Syncs persisted theme to the HTML element on startup
const ThemeInitializer = () => {
  const { colorTheme, mode } = useThemeStore();
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', colorTheme);
    document.documentElement.setAttribute('data-mode', mode);
  }, [colorTheme, mode]);
  return null;
};

export const AppRoutes = () => {
  return (
    <BrowserRouter>
      <ThemeInitializer />
      <GlobalToast />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Auth Routes */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/login/otp" element={<OtpLoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/verify-email" element={<EmailVerificationPage />} />
          </Route>

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            {/* Admin Routes Namespace
                Minimum bar: EMPLOYEE_VIEW covers HR and admin users.
                Individual routes add tighter guards where needed.        */}
            <Route element={<RoleGuard requiredPermissions={[PERMISSIONS.EMPLOYEE_VIEW]} />}>
              <Route element={<AdminLayout />}>
                <Route path="/admin" element={<Navigate to="/admin/employees" replace />} />
                <Route path="/admin/users" element={<ComingSoon />} />
                <Route path="/admin/reports" element={<ComingSoon />} />
                <Route path="/admin/business-units" element={<BusinessUnitPage />} />
                <Route path="/admin/departments" element={<DepartmentPage />} />
                <Route path="/admin/unit-locations" element={<LocationPage />} />
                <Route path="/admin/job-roles" element={<JobRolePage />} />
                <Route path="/admin/employees" element={<EmployeePage />} />
                <Route path="/admin/competency" element={<CompetencyMasterPage />} />
                <Route path="/admin/course-categories" element={<CourseCategoryPage />} />
                <Route path="/admin/courses" element={<CourseMasterPage />} />
                <Route path="/admin/settings" element={<ComingSoon />} />
                <Route path="/admin/tni" element={<TrainingNeedsPage />} />
                <Route path="/admin/training-plans" element={<TrainingPlansPage />} />
                <Route path="/admin/training-plans/new" element={<TrainingPlanFormPage />} />
                <Route path="/admin/training-plans/:id/edit" element={<TrainingPlanFormPage />} />
                <Route path="/admin/training-calendar" element={<TrainingCalendarPage />} />
                <Route path="/admin/approvals" element={<ApprovalsPage />} />
                <Route path="/admin/skill-gap" element={<ComingSoon />} />

                {/* RBAC management — requires ROLE_VIEW */}
                <Route element={<RoleGuard requiredPermissions={[PERMISSIONS.ROLE_VIEW]} />}>
                  <Route path="/admin/roles" element={<RolesPage />} />
                  {/* RoleDetailPage unlinked — preserved for future use
                  <Route path="/admin/roles/:id" element={<RoleDetailPage />} />
                  */}
                </Route>
              </Route>

              {/* Studio runs outside of standard AdminLayout for full screen */}
              <Route path="/admin/courses/builder/:id" element={<CourseBuilderStudio />} />
            </Route>

            <Route element={<DashboardLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              {/* Settings Routes */}
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/security" element={<SecuritySettingsPage />} />

              {/* Learner Routes */}
              <Route path="/courses" element={<CourseCatalogPage />} />
              <Route path="/courses/:id" element={<CourseDetailPage />} />
              <Route path="/my-learning" element={<MyLearningPage />} />
              <Route path="/learn/:enrollmentId" element={<CoursePlayerPage />} />
              <Route path="/my-tni" element={<SelfTNIRatingPage />} />
              <Route path="/my-skills" element={<MySkillMatrixPage />} />
              <Route path="/manager/tni" element={<ManagerTNIRatingPage />} />

              {/* Training Calendar */}
              <Route path="/training-calendar" element={<TrainingCalendarPage />} />

              {/* Coming Soon Routes */}
              <Route path="/skills" element={<ComingSoon />} />
              <Route path="/assessments" element={<ComingSoon />} />
              <Route path="/certifications" element={<ComingSoon />} />
              <Route path="/reports" element={<ComingSoon />} />
              <Route path="/leaderboard" element={<ComingSoon />} />
              {/* Notifications */}
              <Route path="/notifications" element={<NotificationsPage />} />
            </Route>
          </Route>

          {/* 404 fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};
