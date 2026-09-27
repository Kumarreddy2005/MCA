import React, { useState, useEffect, useCallback } from "react";
import { IUser } from "@/types/auth";
import { adminService } from "@/services/api/admin.service";
import {
  HeartHandshake,
  Search,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Edit3,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
} from "lucide-react";

interface VolunteerItem {
  user: IUser;
  totalComplaintsLogged: number;
  verifiedComplaintsCount: number;
}

export const VolunteerJurisdictionTab: React.FC = () => {
  const [volunteers, setVolunteers] = useState<VolunteerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [districtFilter, setDistrictFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Reassignment Modal State
  const [selectedVolunteer, setSelectedVolunteer] = useState<IUser | null>(null);
  const [village, setVillage] = useState("");
  const [ward, setWard] = useState("");
  const [panchayat, setPanchayat] = useState("");
  const [district, setDistrict] = useState("Mysuru");
  const [savingJurisdiction, setSavingJurisdiction] = useState(false);

  const fetchVolunteers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminService.listVolunteers({
        district: districtFilter !== "ALL" ? districtFilter : undefined,
        search: search.trim() || undefined,
        page,
        limit: 15,
      });
      setVolunteers(res.volunteers);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load volunteers";
      setMessage({ type: "error", text: msg });
    } finally {
      setLoading(false);
    }
  }, [districtFilter, search, page]);

  useEffect(() => {
    fetchVolunteers();
  }, [fetchVolunteers]);

  const handleOpenReassign = (user: IUser) => {
    setSelectedVolunteer(user);
    setVillage(user.volunteerProfile?.assignedVillage || "");
    setWard(user.volunteerProfile?.assignedWard || "");
    setPanchayat(user.volunteerProfile?.assignedPanchayat || "");
    setDistrict(user.volunteerProfile?.district || "Mysuru");
  };

  const handleSaveJurisdiction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVolunteer) return;
    setSavingJurisdiction(true);
    setMessage(null);

    try {
      const updated = await adminService.updateVolunteerJurisdiction(selectedVolunteer.id, {
        assignedVillage: village,
        assignedWard: ward,
        assignedPanchayat: panchayat || undefined,
        district,
      });

      setVolunteers((prev) =>
        prev.map((v) => (v.user.id === selectedVolunteer.id ? { ...v, user: updated } : v))
      );
      setSelectedVolunteer(null);
      setMessage({
        type: "success",
        text: `Reassigned jurisdiction for ${updated.name} to ${village}, ${district}.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update volunteer jurisdiction";
      setMessage({ type: "error", text: msg });
    } finally {
      setSavingJurisdiction(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <HeartHandshake className="w-5 h-5 text-amber-600" />
            Village Volunteer Cluster & Jurisdiction Mapping
          </h2>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl">
            Assign village volunteers to Gram Panchayats, villages, and ward clusters to ensure complete assisted grievance coverage across Karnataka.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 text-xs font-semibold border border-amber-200 shrink-0">
          <MapPin className="w-3.5 h-3.5" />
          {total} Active Volunteers
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-sm ${
            message.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-xs font-bold opacity-70 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by volunteer name, badge ID, phone..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 outline-hidden"
            />
          </div>

          <select
            value={districtFilter}
            onChange={(e) => {
              setDistrictFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-amber-500 outline-hidden"
          >
            <option value="ALL">All Districts</option>
            <option value="Mysuru">Mysuru</option>
            <option value="Bengaluru Urban">Bengaluru Urban</option>
            <option value="Belagavi">Belagavi</option>
            <option value="Kalaburagi">Kalaburagi</option>
            <option value="Dharwad">Dharwad</option>
            <option value="Dakshina Kannada">Dakshina Kannada</option>
          </select>

          <button
            onClick={fetchVolunteers}
            className="p-2 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl hover:bg-slate-50 transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Volunteer Directory Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-6 py-4">Volunteer Info</th>
                <th className="px-6 py-4">Assigned Jurisdiction</th>
                <th className="px-6 py-4">District</th>
                <th className="px-6 py-4">Workload Metrics</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-600" />
                    Loading volunteer directory...
                  </td>
                </tr>
              ) : volunteers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No field volunteers found.
                  </td>
                </tr>
              ) : (
                volunteers.map((item) => (
                  <tr key={item.user.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{item.user.name}</div>
                      <div className="text-xs text-amber-700 font-mono">
                        {item.user.volunteerProfile?.volunteerId || "ID PENDING"}
                      </div>
                      <div className="text-xs text-slate-500">{item.user.phone}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800">
                        {item.user.volunteerProfile?.assignedVillage || "Unassigned"}
                      </div>
                      <div className="text-xs text-slate-500">
                        {item.user.volunteerProfile?.assignedWard || "-"}
                      </div>
                      {item.user.volunteerProfile?.assignedPanchayat && (
                        <div className="text-[11px] text-purple-700">
                          GP: {item.user.volunteerProfile.assignedPanchayat}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                        <MapPin className="w-3 h-3 text-amber-600" />
                        {item.user.volunteerProfile?.district || "Karnataka"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3 text-xs">
                        <div className="flex items-center gap-1 text-slate-600">
                          <ClipboardList className="w-3.5 h-3.5 text-blue-600" />
                          <span>{item.totalComplaintsLogged} logged</span>
                        </div>
                        <div className="flex items-center gap-1 text-emerald-700 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{item.verifiedComplaintsCount} verified</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleOpenReassign(item.user)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 text-xs font-bold transition"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Reassign Cluster
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing <span className="font-semibold text-slate-700">{volunteers.length}</span> of{" "}
            <span className="font-semibold text-slate-700">{total}</span> volunteers
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-medium">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Reassign Jurisdiction Modal */}
      {selectedVolunteer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-amber-600" />
                Reassign Volunteer Cluster
              </h3>
              <button
                onClick={() => setSelectedVolunteer(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="mb-4">
              <div className="font-bold text-slate-900 text-sm">{selectedVolunteer.name}</div>
              <div className="text-xs text-slate-500">Badge: {selectedVolunteer.volunteerProfile?.volunteerId}</div>
            </div>

            <form onSubmit={handleSaveJurisdiction} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Assigned Village Name
                </label>
                <input
                  type="text"
                  required
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  placeholder="e.g. Rampura"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Assigned Ward
                </label>
                <input
                  type="text"
                  required
                  value={ward}
                  onChange={(e) => setWard(e.target.value)}
                  placeholder="e.g. Ward 4"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Grama Panchayat (Optional)
                </label>
                <input
                  type="text"
                  value={panchayat}
                  onChange={(e) => setPanchayat(e.target.value)}
                  placeholder="e.g. Rampura Grama Panchayat"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  District
                </label>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 outline-hidden focus:ring-2 focus:ring-amber-500 bg-white"
                >
                  <option value="Mysuru">Mysuru</option>
                  <option value="Bengaluru Urban">Bengaluru Urban</option>
                  <option value="Belagavi">Belagavi</option>
                  <option value="Kalaburagi">Kalaburagi</option>
                  <option value="Dharwad">Dharwad</option>
                  <option value="Dakshina Kannada">Dakshina Kannada</option>
                  <option value="Tumakuru">Tumakuru</option>
                  <option value="Shivamogga">Shivamogga</option>
                  <option value="Ballari">Ballari</option>
                </select>
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedVolunteer(null)}
                  className="flex-1 py-2 px-4 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingJurisdiction}
                  className="flex-1 py-2 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold transition"
                >
                  {savingJurisdiction ? "Updating..." : "Confirm Reassignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
