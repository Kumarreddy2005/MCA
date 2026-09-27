import React, { useState, useEffect, useCallback } from "react";
import { IUser } from "@/types/auth";
import { adminService } from "@/services/api/admin.service";
import { GovernmentDepartments, DEPARTMENT_CODE_BY_NAME } from "@/types/complaint";
import {
  Building,
  Search,
  CheckCircle2,
  AlertCircle,
  Edit3,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";

export const OfficialHierarchyTab: React.FC = () => {
  const [officials, setOfficials] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Edit Assignment Modal
  const [selectedOfficial, setSelectedOfficial] = useState<IUser | null>(null);
  const [dept, setDept] = useState("Roads & Transport");
  const [designation, setDesignation] = useState("Executive Engineer");
  const [district, setDistrict] = useState("Mysuru");
  const [taluk, setTaluk] = useState("Mysuru Taluk");
  const [savingAssignment, setSavingAssignment] = useState(false);

  const fetchOfficials = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminService.listOfficials({
        department: departmentFilter !== "ALL" ? departmentFilter : undefined,
        search: search.trim() || undefined,
        page,
        limit: 15,
      });
      setOfficials(res.officials);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load officials";
      setMessage({ type: "error", text: msg });
    } finally {
      setLoading(false);
    }
  }, [departmentFilter, search, page]);

  useEffect(() => {
    fetchOfficials();
  }, [fetchOfficials]);

  const handleOpenAssign = (u: IUser) => {
    setSelectedOfficial(u);
    setDept(u.officialProfile?.department || "Roads & Transport");
    setDesignation(u.officialProfile?.designation || "Executive Officer");
    setDistrict(u.officialProfile?.jurisdictionDistrict || "Mysuru");
    setTaluk(u.officialProfile?.jurisdictionTaluk || "Mysuru Taluk");
  };

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOfficial) return;
    setSavingAssignment(true);
    setMessage(null);

    try {
      const updated = await adminService.updateOfficialAssignment(selectedOfficial.id, {
        department: dept,
        departmentCode: DEPARTMENT_CODE_BY_NAME[dept as keyof typeof DEPARTMENT_CODE_BY_NAME],
        designation,
        jurisdictionDistrict: district,
        jurisdictionTaluk: taluk || undefined,
      });

      setOfficials((prev) => prev.map((o) => (o.id === selectedOfficial.id ? updated : o)));
      setSelectedOfficial(null);
      setMessage({
        type: "success",
        text: `Updated official hierarchy assignment for ${updated.name} (${dept}).`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update official assignment";
      setMessage({ type: "error", text: msg });
    } finally {
      setSavingAssignment(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Building className="w-5 h-5 text-emerald-600" />
            Department Official Hierarchy & Competent Authorities
          </h2>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl">
            Configure department allocations, designations, and Taluk/District administrative scopes for redressal officers.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200 shrink-0">
          <ShieldAlert className="w-3.5 h-3.5" />
          {total} Registered Officials
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

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by official name, email, phone..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-hidden"
            />
          </div>

          <select
            value={departmentFilter}
            onChange={(e) => {
              setDepartmentFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
          >
            <option value="ALL">All Departments</option>
            {GovernmentDepartments.map((department) => (
              <option key={department} value={department}>{department}</option>
            ))}
          </select>

          <button
            onClick={fetchOfficials}
            className="p-2 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl hover:bg-slate-50 transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Officials Directory Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-6 py-4">Officer Details</th>
                <th className="px-6 py-4">Department & Designation</th>
                <th className="px-6 py-4">Administrative Jurisdiction</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                    Loading official hierarchy...
                  </td>
                </tr>
              ) : officials.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No department officials found.
                  </td>
                </tr>
              ) : (
                officials.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{o.name}</div>
                      <div className="text-xs text-slate-500">{o.phone}</div>
                      {o.email && <div className="text-xs text-emerald-800 font-mono">{o.email}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-emerald-900">
                        {o.officialProfile?.department || "Unassigned Dept"}
                      </div>
                      <div className="text-xs text-slate-600">
                        {o.officialProfile?.designation || "Official"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800">
                        {o.officialProfile?.jurisdictionTaluk || "District-Wide"}
                      </div>
                      <div className="text-xs text-slate-500">
                        District: {o.officialProfile?.jurisdictionDistrict || "Karnataka"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {o.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleOpenAssign(o)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-xs font-bold transition"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit Assignment
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
            Showing <span className="font-semibold text-slate-700">{officials.length}</span> of{" "}
            <span className="font-semibold text-slate-700">{total}</span> officials
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

      {/* Edit Assignment Modal */}
      {selectedOfficial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Building className="w-5 h-5 text-emerald-600" />
                Edit Official Assignment
              </h3>
              <button
                onClick={() => setSelectedOfficial(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="mb-4">
              <div className="font-bold text-slate-900 text-sm">{selectedOfficial.name}</div>
              <div className="text-xs text-slate-500">{selectedOfficial.phone} • {selectedOfficial.email}</div>
            </div>

            <form onSubmit={handleSaveAssignment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Department
                </label>
                <input
                  type="text"
                  required
                  value={dept}
                  onChange={(e) => setDept(e.target.value)}
                  placeholder="e.g. Roads & Transport"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Designation / Role
                </label>
                <input
                  type="text"
                  required
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="e.g. Executive Engineer"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Jurisdiction District
                </label>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
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

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Jurisdiction Taluk (Optional)
                </label>
                <input
                  type="text"
                  value={taluk}
                  onChange={(e) => setTaluk(e.target.value)}
                  placeholder="e.g. Mysuru Taluk (Leave empty for district-wide)"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedOfficial(null)}
                  className="flex-1 py-2 px-4 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAssignment}
                  className="flex-1 py-2 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold transition"
                >
                  {savingAssignment ? "Saving..." : "Confirm Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
