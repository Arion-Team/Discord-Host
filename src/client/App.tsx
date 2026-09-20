import React, { useEffect, Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AuthProvider from './components/AuthProvider';
import LoadingScreen from './components/LoadingScreen';
import DashboardLayout from './layouts/DashboardLayout';
import AdminLayout from './layouts/AdminLayout';

const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));
const WelcomePage = lazy(() => import('./pages/auth/WelcomePage'));
const VerifyEmailPage = lazy(() => import('./pages/auth/VerifyEmailPage'));
const SetupPage = lazy(() => import('./pages/auth/SetupPage'));
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const BotsPage = lazy(() => import('./pages/dashboard/BotsPage'));
const CreateBotPage = lazy(() => import('./pages/dashboard/CreateBotPage'));
const BotDetailPage = lazy(() => import('./pages/dashboard/BotDetailPage'));
const FileManagerPage = lazy(() => import('./pages/dashboard/FileManagerPage'));
const BotConsolePage = lazy(() => import('./pages/dashboard/BotConsolePage'));
const BotLogsPage = lazy(() => import('./pages/dashboard/BotLogsPage'));
const FileEditorPage = lazy(() => import('./pages/dashboard/FileEditorPage'));
const SettingsPage = lazy(() => import('./pages/dashboard/SettingsPage'));
const SystemStatusPage = lazy(() => import('./pages/dashboard/SystemStatusPage'));
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage'));
const AdminBotsPage = lazy(() => import('./pages/admin/AdminBotsPage'));
const AdminPlansPage = lazy(() => import('./pages/admin/AdminPlansPage'));
const AdminBrandingPage = lazy(() => import('./pages/admin/AdminBrandingPage'));
const AdminLogsPage = lazy(() => import('./pages/admin/AdminLogsPage'));
const AdminSettingsPage = lazy(() => import('./pages/admin/AdminSettingsPage'));

import { useAuthStore, useBrandingStore } from './lib/store';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuthStore();
  if (isLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuthStore();
  if (isLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const App: React.FC = () => {
  const { fetchBranding } = useBrandingStore();

  useEffect(() => {
    fetchBranding();
  }, [fetchBranding]);

  return (
    <AuthProvider>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/welcome" element={<ProtectedRoute><WelcomePage /></ProtectedRoute>} />
          <Route path="/verify-email" element={<ProtectedRoute><VerifyEmailPage /></ProtectedRoute>} />

          <Route path="/" element={<ProtectedRoute><Navigate to="/dashboard" replace /></ProtectedRoute>} />

          <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<DashboardPage />} />
          </Route>

          <Route path="/bots" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<BotsPage />} />
            <Route path="new" element={<CreateBotPage />} />
            <Route path=":id" element={<BotDetailPage />} />
            <Route path=":id/files" element={<FileManagerPage />} />
            <Route path=":id/files/edit/*" element={<FileEditorPage />} />
            <Route path=":id/console" element={<BotConsolePage />} />
            <Route path=":id/logs" element={<BotLogsPage />} />
          </Route>

          <Route path="/settings" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<SettingsPage />} />
          </Route>

          <Route path="/status" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<SystemStatusPage />} />
          </Route>

          <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="bots" element={<AdminBotsPage />} />
            <Route path="plans" element={<AdminPlansPage />} />
            <Route path="branding" element={<AdminBrandingPage />} />
            <Route path="logs" element={<AdminLogsPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  );
};

export default App;
