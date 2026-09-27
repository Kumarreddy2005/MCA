import React, { useState, useEffect, useCallback } from "react";
import { IAuditLog, adminService } from "@/services/api/admin.service";
import {
  ShieldCheck,
  Search,
  Calendar,
  Clock,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
} from "lucide-react";

export const SystemAuditLogsTab: React.FC = () => {
  const [logs, setLogs] = useState<IAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [entityType, setEntityType] = useState("ALL");
  const [action, setAction] = useState("ALL");
  const [actorRole, setActorRole] = useState("ALL");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Inspect Modal
  const [selectedLog, setSelectedLog] = useState<IAuditLog | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminService.listAuditLogs({
        entityType: entityType !== "ALL" ? entityType : undefined,
        action: action !== "ALL" ? action : undefined,
        actorRole: actorRole !== "ALL" ? actorRole : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        search: search.trim() || undefined,
        page,
        limit: 25,
      });
      setLogs(res.logs);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err: unknown) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setLoading(false);
    }
  }, [entityType, action, actorRole, startDate, endDate, search, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getActionBadge = (act: string) => {
    if (act.includes("SLA_BREACH") || act.includes("ESCALAT")) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-200">
          {act}
        </span>
      );
    }
    if (act.includes("CREATED") || act.includes("PROVISIONED")) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          {act}
        </span>
      );
    }
    if (act.includes("SLA_CONFIG") || act.includes("JURISDICTION")) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
          {act}
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-800 border border-slate-200">
        {act}
      </span>
    );
  };

  const getEntityBadge = (ent: string) => {
    switch (ent) {
      case "COMPLAINT":
        return <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">Complaint</span>;
      case "USER":
        return <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">User</span>;
      case "DEPARTMENT":
        return <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">Department</span>;
      default:
        return <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">System</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-purple-700" />
            Immutable Cross-System Audit Trail Explorer
          </h2>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl">
            Inspect all administrative events, user state transitions, SLA recalculations, and automated escalations across the VCGIS platform.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-800 text-xs font-semibold border border-purple-200 shrink-0">
          <Clock className="w-3.5 h-3.5" />
          {total} Recorded Events
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Keyword Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search notes, actor name, complaint #..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-600 outline-hidden"
            />
          </div>

          {/* Entity Type Filter */}
          <select
            value={entityType}
            onChange={(e) => {
              setEntityType(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-purple-600 outline-hidden"
          >
            <option value="ALL">All Entity Types</option>
            <option value="COMPLAINT">Complaint</option>
            <option value="USER">User</option>
            <option value="DEPARTMENT">Department</option>
            <option value="SYSTEM">System</option>
          </select>

          {/* Actor Role Filter */}
          <select
            value={actorRole}
            onChange={(e) => {
              setActorRole(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-purple-600 outline-hidden"
          >
            <option value="ALL">All Actor Roles</option>
            <option value="ADMIN">Administrator</option>
            <option value="OFFICIAL">Official</option>
            <option value="VOLUNTEER">Volunteer</option>
            <option value="CITIZEN">Citizen</option>
            <option value="SYSTEM">Automated System</option>
          </select>

          {/* Action Filter */}
          <select
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-purple-600 outline-hidden"
          >
            <option value="ALL">All Actions</option>
            <option value="COMPLAINT_CREATED">COMPLAINT_CREATED</option>
            <option value="STATUS_TRANSITION">STATUS_TRANSITION</option>
            <option value="SLA_BREACH">SLA_BREACH</option>
            <option value="SLA_ESCALATION">SLA_ESCALATION</option>
            <option value="USER_CREATED">USER_CREATED</option>
            <option value="USER_UPDATED">USER_UPDATED</option>
            <option value="USER_STATUS_CHANGED">USER_STATUS_CHANGED</option>
            <option value="SLA_CONFIG_UPDATED">SLA_CONFIG_UPDATED</option>
            <option value="JURISDICTION_ASSIGNED">JURISDICTION_ASSIGNED</option>
          </select>

          <button
            onClick={fetchLogs}
            className="p-2 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl hover:bg-slate-50 transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Date Range Filters */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs text-slate-600">
          <span className="font-semibold flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            Date Range:
          </span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1 text-xs rounded-lg border border-slate-300 bg-white"
            />
            <span>to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1 text-xs rounded-lg border border-slate-300 bg-white"
            />
            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  setPage(1);
                }}
                className="text-xs text-purple-700 hover:underline font-semibold ml-2"
              >
                Reset Dates
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Entity</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">Actor</th>
                <th className="px-6 py-4">Notes & Event Summary</th>
                <th className="px-6 py-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-600" />
                    Querying audit trail records...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No audit records found matching your filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap font-mono">
                      {new Date(log.timestamp).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="px-6 py-4">
                      {getEntityBadge(log.entityType)}
                      {log.complaintNumber && (
                        <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                          {log.complaintNumber}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">{getActionBadge(log.action)}</td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900 text-xs">{log.actor.name}</div>
                      <div className="text-[11px] text-slate-500">{log.actor.role}</div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600 max-w-xs truncate">
                      {log.notes || "-"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-1.5 text-slate-500 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition"
                        title="View Event Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing <span className="font-semibold text-slate-700">{logs.length}</span> of{" "}
            <span className="font-semibold text-slate-700">{total}</span> audit records
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

      {/* Inspect Audit Event Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-700" />
                Audit Trail Event Details
              </h3>
              <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl">
                <div>
                  <span className="text-slate-500 block">Action</span>
                  <span className="font-bold text-slate-900">{selectedLog.action}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Entity Type & ID</span>
                  <span className="font-bold text-slate-900">
                    {selectedLog.entityType} ({selectedLog.entityId})
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Actor</span>
                  <span className="font-bold text-slate-900">
                    {selectedLog.actor.name} ({selectedLog.actor.role})
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Timestamp</span>
                  <span className="font-mono text-slate-700">
                    {new Date(selectedLog.timestamp).toISOString()}
                  </span>
                </div>
              </div>

              {selectedLog.notes && (
                <div className="p-3 bg-purple-50 rounded-xl border border-purple-100">
                  <span className="font-bold text-purple-900 block mb-1">Notes:</span>
                  <p className="text-purple-950">{selectedLog.notes}</p>
                </div>
              )}

              {selectedLog.previousState && (
                <div className="p-3 bg-slate-50 rounded-xl border">
                  <span className="font-bold text-slate-600 block mb-1">Previous State:</span>
                  <pre className="text-[11px] font-mono whitespace-pre-wrap text-slate-800">
                    {selectedLog.previousState}
                  </pre>
                </div>
              )}

              {selectedLog.newState && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                  <span className="font-bold text-emerald-800 block mb-1">New State:</span>
                  <pre className="text-[11px] font-mono whitespace-pre-wrap text-emerald-950">
                    {selectedLog.newState}
                  </pre>
                </div>
              )}

              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div>
                  <span className="font-bold text-slate-700 block mb-1">Event Metadata:</span>
                  <pre className="p-3 bg-slate-900 text-purple-300 rounded-xl text-[11px] font-mono overflow-x-auto max-h-48">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 text-right">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
