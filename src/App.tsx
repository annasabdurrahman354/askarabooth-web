/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import React, { useEffect, lazy, Suspense } from "react";
import useAuthStore from "./store/useAuthStore";
import Login from "./pages/Login";
import DashboardLayout from "./components/DashboardLayout";

const OverviewPage = lazy(() => import("./pages/dashboard/OverviewPage"));
const TenantsPage = lazy(() => import("./pages/dashboard/TenantsPage"));
const UsersPage = lazy(() => import("./pages/dashboard/UsersPage"));
const BoothsPage = lazy(() => import("./pages/dashboard/BoothsPage"));
const SessionsPage = lazy(() => import("./pages/dashboard/SessionsPage"));
const CapturesPage = lazy(() => import("./pages/dashboard/CapturesPage"));
const TemplatesPage = lazy(() => import("./pages/dashboard/TemplatesPage"));
const StickersPage = lazy(() => import("./pages/dashboard/StickersPage"));
const TemplateEditor = lazy(() => import("./pages/TemplateEditor"));
const BoothSession = lazy(() => import("./pages/BoothSession"));
const ShareGallery = lazy(() => import("./pages/ShareGallery"));

function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: string[];
}) {
  const { user, loading } = useAuthStore();
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 font-sans">
        <div className="text-slate-400 font-black uppercase tracking-widest text-sm animate-pulse">
          Loading...
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/dashboard" />;
  return <>{children}</>;
}

function RootRedirect() {
  const { user, loading } = useAuthStore();
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 font-sans">
        <div className="text-slate-400 font-black uppercase tracking-widest text-sm animate-pulse">
          Loading...
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" />;
  return <Navigate to="/dashboard" />;
}

export default function App() {
  const { hydrate } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <BrowserRouter>
      <Suspense
        fallback={
          <div className="h-screen flex items-center justify-center bg-slate-50 font-sans">
            <div className="text-slate-400 font-black uppercase tracking-widest text-sm animate-pulse">
              Loading...
            </div>
          </div>
        }
      >
        <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<Login />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={["superadmin", "owner", "admin"]}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<OverviewPage />} />
          <Route 
            path="tenants" 
            element={
              <ProtectedRoute allowedRoles={["superadmin"]}>
                <TenantsPage />
              </ProtectedRoute>
            } 
          />
          <Route path="users" element={<UsersPage />} />
          <Route path="booths" element={<BoothsPage />} />
          <Route path="sessions" element={<SessionsPage />} />
          <Route path="captures" element={<CapturesPage />} />
          <Route path="templates" element={<TemplatesPage />} />
          <Route path="stickers" element={<StickersPage />} />
        </Route>

        <Route
          path="/admin/templates/:id/editor"
          element={
            <ProtectedRoute allowedRoles={["owner", "superadmin"]}>
              <TemplateEditor />
            </ProtectedRoute>
          }
        />

        <Route path="/booth/:boothId/template/:templateId" element={<BoothSession />} />

        <Route path="/share/:token" element={<ShareGallery />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
