import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { isAdminRole } from "@/lib/utils";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { FontSizeProvider } from "@/contexts/FontSizeContext";
import { SelectedWorkerProvider } from "@/contexts/SelectedWorkerContext";
import MobileLayout from "@/components/layout/MobileLayout";
import GpsGuard from "@/components/auth/GpsGuard";
import VersionGuard from "@/components/VersionGuard";
import LoginForm from "@/components/auth/LoginForm";
import Index from "./pages/Index";
import MyPromos from "./pages/MyPromos";
import Orders from "./pages/Orders";
import MyDeliveries from "./pages/MyDeliveries";
import MyStock from "./pages/MyStock";
import Workers from "./pages/admin/Workers";
import Products from "./pages/admin/Products";
import Customers from "./pages/admin/Customers";
import Stats from "./pages/admin/Stats";
import Settings from "./pages/admin/Settings";
import PromoTable from "./pages/admin/PromoTable";
import Branches from "./pages/admin/Branches";
import Permissions from "./pages/admin/Permissions";
import ActivityLogs from "./pages/admin/ActivityLogs";
import NearbyStores from "./pages/admin/NearbyStores";
import CustomerAccounts from "./pages/admin/CustomerAccounts";
import CustomerJourney from "./pages/admin/CustomerJourney";
import ProductOffers from "./pages/admin/ProductOffers";
import AvailableOffers from "./pages/AvailableOffers";
import Expenses from "./pages/Expenses";
import ExpensesManagement from "./pages/admin/ExpensesManagement";
import Guide from "./pages/Guide";
import WarehouseStock from "./pages/admin/WarehouseStock";
import WarehouseReview from "./pages/admin/WarehouseReview";
import StockReceipts from "./pages/admin/StockReceipts";
import LoadStock from "./pages/admin/LoadStock";
import CustomerDebts from "./pages/admin/CustomerDebts";
import AccountingSessions from "./pages/admin/AccountingSessions";
import WorkerDebts from "./pages/admin/WorkerDebts";
import WorkerTracking from "./pages/admin/WorkerTracking";
import GeoOperations from "./pages/admin/GeoOperations";
import WorkerActions from "./pages/admin/WorkerActions";
import DailyReceipts from "./pages/admin/DailyReceipts";
import ManagerTreasury from "./pages/admin/ManagerTreasury";
import WorkerLiability from "./pages/admin/WorkerLiability";
import ShareTarget from "./pages/ShareTarget";
import SharedInvoices from "./pages/admin/SharedInvoices";
import SurplusDeficitTreasury from "./pages/admin/SurplusDeficitTreasury";
import Rewards from "./pages/admin/Rewards";
import WorkerRewards from "./pages/WorkerRewards";
import MyAchievements from "./pages/MyAchievements";
import PromoSplits from "./pages/admin/PromoSplits";
import NotFound from "./pages/NotFound";
import Chat from "./pages/Chat";
import Attendance from "./pages/admin/Attendance";
import OrderTracking from "./pages/admin/OrderTracking";
import ManagerSalesSummaryPage from "./pages/admin/ManagerSalesSummaryPage";
import FloatingChat from "./components/chat/FloatingChat";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

// Protected Route Component
const ProtectedRoute: React.FC<{ 
  children: React.ReactNode;
  adminOnly?: boolean;
  allowedRoles?: string[];
  allowedCustomRoles?: string[];
}> = ({ children, adminOnly = false, allowedRoles, allowedCustomRoles }) => {
  const { isAuthenticated, isLoading, role, activeRole } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check for specific allowed roles (includes custom role codes)
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // Also check custom role codes
    const customCode = activeRole?.custom_role_code;
    const hasCustomAccess = allowedCustomRoles && customCode && allowedCustomRoles.includes(customCode);
    if (!hasCustomAccess) {
      return <Navigate to="/" replace />;
    }
  }

  // Legacy adminOnly check - uses isAdminRole to include admin, branch_admin, project_manager
  if (adminOnly && !isAdminRole(role)) {
    return <Navigate to="/" replace />;
  }

  return <GpsGuard><MobileLayout>{children}</MobileLayout></GpsGuard>;
};

