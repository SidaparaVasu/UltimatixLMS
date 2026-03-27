import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { ProtectedRoute } from '@/routes/ProtectedRoute';

// Lazy-loaded pages
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const OtpLoginPage = lazy(() => import('@/pages/OtpLoginPage'));
const RegisterPage = lazy(() => import('@/pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage'));
const EmailVerificationPage = lazy(() => import('@/pages/EmailVerificationPage'));

// Minimal fallback for lazy loading
const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-slate-50">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
  </div>
);

export const AppRoutes = () => {
  return (
    <BrowserRouter>
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
              <Route path="/dashboard" element={<div>Dashboard Page Placeholder</div>} />
            </Route>
          </Route>

          {/* 404 fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};
