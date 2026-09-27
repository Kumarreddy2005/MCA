import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  HeartHandshake,
  UserPlus,
  FileCheck,
  ClipboardList,
  MapPin,
  Search,
  Bot,
  AlertTriangle,
  Users,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { IComplaint, VolunteerWorkQueueStats, ComplaintStatus } from "@/types/complaint";
import { IUser } from "@/types/auth";
import { volunteerService } from "@/services/api/volunteer.service";
import { VolunteerComplaintCard } from "@/components/volunteer/VolunteerComplaintCard";
import { RegisterCitizenModal } from "@/components/volunteer/RegisterCitizenModal";
import { AssistedComplaintModal } from "@/components/volunteer/AssistedComplaintModal";
import { FieldVerificationModal } from "@/components/volunteer/FieldVerificationModal";
import { VolunteerAiAssistantModal } from "@/components/volunteer/VolunteerAiAssistantModal";
import { GrievanceDetailModal } from "@/components/citizen/GrievanceDetailModal";

type DashboardTab = "verifications" | "cluster" | "citizens";

export const VolunteerDashboard: React.FC = () => {
  const { user } = useAuth();
  const volunteerProfile = user?.volunteerProfile;

  // Active Tab
  const [activeTab, setActiveTab] = useState<DashboardTab>("verifications");

  // State: Complaints & Work Queue
  const [complaints, setComplaints] = useState<IComplaint[]>([]);
  const [stats, setStats] = useState<VolunteerWorkQueueStats>({
    totalCluster: 0,
    pendingVerification: 0,
    verifiedCount: 0,
    resolvedCount: 0,
    urgentCount: 0,
    registeredCitizens: 0,
    assignedVillage: volunteerProfile?.assignedVillage || "Rampura",
    assignedWard: volunteerProfile?.assignedWard || "Ward 4",
  });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // State: Citizens list
  const [citizens, setCitizens] = useState<IUser[]>([]);
  const [loadingCitizens, setLoadingCitizens] = useState(false);
  const [citizenSearch, setCitizenSearch] = useState("");

  // Modals state
  const [showRegisterCitizen, setShowRegisterCitizen] = useState(false);
  const [showAssistedComplaint, setShowAssistedComplaint] = useState(false);
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [verifyingComplaint, setVerifyingComplaint] = useState<IComplaint | null>(null);
  const [selectedComplaint, setSelectedComplaint] = useState<IComplaint | null>(null);
  const [preselectedCitizen, setPreselectedCitizen] = useState<IUser | null>(null);
  const [initialDraft, setInitialDraft] = useState<{
    title: string;
    description: string;
    category: string;
    department: string;
    priority: string;
  } | null>(null);

  // Fetch Work Queue Data
  const loadWorkQueue = useCallback(async () => {
    try {
      setLoading(true);
      const data = await volunteerService.getWorkQueue({
        tab: activeTab === "verifications" ? "verifications" : "cluster",
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        search: searchQuery || undefined,
      });
      setComplaints(data.complaints);
      setStats(data.stats);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [activeTab, statusFilter, searchQuery]);

  // Fetch Citizens
  const loadCitizens = useCallback(async (q = "") => {
    try {
      setLoadingCitizens(true);
      const list = await volunteerService.searchCitizens(q);
      setCitizens(list);
    } catch {
      // ignore
    } finally {
      setLoadingCitizens(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "citizens") {
      loadCitizens(citizenSearch);
    } else {
      loadWorkQueue();
    }
  }, [activeTab, loadWorkQueue, loadCitizens, citizenSearch]);

  const handleOpenAssistForCitizen = (citizen: IUser) => {
    setPreselectedCitizen(citizen);
    setShowAssistedComplaint(true);
  };

  const handleCitizenRegistered = (newCitizen: IUser) => {
    setCitizens((prev) => [newCitizen, ...prev]);
    setStats((prev) => ({ ...prev, registeredCitizens: prev.registeredCitizens + 1 }));
    setPreselectedCitizen(newCitizen);
    setShowAssistedComplaint(true);
  };

  const handleComplaintCreated = (newComplaint: IComplaint) => {
    setComplaints((prev) => [newComplaint, ...prev]);
    setStats((prev) => ({
      ...prev,
      totalCluster: prev.totalCluster + 1,
      pendingVerification:
        newComplaint.status === ComplaintStatus.SUBMITTED
          ? prev.pendingVerification + 1
          : prev.pendingVerification,
      verifiedCount:
        newComplaint.status === ComplaintStatus.VERIFIED
          ? prev.verifiedCount + 1
          : prev.verifiedCount,
    }));
  };

  const handleVerificationCompleted = (updated: IComplaint) => {
    setComplaints((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setStats((prev) => ({
      ...prev,
      pendingVerification: Math.max(0, prev.pendingVerification - 1),
      verifiedCount: prev.verifiedCount + 1,
    }));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Banner */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-semibold mb-3 border border-amber-200">
              <HeartHandshake className="w-3.5 h-3.5" />
              Volunteer Badge: {volunteerProfile?.volunteerId || "VOL-MYS-001"}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              {user?.name || "Village Volunteer"}
            </h1>
            <p className="mt-1 text-sm text-slate-600 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-400" />
              Assigned Area: <strong>{volunteerProfile?.assignedVillage || "Rampura"}</strong> •{" "}
              {volunteerProfile?.assignedWard || "Ward 4"} ({volunteerProfile?.district || "Mysuru"})
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => setShowRegisterCitizen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm transition shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              Register Citizen
            </button>
            <button
              onClick={() => {
                setPreselectedCitizen(null);
                setShowAssistedComplaint(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition shadow-sm"
            >
              <FileCheck className="w-4 h-4" />
              Assist Complaint
            </button>
            <button
              onClick={() => setShowAiAssistant(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 font-semibold text-sm transition border border-amber-200"
              title="AI Verbal Grievance Assistant"
            >
              <Bot className="w-4 h-4 text-amber-700" />
              <span>AI Assistant</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Registered Citizens</span>
            <Users className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-3xl font-bold text-slate-900">{stats.registeredCitizens}</div>
          <div className="mt-1 text-xs text-slate-500">In assigned village cluster</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Verification</span>
            <ClipboardList className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-blue-700">{stats.pendingVerification}</div>
          <div className="mt-1 text-xs text-blue-600 font-medium">Require physical inspection</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Cluster Complaints</span>
            <FileCheck className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-3xl font-bold text-slate-900">{stats.totalCluster}</div>
          <div className="mt-1 text-xs text-emerald-600 font-medium">{stats.verifiedCount} verified on-site</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Urgent / Critical</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-3xl font-bold text-rose-700">{stats.urgentCount}</div>
          <div className="mt-1 text-xs text-rose-600 font-medium">High SLA priority</div>
        </div>
      </div>

      {/* Tabs & Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-6 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          {/* Tabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("verifications")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
                activeTab === "verifications"
                  ? "bg-blue-50 text-blue-800 border border-blue-200 shadow-xs"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              <span>Pending Verifications</span>
              {stats.pendingVerification > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                  {stats.pendingVerification}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("cluster")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
                activeTab === "cluster"
                  ? "bg-amber-50 text-amber-900 border border-amber-200 shadow-xs"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <FileCheck className="w-4 h-4" />
              <span>Cluster Grievances</span>
            </button>

            <button
              onClick={() => setActiveTab("citizens")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
                activeTab === "citizens"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Cluster Citizens</span>
            </button>
          </div>

          <button
            onClick={() => (activeTab === "citizens" ? loadCitizens(citizenSearch) : loadWorkQueue())}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition self-end sm:self-auto"
            title="Refresh List"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Filters for Complaints */}
        {activeTab !== "citizens" ? (
          <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by ID, title, citizen name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
              />
            </div>

            {/* Status Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {["ALL", "SUBMITTED", "VERIFIED", "ACTION_IN_PROGRESS", "RESOLVED"].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                    statusFilter === status
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="pt-4 max-w-md">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search registered villagers by name or phone..."
                value={citizenSearch}
                onChange={(e) => {
                  setCitizenSearch(e.target.value);
                  loadCitizens(e.target.value);
                }}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
              />
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {activeTab === "citizens" ? (
        /* Cluster Citizens Tab */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-bold text-sm text-slate-800">
              Registered Villagers ({citizens.length})
            </h3>
            <button
              onClick={() => setShowRegisterCitizen(true)}
              className="text-xs font-semibold text-amber-700 hover:text-amber-800 hover:underline"
            >
              + Onboard New Villager
            </button>
          </div>

          {loadingCitizens ? (
            <div className="p-12 text-center text-slate-500 text-sm">Loading citizen directory...</div>
          ) : citizens.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-medium">No registered villagers found</p>
              <p className="text-xs text-slate-400 mt-1">
                Click &quot;Register Citizen&quot; above to onboard villagers in your cluster.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {citizens.map((c) => (
                <div
                  key={c.id}
                  className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-sm">
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        {c.name}
                        {c.isVerified && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <ShieldCheck className="w-3 h-3" /> Verified
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        📱 +91 {c.phone} • 📍 {c.citizenProfile?.village || "Rampura"}{" "}
                        {c.citizenProfile?.ward ? `(${c.citizenProfile.ward})` : ""}{" "}
                        {c.citizenProfile?.address ? `• ${c.citizenProfile.address}` : ""}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenAssistForCitizen(c)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 font-semibold text-xs transition border border-amber-200 self-start sm:self-auto"
                  >
                    <FileCheck className="w-3.5 h-3.5 text-amber-700" />
                    <span>File Grievance</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Work Queue & Cluster Grievances */
        <div>
          {loading ? (
            <div className="p-16 text-center text-slate-500 text-sm">Loading complaints queue...</div>
          ) : complaints.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
              <ClipboardList className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-medium">
                {activeTab === "verifications"
                  ? "No complaints currently pending verification"
                  : "No grievances found matching the criteria"}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {activeTab === "verifications"
                  ? "All reported grievances in your cluster have been physically verified."
                  : "Use the 'Assist Complaint' button to register a citizen grievance."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {complaints.map((c) => (
                <VolunteerComplaintCard
                  key={c.id}
                  complaint={c}
                  onViewDetails={() => setSelectedComplaint(c)}
                  onVerify={() => setVerifyingComplaint(c)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <RegisterCitizenModal
        isOpen={showRegisterCitizen}
        onClose={() => setShowRegisterCitizen(false)}
        onSuccess={handleCitizenRegistered}
      />

      <AssistedComplaintModal
        isOpen={showAssistedComplaint}
        onClose={() => {
          setShowAssistedComplaint(false);
          setInitialDraft(null);
        }}
        onSuccess={handleComplaintCreated}
        onOpenRegisterCitizen={() => {
          setShowAssistedComplaint(false);
          setShowRegisterCitizen(true);
        }}
        preselectedCitizen={preselectedCitizen}
        initialDraft={initialDraft}
      />

      <FieldVerificationModal
        isOpen={!!verifyingComplaint}
        complaint={verifyingComplaint}
        onClose={() => setVerifyingComplaint(null)}
        onSuccess={handleVerificationCompleted}
      />

      <VolunteerAiAssistantModal
        isOpen={showAiAssistant}
        onClose={() => setShowAiAssistant(false)}
        onApplyDraft={(draft) => {
          setInitialDraft(draft);
          setShowAssistedComplaint(true);
        }}
        defaultVillage={volunteerProfile?.assignedVillage || "Rampura"}
      />

      <GrievanceDetailModal
        complaint={selectedComplaint}
        isOpen={!!selectedComplaint}
        onClose={() => setSelectedComplaint(null)}
        onUpdate={() => {
          setSelectedComplaint(null);
          loadWorkQueue();
        }}
      />
    </div>
  );
};
