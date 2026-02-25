import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AuthPage from "@/pages/AuthPage";
import Dashboard from "@/pages/Dashboard";
import POS from "@/pages/POS";
import NewOrder from "@/pages/NewOrder";
import Orders from "@/pages/Orders";
import Tables from "@/pages/Tables";
import KitchenDisplay from "@/pages/KitchenDisplay";
import PrinterSettings from "@/pages/PrinterSettings";
import Reports from "@/pages/Reports";
import Reservations from "@/pages/Reservations";
import StaffManagement from "@/pages/StaffManagement";
import MenuManagement from "@/pages/MenuManagement";
import Inventory from "@/pages/Inventory";
import BranchManagement from "@/pages/BranchManagement";
import NotFound from "@/pages/NotFound";
import InstallPWA from "@/pages/InstallPWA";

// Optimized React Query configuration for performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000,     // Data stays fresh for 10 minutes
      gcTime: 30 * 60 * 1000,        // Keep in cache for 30 minutes
      refetchOnWindowFocus: false,   // Don't refetch on tab switch
      refetchOnMount: false,         // Don't refetch on component mount if data exists
      retry: 1,                       // Retry failed requests once
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
      <Route path="/install" element={<InstallPWA />} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/pos" element={<ProtectedRoute><POS /></ProtectedRoute>} />
      <Route path="/new-order" element={<ProtectedRoute><NewOrder /></ProtectedRoute>} />
      <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
      <Route path="/tables" element={<ProtectedRoute><Tables /></ProtectedRoute>} />
      <Route path="/kitchen" element={<ProtectedRoute><KitchenDisplay /></ProtectedRoute>} />
      <Route path="/settings/printer" element={<ProtectedRoute><PrinterSettings /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
      <Route path="/reservations" element={<ProtectedRoute><Reservations /></ProtectedRoute>} />
      <Route path="/staff" element={<ProtectedRoute><StaffManagement /></ProtectedRoute>} />
      <Route path="/menu" element={<ProtectedRoute><MenuManagement /></ProtectedRoute>} />
      <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
      <Route path="/branches" element={<ProtectedRoute><BranchManagement /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
