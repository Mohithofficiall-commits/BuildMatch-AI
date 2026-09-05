import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/auth';
import { CompareProvider } from '@/lib/compare';
import AppLayout from '@/components/AppLayout';
import PortalLayout from '@/components/professional/PortalLayout';
import LandingPage from '@/pages/LandingPage';
import AuthPage from '@/pages/AuthPage';
import Dashboard from '@/pages/Dashboard';
import FindEngineers from '@/pages/FindEngineers';
import EngineerProfile from '@/pages/EngineerProfile';
import CompareEngineers from '@/pages/CompareEngineers';
import AIMatch from '@/pages/AIMatch';
import MyProjects from '@/pages/MyProjects';
import ProjectDetail from '@/pages/ProjectDetail';
import Messages from '@/pages/Messages';
import DocumentVault from '@/pages/DocumentVault';
import Payments from '@/pages/Payments';
import Reviews from '@/pages/Reviews';
import Complaints from '@/pages/Complaints';
import DigitalPassport from '@/pages/DigitalPassport';
import AdminDashboard from '@/pages/AdminDashboard';
import EngineerDashboard from '@/pages/EngineerDashboard';
// Professional portal pages (engineer / plumber / electrician / material shop)
import PortalDashboardPage from '@/pages/portal/PortalDashboardPage';
import PortalRequestsPage from '@/pages/portal/PortalRequestsPage';
import PortalProjectsPage from '@/pages/portal/PortalProjectsPage';
import PortalClientsPage from '@/pages/portal/PortalClientsPage';
import PortalEarningsPage from '@/pages/portal/PortalEarningsPage';
import PortalVerificationPage from '@/pages/portal/PortalVerificationPage';
import PortalSubscriptionPage from '@/pages/portal/PortalSubscriptionPage';
import PortalMessagesPage from '@/pages/portal/PortalMessagesPage';
import ShopInventoryPage from '@/pages/portal/ShopInventoryPage';
import ShopOrdersPage from '@/pages/portal/ShopOrdersPage';
import type { UserRole } from '@/lib/types';

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: UserRole[] }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/app/dashboard" replace />;
  return <>{children}</>;
}

/** Children shared by all professional portals. */
const portalChildren = (isShop: boolean, includeIndex = true) => (
  <>
    {includeIndex && <Route index element={<PortalDashboardPage />} />}
    <Route path="requests" element={<PortalRequestsPage />} />
    <Route path="projects" element={<PortalProjectsPage />} />
    <Route path="clients" element={<PortalClientsPage />} />
    <Route path="earnings" element={<PortalEarningsPage />} />
    <Route path="verification" element={<PortalVerificationPage />} />
    <Route path="subscription" element={<PortalSubscriptionPage />} />
    <Route path="messages" element={<PortalMessagesPage />} />
    {isShop && <Route path="inventory" element={<ShopInventoryPage />} />}
    {isShop && <Route path="orders" element={<ShopOrdersPage />} />}
  </>
);

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/signup" element={<AuthPage mode="signup" />} />
      <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/app/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="find-engineers" element={<FindEngineers />} />
        <Route path="engineers/:id" element={<EngineerProfile />} />
        <Route path="compare" element={<CompareEngineers />} />
        <Route path="ai-match" element={<AIMatch />} />
        <Route path="projects" element={<MyProjects />} />
        <Route path="projects/:id" element={<ProjectDetail />} />
        <Route path="messages" element={<Messages />} />
        <Route path="documents" element={<DocumentVault />} />
        <Route path="payments" element={<Payments />} />
        <Route path="reviews" element={<Reviews />} />
        <Route path="complaints" element={<Complaints />} />
        <Route path="digital-passport" element={<DigitalPassport />} />
      </Route>

      {/* Engineer portal (existing dashboard preserved as the index route) */}
      <Route path="/app/engineer/*" element={<ProtectedRoute roles={['engineer']}><PortalLayout role="engineer" /></ProtectedRoute>}>
        <Route index element={<EngineerDashboard />} />
        {portalChildren(false, false)}
      </Route>

      {/* Plumber portal */}
      <Route path="/app/plumber/*" element={<ProtectedRoute roles={['plumber']}><PortalLayout role="plumber" /></ProtectedRoute>}>
        {portalChildren(false)}
      </Route>

      {/* Electrician portal */}
      <Route path="/app/electrician/*" element={<ProtectedRoute roles={['electrician']}><PortalLayout role="electrician" /></ProtectedRoute>}>
        {portalChildren(false)}
      </Route>

      {/* Material shop portal */}
      <Route path="/app/material-shop/*" element={<ProtectedRoute roles={['material_shop']}><PortalLayout role="material_shop" /></ProtectedRoute>}>
        {portalChildren(true)}
      </Route>

      {/* Admin dashboard */}
      <Route path="/app/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CompareProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </CompareProvider>
    </AuthProvider>
  );
}
