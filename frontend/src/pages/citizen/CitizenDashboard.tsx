import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { complaintService } from "@/services/api/complaint.service";
import { ComplaintStats, ComplaintStatus, IComplaint } from "@/types/complaint";
import { GrievanceCard } from "@/components/citizen/GrievanceCard";
import { CreateGrievanceModal } from "@/components/citizen/CreateGrievanceModal";
import { GrievanceDetailModal } from "@/components/citizen/GrievanceDetailModal";
import {
  FileText,
  PlusCircle,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MapPin,
  Search,
  Filter,
  RefreshCw,
  FolderOpen,
} from "lucide-react";

export const CitizenDashboard: React.FC = () => {
  const { user } = useAuth();

  const [complaints, setComplaints] = useState<IComplaint[]>([]);
  const [stats, setStats] = useState<ComplaintStats>({
    total: 0,
    active: 0,
    resolved: 0,
    pending: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<IComplaint | null>(null);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const data = await complaintService.getMyComplaints(
        statusFilter === "ALL" ? undefined : statusFilter,
        searchQuery.trim() || undefined
      );
      setComplaints(data.complaints);
      setStats(data.stats);
    } catch (err) {
      console.error("Failed to fetch citizen complaints:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchComplaints();
  };

  const handleComplaintUpdated = async () => {
    if (selectedComplaint) {
      try {
        const fresh = await complaintService.getComplaintById(selectedComplaint.id);
        setSelectedComplaint(fresh);
      } catch {
        // ignore
      }
    }
    fetchComplaints();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-3 border border-blue-200">
              <MapPin className="w-3.5 h-3.5" />
              {user?.citizenProfile?.village || "Rural Ward"} • {user?.citizenProfile?.district || "Karnataka"}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Welcome back, {user?.name || "Citizen"}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-600">
              Citizen ID: <span className="font-mono font-medium text-slate-700">{user?.id}</span> • Registered Mobile: +91 {user?.phone}
            </p>
          </div>

          <div>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition shadow-md hover:shadow-lg"
            >
              <PlusCircle className="w-4 h-4" />
              Register New Grievance
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Filed</span>
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
          <div className="mt-1 text-[11px] text-slate-500">All registered grievances</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Action</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.pending}</div>
          <div className="mt-1 text-[11px] text-amber-600 font-medium">Under initial review</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">In Progress</span>
            <AlertTriangle className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.active}</div>
          <div className="mt-1 text-[11px] text-blue-600 font-medium">Departmental action underway</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Resolved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.resolved}</div>
          <div className="mt-1 text-[11px] text-emerald-600 font-medium">Successfully redressal</div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Filter pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 text-xs">
          <span className="text-slate-400 font-semibold px-2 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>
          {[
            { label: "All", value: "ALL" },
            { label: "Submitted", value: ComplaintStatus.SUBMITTED },
            { label: "In Progress", value: ComplaintStatus.ACTION_IN_PROGRESS },
            { label: "Resolved", value: ComplaintStatus.RESOLVED },
            { label: "Reopened", value: ComplaintStatus.REOPENED },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 rounded-xl font-semibold transition whitespace-nowrap ${
                statusFilter === tab.value
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ID, title, department..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-900 focus:ring-2 focus:ring-blue-600 outline-hidden"
            />
          </div>
          <button
            type="button"
            onClick={fetchComplaints}
            title="Refresh List"
            className="p-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 transition shrink-0"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Grievance Cards Grid */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-500">Loading your grievances...</p>
        </div>
      ) : complaints.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">No Grievances Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-6">
            {statusFilter !== "ALL" || searchQuery
              ? "No grievances match your current search or filter criteria."
              : "You have not registered any public service grievances yet."}
          </p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            Register Grievance Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {complaints.map((c) => (
            <GrievanceCard
              key={c.id}
              complaint={c}
              onClick={() => setSelectedComplaint(c)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <CreateGrievanceModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={fetchComplaints}
      />

      <GrievanceDetailModal
        complaint={selectedComplaint}
        isOpen={!!selectedComplaint}
        onClose={() => setSelectedComplaint(null)}
        onUpdate={handleComplaintUpdated}
      />
    </div>
  );
};
