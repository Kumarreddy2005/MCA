import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiClient } from "@/services/api/client";
import {
  ShieldCheck,
  RefreshCw,
  Search,
  Clock3,
  CheckCircle2,
  FileText,
  Send,
  Droplets,
  Zap,
  Truck,
  Building2,
  X,
  AlertCircle,
} from "lucide-react";
import { IComplaint, ComplaintStatus, Priority } from "@/types/complaint";

export const DepartmentStaffDashboard: React.FC = () => {
  const { user } = useAuth();
  const staffDeptCode = user?.departmentStaffProfile?.departmentCode || "WATER";

  const [items, setItems] = useState<IComplaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");

  // Selected complaint for action modal
  const [selectedComplaint, setSelectedComplaint] = useState<IComplaint | null>(null);
  const [modalAction, setModalAction] = useState<"STATUS" | "ACTION">("STATUS");
  const [newStatus, setNewStatus] = useState<string>("ACTION_IN_PROGRESS");
  const [actionType, setActionType] = useState<string>("INSPECTION");
  const [remarks, setRemarks] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Department Metadata Helper
  const getDeptMeta = (code: string) => {
    switch (code) {
      case "WATER":
        return {
          title: "Water Supply Department",
          badge: "💧 Water Operations",
          bg: "bg-cyan-950",
          accent: "bg-cyan-600",
          border: "border-cyan-200",
          text: "text-cyan-700",
          lightBg: "bg-cyan-50",
          icon: <Droplets className="h-6 w-6 text-cyan-400" />,
        };
      case "ELECTRICITY":
        return {
          title: "Electricity & Power Department",
          badge: "⚡ Electricity Operations",
          bg: "bg-amber-950",
          accent: "bg-amber-600",
          border: "border-amber-200",
          text: "text-amber-700",
          lightBg: "bg-amber-50",
          icon: <Zap className="h-6 w-6 text-amber-400" />,
        };
      case "ROAD":
      default:
        return {
          title: "Roads & Transport Department",
          badge: "🛣️ Roads Operations",
          bg: "bg-slate-900",
          accent: "bg-orange-600",
          border: "border-orange-200",
          text: "text-orange-700",
          lightBg: "bg-orange-50",
          icon: <Truck className="h-6 w-6 text-orange-400" />,
        };
    }
  };

  const deptMeta = getDeptMeta(staffDeptCode);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params: Record<string, string> = {};
      if (statusFilter !== "ALL") params.status = statusFilter;
      if (priorityFilter !== "ALL") params.priority = priorityFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await apiClient.get("/department-staff/queue", { params });
      setItems(res.data?.data?.complaints || []);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || "Unable to load department queue");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, searchQuery]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  // Handle status update submission
  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint || !remarks.trim()) return;

    setActionLoading(true);
    setError("");
    setSuccessMsg("");
    try {
      if (modalAction === "STATUS") {
        await apiClient.patch(`/department-staff/complaints/${selectedComplaint.id || (selectedComplaint as any)._id}/status`, {
          status: newStatus,
          remarks: remarks.trim(),
        });
        setSuccessMsg(`Complaint ${selectedComplaint.complaintNumber} updated to ${newStatus.replace(/_/g, " ")}`);
      } else {
        await apiClient.post(`/department-staff/complaints/${selectedComplaint.id || (selectedComplaint as any)._id}/actions`, {
          actionType,
          remarks: remarks.trim(),
        });
        setSuccessMsg(`Department action logged for ${selectedComplaint.complaintNumber}`);
      }
      setSelectedComplaint(null);
      setRemarks("");
      await loadQueue();
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || "Operation failed");
    } finally {
      setActionLoading(false);
    }
  };

  // KPI Calculations
  const totalCount = items.length;
  const underReviewCount = items.filter((i) => i.status === ComplaintStatus.UNDER_REVIEW || i.status === ComplaintStatus.ASSIGNED).length;
  const inProgressCount = items.filter((i) => i.status === ComplaintStatus.ACTION_IN_PROGRESS).length;
  const criticalCount = items.filter((i) => i.priority === Priority.CRITICAL || i.priority === Priority.HIGH).length;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Department Banner Header */}
        <div className={`rounded-3xl ${deptMeta.bg} p-6 md:p-8 text-white shadow-xl relative overflow-hidden`}>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl bg-white/10 p-3.5 backdrop-blur-md">
                {deptMeta.icon}
              </div>
              <div>
                <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-300 mb-1">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{deptMeta.badge}</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{deptMeta.title}</h1>
                <p className="text-sm text-slate-300 mt-1">
                  Logged in as <span className="font-semibold text-white">{user?.name}</span> ({user?.email})
                </p>
              </div>
            </div>

            <button
              onClick={loadQueue}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-sm transition backdrop-blur-md self-start md:self-auto"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh Queue</span>
            </button>
          </div>
        </div>

        {/* Global Feedback Banners */}
        {error && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-sm text-red-800 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Operational KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Queue</div>
            <div className="text-3xl font-extrabold text-slate-900 mt-2">{totalCount}</div>
            <p className="text-xs text-slate-500 mt-1">Active assigned complaints</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <div className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Pending Review</div>
            <div className="text-3xl font-extrabold text-amber-600 mt-2">{underReviewCount}</div>
            <p className="text-xs text-slate-500 mt-1">Assigned & Under Review</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider">In Progress</div>
            <div className="text-3xl font-extrabold text-blue-600 mt-2">{inProgressCount}</div>
            <p className="text-xs text-slate-500 mt-1">Field action active</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <div className="text-xs font-semibold text-rose-600 uppercase tracking-wider">High / Critical</div>
            <div className="text-3xl font-extrabold text-rose-600 mt-2">{criticalCount}</div>
            <p className="text-xs text-slate-500 mt-1">Priority SLA cases</p>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 justify-between items-center">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search complaint #, title, village..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 outline-hidden"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 bg-white text-slate-700 focus:ring-2 focus:ring-blue-600 outline-hidden"
            >
              <option value="ALL">All Statuses</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="ACTION_IN_PROGRESS">Action In Progress</option>
              <option value="INFORMATION_REQUIRED">Info Required</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="RESOLVED">Resolved</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 bg-white text-slate-700 focus:ring-2 focus:ring-blue-600 outline-hidden"
            >
              <option value="ALL">All Priorities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>

        {/* Complaints Work Queue Grid */}
        {loading ? (
          <div className="py-20 text-center text-slate-500 bg-white rounded-3xl border border-slate-200">
            <RefreshCw className="w-8 h-8 mx-auto animate-spin text-blue-600 mb-3" />
            <p className="text-sm font-medium">Loading department complaint queue...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-slate-500 bg-white rounded-3xl border border-slate-200 p-8">
            <ShieldCheck className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <h3 className="text-base font-bold text-slate-800">No grievances in queue</h3>
            <p className="text-xs text-slate-500 mt-1">There are no complaints matching your filter criteria for {deptMeta.title}.</p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {items.map((complaint) => {
              const cid = complaint.id || (complaint as any)._id;
              const isUrgent = complaint.priority === Priority.CRITICAL || complaint.priority === Priority.HIGH;

              return (
                <div
                  key={cid}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-xs font-bold text-blue-700 font-mono bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                        {complaint.complaintNumber}
                      </span>
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${
                          isUrgent ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        {complaint.priority}
                      </span>
                    </div>

                    {/* Title & Location */}
                    <h3 className="font-bold text-slate-900 text-sm line-clamp-2 leading-snug">{complaint.title}</h3>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <span>📍 {complaint.location?.village}, {complaint.location?.district}</span>
                    </p>

                    {/* Description */}
                    <p className="mt-3 text-xs text-slate-600 line-clamp-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      {complaint.description}
                    </p>

                    {/* AI Insights summary snippet if present */}
                    {complaint.aiAnalysis?.summary?.summary && (
                      <div className="mt-3 text-[11px] text-blue-900 bg-blue-50/80 p-2 rounded-lg border border-blue-100">
                        <strong>AI Summary:</strong> {complaint.aiAnalysis.summary.summary}
                      </div>
                    )}
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock3 className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-medium text-slate-700">{complaint.status.replace(/_/g, " ")}</span>
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(complaint.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Quick Action buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          setSelectedComplaint(complaint);
                          setModalAction("STATUS");
                          setNewStatus("ACTION_IN_PROGRESS");
                          setRemarks("");
                        }}
                        className="py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Update Status</span>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedComplaint(complaint);
                          setModalAction("ACTION");
                          setActionType("INSPECTION");
                          setRemarks("");
                        }}
                        className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium text-xs rounded-xl transition flex items-center justify-center gap-1.5 border border-slate-200"
                      >
                        <FileText className="w-3.5 h-3.5 text-slate-600" />
                        <span>Log Action</span>
                      </button>
                    </div>

                    <div className="text-[10px] text-slate-400 text-center flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Official supervises final resolution</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Action Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative">
            <button
              onClick={() => setSelectedComplaint(null)}
              className="absolute right-5 top-5 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-5">
              <span className="text-xs font-bold text-blue-700 font-mono bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                {selectedComplaint.complaintNumber}
              </span>
              <h2 className="text-lg font-bold text-slate-900 mt-2">{selectedComplaint.title}</h2>
              <p className="text-xs text-slate-500">
                Current Status: <span className="font-semibold text-slate-700">{selectedComplaint.status.replace(/_/g, " ")}</span>
              </p>
            </div>

            <form onSubmit={handleUpdateStatus} className="space-y-4">
              {modalAction === "STATUS" ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Select New Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-600 outline-hidden font-medium"
                  >
                    <option value="UNDER_REVIEW">UNDER REVIEW (Begin investigation)</option>
                    <option value="ACTION_IN_PROGRESS">ACTION IN PROGRESS (Field team dispatched)</option>
                    <option value="INFORMATION_REQUIRED">INFORMATION REQUIRED (Request info from citizen/volunteer)</option>
                    <option value="ON_HOLD">ON HOLD (Pending materials or permit)</option>
                    <option value="RESOLVED">RESOLVED (Work completed on ground)</option>
                    <option value="ESCALATED">ESCALATE TO OFFICIAL (Escalate to supervisory engineer)</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Action Type
                  </label>
                  <select
                    value={actionType}
                    onChange={(e) => setActionType(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-600 outline-hidden font-medium"
                  >
                    <option value="INSPECTION">On-Site Field Inspection</option>
                    <option value="CONTRACTOR_DISPATCHED">Contractor / Repair Crew Dispatched</option>
                    <option value="NOTICE_ISSUED">Statutory Notice Issued</option>
                    <option value="CITIZEN_CALL">Direct Citizen Telephonic Inquiry</option>
                    <option value="INTERNAL_NOTE">Internal Department Progress Note</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Remarks / Notes (Mandatory)
                </label>
                <textarea
                  rows={4}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Provide explicit operational remarks detailing field progress, materials, or team dispatch..."
                  className="w-full p-3 text-xs rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-600 outline-hidden"
                  required
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedComplaint(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !remarks.trim()}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold transition flex items-center gap-2 shadow-xs"
                >
                  {actionLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Submit {modalAction === "STATUS" ? "Status Update" : "Action Log"}</span>
                      <Send className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
