import React from "react";
import { IAdminStats } from "@/services/api/admin.service";
import {
  Users,
  Building2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  UserCheck,
  Flame,
  Activity,
  ArrowUpRight,
} from "lucide-react";

interface AdminOverviewTabProps {
  stats: IAdminStats | null;
  loading: boolean;
  onNavigateTab: (tab: "users" | "departments" | "volunteers" | "officials" | "audit") => void;
  onOpenProvisionModal: () => void;
}

export const AdminOverviewTab: React.FC<AdminOverviewTabProps> = ({
  stats,
  loading,
  onNavigateTab,
  onOpenProvisionModal,
}) => {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-slate-100 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Quick Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div
          onClick={() => onNavigateTab("users")}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Total Users</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-700 group-hover:bg-purple-100 transition">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">{stats.users.total}</div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>{stats.users.active} Active • {stats.users.inactive} Inactive</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-purple-600" />
          </div>
        </div>

        {/* Departments */}
        <div
          onClick={() => onNavigateTab("departments")}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Departments</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-700 group-hover:bg-blue-100 transition">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">{stats.departments.total}</div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>{stats.departments.active} Active under Sakala SLA</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-blue-600" />
          </div>
        </div>

        {/* Volunteers & Officials */}
        <div
          onClick={() => onNavigateTab("volunteers")}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Field Workforce</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700 group-hover:bg-amber-100 transition">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">{stats.users.volunteers + stats.users.officials}</div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>{stats.users.volunteers} Volunteers • {stats.users.officials} Officials</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-amber-600" />
          </div>
        </div>

        {/* System Grievances */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Grievances Overview</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">{stats.complaints.total}</div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span className="text-emerald-700 font-semibold">{stats.complaints.resolved} Resolved</span>
            <span className="text-amber-700 font-semibold">{stats.complaints.open} Active</span>
          </div>
        </div>
      </div>

      {/* SLA Risk & Escalation Attention Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-red-50 to-orange-50 border border-red-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-600 text-white rounded-xl shadow-xs">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-black text-red-950">{stats.complaints.breached}</div>
              <div className="text-xs font-bold text-red-800 uppercase tracking-wide">SLA Breached Grievances</div>
            </div>
          </div>
          <p className="mt-3 text-xs text-red-700 leading-relaxed">
            Grievances that have surpassed maximum Sakala resolution turnaround limits. Require urgent district intervention.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-600 text-white rounded-xl shadow-xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-black text-amber-950">{stats.complaints.escalated}</div>
              <div className="text-xs font-bold text-amber-800 uppercase tracking-wide">Escalated Grievances</div>
            </div>
          </div>
          <p className="mt-3 text-xs text-amber-700 leading-relaxed">
            Active grievances escalated to Taluk / District / State executive authority for priority resolution.
          </p>
        </div>

        <div
          onClick={() => onNavigateTab("audit")}
          className="p-5 rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 cursor-pointer hover:shadow-md transition"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-700 text-white rounded-xl shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-black text-purple-950">{stats.auditLogsTotal}</div>
              <div className="text-xs font-bold text-purple-800 uppercase tracking-wide">Audit Trail Records</div>
            </div>
          </div>
          <p className="mt-3 text-xs text-purple-700 leading-relaxed">
            Immutable cross-system audit logs tracking user provisioning, SLA re-thresholding, and jurisdiction shifts.
          </p>
        </div>
      </div>

      {/* Quick Operational Shortcuts */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 relative overflow-hidden shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-semibold mb-3 border border-purple-400/30">
              <Clock className="w-3.5 h-3.5" />
              Administrative Operations Hub
            </div>
            <h2 className="text-xl sm:text-2xl font-bold">Government of Karnataka VCGIS Administration</h2>
            <p className="text-sm text-slate-300 max-w-2xl mt-1">
              Configure department hierarchies, monitor volunteer cluster coverage, adjust Sakala statutory SLA limits, and audit administrative actions.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={onOpenProvisionModal}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm transition shadow-sm"
            >
              Provision New User
            </button>
            <button
              onClick={() => onNavigateTab("departments")}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold text-sm transition"
            >
              Configure SLAs
            </button>
            <button
              onClick={() => onNavigateTab("audit")}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold text-sm transition"
            >
              Audit Explorer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
