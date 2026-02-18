import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleProtectedRoute } from "@/components/RoleProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";

import Auth from "@/features/auth/pages/Auth";
import Dashboard from "@/features/dashboard/pages/Dashboard";
import Companies from "@/features/crm/pages/Companies";
import Matching from "@/features/matching/pages/Matching";
import DueDiligence from "@/features/due-diligence/pages/DueDiligence";
import Valuation from "@/features/valuation/pages/Valuation";
import Strategy from "@/features/strategy/pages/Strategy";
import Contracts from "@/features/legal/pages/Contracts";
import Risk from "@/features/risk/pages/Risk";
import PMI from "@/features/pmi/pages/PMI";
import AdminUsers from "@/features/admin/pages/AdminUsers";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/companies" element={<Companies />} />
              <Route path="/matching" element={<Matching />} />
              <Route path="/due-diligence" element={<DueDiligence />} />
              <Route path="/valuation" element={<Valuation />} />
              <Route path="/strategy" element={<Strategy />} />
              <Route path="/contracts" element={<Contracts />} />
              <Route path="/pmi" element={<PMI />} />
              <Route path="/risk" element={<Risk />} />
              <Route
                path="/admin/users"
                element={
                  <RoleProtectedRoute requiredRole="admin">
                    <AdminUsers />
                  </RoleProtectedRoute>
                }
              />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;