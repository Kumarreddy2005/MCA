import React, { useState, useEffect } from "react";
import { IDepartment, adminService } from "@/services/api/admin.service";
import {
  Building2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sliders,
  ChevronDown,
  ChevronUp,
  Flame,
  AlertTriangle,
} from "lucide-react";

export const DepartmentSlaTab: React.FC = () => {
  const [departments, setDepartments] = useState<IDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingDept, setEditingDept] = useState<IDepartment | null>(null);
  const [criticalHours, setCriticalHours] = useState(24);
  const [highHours, setHighHours] = useState(48);
  const [mediumHours, setMediumHours] = useState(120);
  const [lowHours, setLowHours] = useState(240);
  const [savingSla, setSavingSla] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const data = await adminService.listDepartments();
      setDepartments(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load departments";
      setMessage({ type: "error", text: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSlaModal = (dept: IDepartment) => {
    setEditingDept(dept);
    setCriticalHours(dept.slaConfig?.criticalHours || 24);
    setHighHours(dept.slaConfig?.highHours || 48);
    setMediumHours(dept.slaConfig?.mediumHours || 120);
    setLowHours(dept.slaConfig?.lowHours || 240);
  };

  const handleSaveSla = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDept) return;
    setSavingSla(true);
    setMessage(null);

    try {
      const updated = await adminService.updateDepartmentSla(editingDept.id, {
        criticalHours,
        highHours,
        mediumHours,
        lowHours,
      });

      setDepartments((prev) => prev.map((d) => (d.id === editingDept.id ? updated : d)));
      setEditingDept(null);
      setMessage({
        type: "success",
        text: `Updated Sakala SLA thresholds for ${updated.name} successfully.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update SLA";
      setMessage({ type: "error", text: msg });
    } finally {
      setSavingSla(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-6">
      {/* Informative Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-700" />
            Karnataka Government Department Hierarchies & SLAs
          </h2>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl">
            Configure statutory resolution deadlines per department and priority level in accordance with the Karnataka Sakala Services Act, 2011.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-800 text-xs font-semibold border border-blue-200 shrink-0">
          <Clock className="w-3.5 h-3.5" />
          {departments.length} Authoritative Departments
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

      {/* Departments Grid */}
      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border">
            Loading departments...
          </div>
        ) : (
          departments.map((dept) => {
            const isExpanded = expandedId === dept.id;
            return (
              <div
                key={dept.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition"
              >
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5 flex-1">
                    <div className="p-3 bg-blue-50 text-blue-700 font-black text-sm rounded-xl shrink-0 border border-blue-100">
                      {dept.code}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900">{dept.name}</h3>
                        {dept.isActive && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{dept.description}</p>
                    </div>
                  </div>

                  {/* SLA Badges */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <div className="px-3 py-1.5 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs font-semibold flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5" />
                      Critical: {dept.slaConfig?.criticalHours || 24}h
                    </div>
                    <div className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      High: {dept.slaConfig?.highHours || 48}h
                    </div>
                    <div className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Medium: {dept.slaConfig?.mediumHours || 120}h
                    </div>

                    <div className="flex items-center gap-2 ml-2">
                      <button
                        onClick={() => handleOpenSlaModal(dept)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 text-xs font-bold transition"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        Configure SLA
                      </button>
                      <button
                        onClick={() => toggleExpand(dept.id)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Categories Accordion */}
                {isExpanded && (
                  <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 text-xs space-y-3">
                    <div className="font-bold text-slate-700 uppercase tracking-wider">
                      Categories & Subcategories ({dept.categories?.length || 0})
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {dept.categories?.map((cat, idx) => (
                        <div key={idx} className="p-3 bg-white rounded-xl border border-slate-200">
                          <div className="font-bold text-slate-900 mb-1.5">{cat.name}</div>
                          <div className="flex flex-wrap gap-1.5">
                            {cat.subcategories.map((sub, sIdx) => (
                              <span
                                key={sIdx}
                                className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px]"
                              >
                                {sub}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Configure SLA Modal */}
      {editingDept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-purple-600" />
                Configure SLA Turnaround
              </h3>
              <button onClick={() => setEditingDept(null)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            <div className="mb-4">
              <div className="font-bold text-slate-900 text-sm">{editingDept.name}</div>
              <div className="text-xs text-slate-500">Department Code: {editingDept.code}</div>
            </div>

            <form onSubmit={handleSaveSla} className="space-y-4">
              {/* Critical Priority SLA */}
              <div className="p-3 rounded-xl bg-red-50/50 border border-red-100">
                <label className="block text-xs font-bold text-red-900 uppercase mb-1">
                  Critical Priority SLA (Hours)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={720}
                    required
                    value={criticalHours}
                    onChange={(e) => setCriticalHours(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-red-200 bg-white text-red-950 font-bold"
                  />
                  <span className="text-xs text-red-700 font-medium whitespace-nowrap">
                    ({Math.round(criticalHours / 24)} days)
                  </span>
                </div>
              </div>

              {/* High Priority SLA */}
              <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-100">
                <label className="block text-xs font-bold text-amber-900 uppercase mb-1">
                  High Priority SLA (Hours)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={720}
                    required
                    value={highHours}
                    onChange={(e) => setHighHours(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-amber-200 bg-white text-amber-950 font-bold"
                  />
                  <span className="text-xs text-amber-700 font-medium whitespace-nowrap">
                    ({Math.round(highHours / 24)} days)
                  </span>
                </div>
              </div>

              {/* Medium Priority SLA */}
              <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100">
                <label className="block text-xs font-bold text-blue-900 uppercase mb-1">
                  Medium Priority SLA (Hours)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={720}
                    required
                    value={mediumHours}
                    onChange={(e) => setMediumHours(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-blue-200 bg-white text-blue-950 font-bold"
                  />
                  <span className="text-xs text-blue-700 font-medium whitespace-nowrap">
                    ({Math.round(mediumHours / 24)} days)
                  </span>
                </div>
              </div>

              {/* Low Priority SLA */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Low Priority SLA (Hours)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={720}
                    required
                    value={lowHours}
                    onChange={(e) => setLowHours(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 font-bold"
                  />
                  <span className="text-xs text-slate-600 font-medium whitespace-nowrap">
                    ({Math.round(lowHours / 24)} days)
                  </span>
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingDept(null)}
                  className="flex-1 py-2 px-4 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSla}
                  className="flex-1 py-2 px-4 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-sm font-semibold transition"
                >
                  {savingSla ? "Saving..." : "Save SLA Thresholds"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