// Public Route (redirect if authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={
        <PublicRoute>
          <LoginForm />
        </PublicRoute>
      } />

      {/* Protected Routes */}
      <Route path="/" element={
        <ProtectedRoute>
          <Index />
        </ProtectedRoute>
      } />

      <Route path="/my-promos" element={
        <ProtectedRoute>
          <MyPromos />
        </ProtectedRoute>
      } />

      {/* Admin Routes */}
      <Route path="/workers" element={
        <ProtectedRoute adminOnly>
          <Workers />
        </ProtectedRoute>
      } />

      <Route path="/products" element={
        <ProtectedRoute adminOnly>
          <Products />
        </ProtectedRoute>
      } />

      <Route path="/customers" element={
        <ProtectedRoute>
          <Customers />
        </ProtectedRoute>
      } />

      <Route path="/stats" element={
        <ProtectedRoute adminOnly>
          <Stats />
        </ProtectedRoute>
      } />

      <Route path="/promo-table" element={
        <ProtectedRoute adminOnly>
          <PromoTable />
        </ProtectedRoute>
      } />

      <Route path="/settings" element={
        <ProtectedRoute adminOnly>
          <Settings />
        </ProtectedRoute>
      } />

      <Route path="/branches" element={
        <ProtectedRoute allowedRoles={['admin', 'project_manager']}>
          <Branches />
        </ProtectedRoute>
      } />

      <Route path="/permissions" element={
        <ProtectedRoute allowedRoles={['admin', 'project_manager']}>
          <Permissions />
        </ProtectedRoute>
      } />

      <Route path="/activity-logs" element={
        <ProtectedRoute adminOnly>
          <ActivityLogs />
        </ProtectedRoute>
      } />

      <Route path="/nearby-stores" element={
        <ProtectedRoute allowedRoles={['admin', 'branch_admin', 'supervisor']}>
          <NearbyStores />
        </ProtectedRoute>
      } />

      <Route path="/customer-accounts" element={
        <ProtectedRoute allowedRoles={['admin', 'branch_admin']}>
          <CustomerAccounts />
        </ProtectedRoute>
      } />

      <Route path="/customer-journey" element={
        <ProtectedRoute allowedRoles={['admin', 'branch_admin', 'project_manager']}>
          <CustomerJourney />
        </ProtectedRoute>
      } />

      <Route path="/orders" element={
        <ProtectedRoute>
          <Orders />
        </ProtectedRoute>
      } />

      <Route path="/my-deliveries" element={
        <ProtectedRoute>
          <MyDeliveries />
        </ProtectedRoute>
      } />

      <Route path="/my-stock" element={
        <ProtectedRoute>
          <MyStock />
        </ProtectedRoute>
      } />

      <Route path="/guide" element={
        <ProtectedRoute>
          <Guide />
        </ProtectedRoute>
      } />

      <Route path="/product-offers" element={
        <ProtectedRoute allowedRoles={['admin', 'branch_admin']}>
          <ProductOffers />
        </ProtectedRoute>
      } />

      <Route path="/available-offers" element={
        <ProtectedRoute>
          <AvailableOffers />
        </ProtectedRoute>
      } />

      <Route path="/expenses" element={
        <ProtectedRoute>
          <Expenses />
        </ProtectedRoute>
      } />

      <Route path="/expenses-management" element={
        <ProtectedRoute allowedRoles={['admin', 'branch_admin']}>
          <ExpensesManagement />
        </ProtectedRoute>
      } />

      <Route path="/warehouse" element={
        <ProtectedRoute allowedRoles={['admin', 'branch_admin']} allowedCustomRoles={['warehouse_manager']}>
          <WarehouseStock />
        </ProtectedRoute>
      } />

      <Route path="/warehouse-review" element={
        <ProtectedRoute allowedRoles={['admin', 'branch_admin']} allowedCustomRoles={['warehouse_manager']}>
          <WarehouseReview />
        </ProtectedRoute>
      } />

      <Route path="/stock-receipts" element={
        <ProtectedRoute allowedRoles={['admin', 'branch_admin']}>
          <StockReceipts />
        </ProtectedRoute>
      } />

      <Route path="/load-stock" element={
        <ProtectedRoute allowedRoles={['admin', 'branch_admin', 'supervisor']} allowedCustomRoles={['warehouse_manager']}>
          <LoadStock />
        </ProtectedRoute>
      } />

      <Route path="/customer-debts" element={
        <ProtectedRoute>
          <CustomerDebts />
        </ProtectedRoute>
      } />

      <Route path="/accounting" element={
        <ProtectedRoute allowedRoles={['admin', 'branch_admin']}>
          <AccountingSessions />
        </ProtectedRoute>
      } />

      <Route path="/worker-debts" element={
        <ProtectedRoute allowedRoles={['admin', 'branch_admin']}>
          <WorkerDebts />
        </ProtectedRoute>
      } />

      <Route path="/worker-tracking" element={
        <ProtectedRoute allowedRoles={['admin', 'branch_admin']}>
          <WorkerTracking />
        </ProtectedRoute>
      } />

      <Route path="/worker-actions" element={
        <ProtectedRoute allowedRoles={['admin', 'branch_admin', 'supervisor', 'worker']}>
          <WorkerActions />
        </ProtectedRoute>
      } />


      <Route path="/geo-operations" element={
        <ProtectedRoute allowedRoles={['admin', 'branch_admin']}>
          <GeoOperations />
        </ProtectedRoute>
      } />

      <Route path="/daily-receipts" element={
        <ProtectedRoute>
          <DailyReceipts />
        </ProtectedRoute>
      } />

      <Route path="/manager-treasury" element={
        <ProtectedRoute allowedRoles={['admin', 'branch_admin']}>
          <ManagerTreasury />
        </ProtectedRoute>
      } />

      <Route path="/worker-liability" element={
        <ProtectedRoute allowedRoles={['admin', 'branch_admin']}>
          <WorkerLiability />
        </ProtectedRoute>
      } />

      <Route path="/shared-invoices" element={
        <ProtectedRoute allowedRoles={['admin', 'branch_admin']}>
          <SharedInvoices />
        </ProtectedRoute>
      } />

      <Route path="/surplus-deficit" element={
        <ProtectedRoute allowedRoles={['admin', 'branch_admin']}>
          <SurplusDeficitTreasury />
        </ProtectedRoute>
      } />

      <Route path="/rewards" element={
        <ProtectedRoute allowedRoles={['admin', 'branch_admin']}>
          <Rewards />
        </ProtectedRoute>
      } />

      <Route path="/my-rewards" element={
        <ProtectedRoute>
          <WorkerRewards />
        </ProtectedRoute>
      } />

      <Route path="/my-achievements" element={
        <ProtectedRoute>
          <MyAchievements />
        </ProtectedRoute>
      } />

      {/* Attendance */}
      <Route path="/attendance" element={
        <ProtectedRoute allowedRoles={['admin', 'branch_admin']}>
          <Attendance />
        </ProtectedRoute>
      } />

      {/* Promo Splits */}
      <Route path="/promo-splits" element={
        <ProtectedRoute allowedRoles={['admin', 'branch_admin']}>
          <PromoSplits />
        </ProtectedRoute>
      } />

      {/* Order Tracking */}
      <Route path="/order-tracking" element={
        <ProtectedRoute allowedRoles={['admin', 'branch_admin']}>
          <OrderTracking />
        </ProtectedRoute>
      } />

      <Route path="/manager-sales-summary" element={
        <ProtectedRoute adminOnly>
          <ManagerSalesSummaryPage />
        </ProtectedRoute>
      } />

      {/* Worker Order Tracking */}
      <Route path="/my-order-tracking" element={
        <ProtectedRoute allowedRoles={['worker']}>
          <OrderTracking workerMode />
        </ProtectedRoute>
      } />


      <Route path="/chat" element={
        <ProtectedRoute>
          <Chat />
        </ProtectedRoute>
      } />

      {/* Share Target */}
      <Route path="/share" element={<ShareTarget />} />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <FontSizeProvider>
        <TooltipProvider>
          <VersionGuard>
            <AuthProvider>
              <SelectedWorkerProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <AppRoutes />
                </BrowserRouter>
              </SelectedWorkerProvider>
            </AuthProvider>
          </VersionGuard>
        </TooltipProvider>
      </FontSizeProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
