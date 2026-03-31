import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { useThemeStore } from '@/stores/themeStore';

// Lazy-loaded pages
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const OtpLoginPage = lazy(() => import('@/pages/OtpLoginPage'));
const RegisterPage = lazy(() => import('@/pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage'));
const EmailVerificationPage = lazy(() => import('@/pages/EmailVerificationPage'));
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const SecuritySettingsPage = lazy(() => import('@/pages/SecuritySettingsPage'));
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
            <Route element={<DashboardLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              {/* Settings Routes */}
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/security" element={<SecuritySettingsPage />} />

              {/* Coming Soon Routes */}
              <Route path="/courses" element={<ComingSoon />} />
              <Route path="/skills" element={<ComingSoon />} />
              <Route path="/calendar" element={<ComingSoon />} />
              <Route path="/assessments" element={<ComingSoon />} />
              <Route path="/certifications" element={<ComingSoon />} />
              <Route path="/reports" element={<ComingSoon />} />
              <Route path="/leaderboard" element={<ComingSoon />} />
            </Route>
          </Route>

          {/* 404 fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};
