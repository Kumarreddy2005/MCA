import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { Navbar } from "@/components/layout/Navbar";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { HomePage } from "@/pages/HomePage";
import { LoginPage } from "@/pages/auth/LoginPage";
import { CitizenDashboard } from "@/pages/citizen/CitizenDashboard";
import { VolunteerDashboard } from "@/pages/volunteer/VolunteerDashboard";
import { DepartmentStaffDashboard } from "@/pages/department-staff/DepartmentStaffDashboard";
import { OfficialDashboard } from "@/pages/official/OfficialDashboard";
import { AdminDashboard } from "@/pages/admin/AdminDashboard";
import { AnalyticsDashboardPage } from "@/pages/admin/AnalyticsDashboardPage";
import { UserRole } from "@/types/auth";

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans antialiased">
          <Navbar />
          <main className="flex-1">
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<Navigate to="/login" replace />} />

              {/* Citizen Portal */}
              <Route
                path="/citizen/*"
                element={
                  <ProtectedRoute allowedRoles={[UserRole.CITIZEN, UserRole.ADMIN]}>
                    <CitizenDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Volunteer Portal */}
              <Route
                path="/volunteer/*"
                element={
                  <ProtectedRoute allowedRoles={[UserRole.VOLUNTEER, UserRole.ADMIN]}>
                    <VolunteerDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Department Staff Portal */}
              <Route path="/department-staff/*" element={<ProtectedRoute allowedRoles={[UserRole.DEPARTMENT_STAFF, UserRole.ADMIN]}><DepartmentStaffDashboard /></ProtectedRoute>} />

              {/* Department Official Portal */}
              <Route
                path="/official/*"
                element={
                  <ProtectedRoute allowedRoles={[UserRole.OFFICIAL, UserRole.ADMIN]}>
                    <OfficialDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Administrator Portal */}
              <Route
                path="/admin/*"
                element={
                  <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Geographic & Executive Analytics Portal */}
              <Route
                path="/analytics/*"
                element={
                  <ProtectedRoute allowedRoles={[UserRole.OFFICIAL, UserRole.ADMIN]}>
                    <AnalyticsDashboardPage />
                  </ProtectedRoute>
                }
              />

              {/* 404 Catch-All */}
              <Route
                path="*"
                element={
                  <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
                    <h1 className="text-4xl font-extrabold text-slate-900 mb-2">404</h1>
                    <p className="text-slate-600 mb-6">The requested page does not exist.</p>
                    <a
                      href="/"
                      className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm shadow-sm hover:bg-blue-700 transition"
                    >
                      Return to Home
                    </a>
                  </div>
                }
              />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
