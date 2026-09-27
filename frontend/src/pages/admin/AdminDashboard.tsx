import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { adminService, IAdminStats } from "@/services/api/admin.service";
import { AdminOverviewTab } from "@/components/admin/AdminOverviewTab";
import { UserManagementTab } from "@/components/admin/UserManagementTab";
import { DepartmentSlaTab } from "@/components/admin/DepartmentSlaTab";
import { VolunteerJurisdictionTab } from "@/components/admin/VolunteerJurisdictionTab";
import { OfficialHierarchyTab } from "@/components/admin/OfficialHierarchyTab";
import { SystemAuditLogsTab } from "@/components/admin/SystemAuditLogsTab";
import { AnalyticsDashboardPage } from "./AnalyticsDashboardPage";
import {
  Shield,
  LayoutDashboard,
  Users,
  Building2,
  HeartHandshake,
  ShieldAlert,
  Clock,
  RefreshCw,
  BarChart3,
} from "lucide-react";

type AdminTab = "overview" | "users" | "departments" | "volunteers" | "officials" | "audit" | "analytics";

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [stats, setStats] = useState<IAdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await adminService.getStats();
      setStats(data);
    } catch (err: unknown) {
      console.error("Failed to load admin stats:", err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const tabs: Array<{ id: AdminTab; label: string; icon: React.FC<{ className?: string }> }> = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "users", label: "Users & Lifecycle", icon: Users },
    { id: "departments", label: "Departments & SLAs", icon: Building2 },
    { id: "volunteers", label: "Volunteer Clusters", icon: HeartHandshake },
    { id: "officials", label: "Official Hierarchy", icon: ShieldAlert },
    { id: "audit", label: "Audit Logs", icon: Clock },
    { id: "analytics", label: "GIS & Spatial Analytics", icon: BarChart3 },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Welcome Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-800 text-xs font-semibold mb-2 border border-purple-200">
              <Shield className="w-3.5 h-3.5" />
              Government of Karnataka • Central Administration Portal
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {user?.name || "System Administrator"}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-600">
              Administrator ID: <span className="font-mono text-purple-700">{user?.id}</span> • Scope:{" "}
              {user?.adminProfile?.superAdmin ? "Super Administrator (State Authority)" : "Administrative Officer"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchStats}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
              title="Refresh System Statistics"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${statsLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tab Bar */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap shrink-0 ${
                  isActive
                    ? "bg-purple-700 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content Display */}
      <div>
        {activeTab === "overview" && (
          <AdminOverviewTab
            stats={stats}
            loading={statsLoading}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onOpenProvisionModal={() => setActiveTab("users")}
          />
        )}
        {activeTab === "users" && <UserManagementTab />}
        {activeTab === "departments" && <DepartmentSlaTab />}
        {activeTab === "volunteers" && <VolunteerJurisdictionTab />}
        {activeTab === "officials" && <OfficialHierarchyTab />}
        {activeTab === "audit" && <SystemAuditLogsTab />}
        {activeTab === "analytics" && <AnalyticsDashboardPage />}
      </div>
    </div>
  );
};
