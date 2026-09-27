import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  Filter,
  MapPin,
  RefreshCw,
  Search,
  SlidersHorizontal,
  UserCheck,
  BarChart3,
} from "lucide-react";
import { IComplaint, OfficialDashboardMetrics, Priority } from "@/types/complaint";
import { officialService } from "@/services/api/official.service";
import { OfficialReviewModal } from "@/components/official/OfficialReviewModal";
import { SlaComplianceCard } from "@/components/sla/SlaComplianceCard";

export const OfficialDashboard: React.FC = () => {
  const { user } = useAuth();
  const departmentName =
    user?.officialProfile?.department || "Rural Development & Panchayat Raj";

  const [metrics, setMetrics] = useState<OfficialDashboardMetrics | null>(null);
  const [complaints, setComplaints] = useState<IComplaint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [metricsLoading, setMetricsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [assignedToMeOnly, setAssignedToMeOnly] = useState<boolean>(false);
  const [slaRiskOnly, setSlaRiskOnly] = useState<boolean>(false);

  // Action Drawer / Modal
  const [selectedComplaint, setSelectedComplaint] = useState<IComplaint | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setMetricsLoading(true);
      const data = await officialService.getMetrics();
      setMetrics(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load metrics";
      console.error("Failed to load metrics:", msg);
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  const fetchQueue = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let statusParam: string | undefined;
      let priorityParam: string | undefined;

      if (activeTab === "ASSIGNED") statusParam = "ASSIGNED";
      else if (activeTab === "IN_PROGRESS") statusParam = "ACTION_IN_PROGRESS";
      else if (activeTab === "RESOLVED") statusParam = "RESOLVED";
      else if (activeTab === "REOPENED") statusParam = "REOPENED";
      else if (activeTab === "URGENT") priorityParam = "CRITICAL,HIGH";

      const res = await officialService.getWorkQueue({
        status: statusParam,
        priority: priorityParam,
        search: searchQuery.trim() || undefined,
        assignedToMe: assignedToMeOnly || undefined,
        slaRisk: slaRiskOnly || undefined,
      });

      setComplaints(res.complaints);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load departmental queue";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery, assignedToMeOnly, slaRiskOnly]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchQueue();
  };

  const handleActionComplete = (updated: IComplaint) => {
    setComplaints((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    fetchMetrics();
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case Priority.CRITICAL:
        return "bg-rose-100 text-rose-800 border-rose-300 font-bold";
      case Priority.HIGH:
        return "bg-orange-100 text-orange-800 border-orange-300 font-semibold";
      case Priority.MEDIUM:
        return "bg-amber-100 text-amber-800 border-amber-300";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "RESOLVED":
      case "CLOSED":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "ACTION_IN_PROGRESS":
        return "bg-purple-100 text-purple-800 border-purple-300";
      case "UNDER_REVIEW":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "INFORMATION_REQUIRED":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "REJECTED":
        return "bg-rose-100 text-rose-800 border-rose-300";
      case "REOPENED":
        return "bg-red-100 text-red-800 border-red-300 animate-pulse font-bold";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  const getSlaRemainingBadge = (targetDateStr: string, isBreached: boolean) => {
    const target = new Date(targetDateStr).getTime();
    const now = Date.now();
    const diffHours = Math.round((target - now) / (1000 * 60 * 60));

    if (isBreached || diffHours < 0) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full animate-pulse">
          <AlertCircle className="w-3 h-3" />
          Breached ({Math.abs(diffHours)}h overdue)
        </span>
      );
    }
    if (diffHours <= 24) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
          <Clock className="w-3 h-3" />
          Critical ({diffHours}h left)
        </span>
      );
    }
    if (diffHours <= 48) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
          <Clock className="w-3 h-3" />
          Warning ({diffHours}h left)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
        <CheckCircle2 className="w-3 h-3" />
        {Math.round(diffHours / 24)}d left
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Official Header Banner */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold mb-3 border border-emerald-200">
              <Building2 className="w-3.5 h-3.5" />
              Government of Karnataka • {departmentName}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              {user?.name || "Department Official"}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-600">
              Designation: <strong>{user?.officialProfile?.designation || "Executive Engineer"}</strong> • Jurisdiction:{" "}
              {user?.officialProfile?.jurisdictionTaluk
                ? `${user.officialProfile.jurisdictionTaluk}, `
                : ""}
              {user?.officialProfile?.jurisdictionDistrict || "Mysuru"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/analytics"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-semibold text-xs transition"
              title="State GIS Map & Hotspot Spatial Intelligence"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              GIS & Analytics
            </Link>
            <button
              onClick={() => {
                fetchMetrics();
                fetchQueue();
              }}
              disabled={loading || metricsLoading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* 7 Section 25 KPI Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
        {/* 1. Total Complaints */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Total</div>
          <div className="text-xl font-bold text-slate-900">
            {metricsLoading ? "..." : metrics?.totalComplaints ?? 0}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Department total</div>
        </div>

        {/* 2. New (Last 48h) */}
        <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-xs bg-blue-50/20">
          <div className="text-[11px] font-bold uppercase tracking-wider text-blue-700 mb-1">New (48h)</div>
          <div className="text-xl font-bold text-blue-800">
            {metricsLoading ? "..." : metrics?.newComplaints ?? 0}
          </div>
          <div className="text-[10px] text-blue-600 mt-1">Recently assigned</div>
        </div>

        {/* 3. Pending Action */}
        <div className="bg-white p-4 rounded-2xl border border-purple-200 shadow-xs bg-purple-50/20">
          <div className="text-[11px] font-bold uppercase tracking-wider text-purple-700 mb-1">Pending</div>
          <div className="text-xl font-bold text-purple-800">
            {metricsLoading ? "..." : metrics?.pendingComplaints ?? 0}
          </div>
          <div className="text-[10px] text-purple-600 mt-1">Active processing</div>
        </div>

        {/* 4. Urgent Priority */}
        <div className="bg-white p-4 rounded-2xl border border-orange-200 shadow-xs bg-orange-50/20">
          <div className="text-[11px] font-bold uppercase tracking-wider text-orange-700 mb-1">Urgent</div>
          <div className="text-xl font-bold text-orange-800">
            {metricsLoading ? "..." : metrics?.urgentComplaints ?? 0}
          </div>
          <div className="text-[10px] text-orange-600 mt-1">High & Critical</div>
        </div>

        {/* 5. SLA At Risk */}
        <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-xs bg-rose-50/30">
          <div className="text-[11px] font-bold uppercase tracking-wider text-rose-700 mb-1">SLA Risk</div>
          <div className="text-xl font-bold text-rose-700">
            {metricsLoading ? "..." : metrics?.slaRiskComplaints ?? 0}
          </div>
          <div className="text-[10px] text-rose-600 mt-1">Breached / &lt;24h</div>
        </div>

        {/* 6. Resolved */}
        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-xs bg-emerald-50/20">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 mb-1">Resolved</div>
          <div className="text-xl font-bold text-emerald-800">
            {metricsLoading ? "..." : metrics?.resolvedComplaints ?? 0}
          </div>
          <div className="text-[10px] text-emerald-600 mt-1">Closed & verified</div>
        </div>

        {/* 7. Reopened */}
        <div className="bg-white p-4 rounded-2xl border border-red-200 shadow-xs bg-red-50/20">
          <div className="text-[11px] font-bold uppercase tracking-wider text-red-700 mb-1">Reopened</div>
          <div className="text-xl font-bold text-red-800">
            {metricsLoading ? "..." : metrics?.reopenedComplaints ?? 0}
          </div>
          <div className="text-[10px] text-red-600 mt-1">Citizen unsatisfied</div>
        </div>
      </div>

      {/* SLA Monitoring & Multi-Tier Escalation Card */}
      <SlaComplianceCard
        department={departmentName}
        onSweepComplete={() => {
          fetchMetrics();
          fetchQueue();
        }}
      />

      {/* Filter and Search Controls */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs mb-6 space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="w-full sm:w-96 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ID (e.g. KRN-RDPR-), title, or village..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </form>

          {/* SLA and Assignment Toggles */}
          <div className="flex items-center gap-4 w-full sm:w-auto justify-end text-xs">
            <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700 font-medium">
              <input
                type="checkbox"
                checked={assignedToMeOnly}
                onChange={(e) => setAssignedToMeOnly(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
              />
              <UserCheck className="w-3.5 h-3.5 text-slate-500" />
              Assigned to Me
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none text-rose-700 font-bold">
              <input
                type="checkbox"
                checked={slaRiskOnly}
                onChange={(e) => setSlaRiskOnly(e.target.checked)}
                className="rounded border-rose-300 text-rose-600 focus:ring-rose-500 w-4 h-4"
              />
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              SLA Risk Only
            </label>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-slate-100">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          {[
            { key: "ALL", label: "All Department Grievances" },
            { key: "ASSIGNED", label: "New & Assigned" },
            { key: "IN_PROGRESS", label: "Action In Progress" },
            { key: "URGENT", label: "High & Critical Priority" },
            { key: "REOPENED", label: "Reopened" },
            { key: "RESOLVED", label: "Resolved / Closed" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors ${
                activeTab === tab.key
                  ? "bg-emerald-700 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Department Grievance Work Queue */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Department Grievance Work Queue ({complaints.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Strictly isolated to <strong>{departmentName}</strong> jurisdiction
            </p>
          </div>
          <span className="text-xs text-slate-400 hidden sm:inline">
            Click any row to review proof, update SLA, or confirm resolution
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500">
            Loading departmental grievance queue...
          </div>
        ) : complaints.length === 0 ? (
          <div className="py-16 text-center px-4">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">No grievances found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No active grievances match the selected status, search, or SLA criteria in your department.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {complaints.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedComplaint(c)}
                className="p-5 hover:bg-slate-50/80 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {c.complaintNumber}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getStatusBadge(
                        c.status
                      )}`}
                    >
                      {c.status.replace(/_/g, " ")}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getPriorityBadge(
                        c.priority
                      )}`}
                    >
                      {c.priority}
                    </span>
                    {getSlaRemainingBadge(c.sla.targetResolutionDate, c.sla.isBreached)}
                    {c.source === "VOLUNTEER_ASSISTED" && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                        Volunteer Assisted
                      </span>
                    )}
                    {c.verification?.result === "VERIFIED" && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Field Verified
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{c.title}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2">{c.description}</p>

                  <div className="flex items-center gap-4 text-xs text-slate-500 pt-1 flex-wrap">
                    <span className="flex items-center gap-1 font-medium text-slate-700">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {c.location.village}
                      {c.location.ward ? ` (${c.location.ward})` : ""},{" "}
                      {c.location.mandal || "Mysuru Taluk"}, {c.location.district}
                    </span>
                    <span>•</span>
                    <span>Citizen: {c.citizenName} (+91 {c.citizenPhone})</span>
                    <span>•</span>
                    <span>
                      Target SLA:{" "}
                      <strong className="text-slate-700">
                        {new Date(c.sla.targetResolutionDate).toLocaleString()}
                      </strong>
                    </span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center sm:self-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedComplaint(c);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-xs"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    Review & Act
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Official Review Modal */}
      {selectedComplaint && (
        <OfficialReviewModal
          isOpen={!!selectedComplaint}
          onClose={() => setSelectedComplaint(null)}
          complaint={selectedComplaint}
          officialDepartment={departmentName}
          onActionComplete={handleActionComplete}
        />
      )}
    </div>
  );
};
