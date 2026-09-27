import React, { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  HelpCircle,
  History,
  Send,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-react";
import { ComplaintActionType, ComplaintStatus, IAuditLog, IComplaint } from "@/types/complaint";
import { complaintService } from "@/services/api/complaint.service";

interface ComplaintActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  complaint: IComplaint;
  onActionComplete: (updated: IComplaint) => void;
}

type TabType = "status" | "action" | "audit";

export const ComplaintActionModal: React.FC<ComplaintActionModalProps> = ({
  isOpen,
  onClose,
  complaint,
  onActionComplete,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("status");
  const [targetStatus, setTargetStatus] = useState<string>(
    complaint.status === ComplaintStatus.ASSIGNED
      ? ComplaintStatus.UNDER_REVIEW
      : complaint.status === ComplaintStatus.UNDER_REVIEW
      ? ComplaintStatus.ACTION_IN_PROGRESS
      : ComplaintStatus.RESOLVED
  );
  const [remarks, setRemarks] = useState<string>("");
  const [resolutionSummary, setResolutionSummary] = useState<string>("");
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [informationQuery, setInformationQuery] = useState<string>("");

  // Action log state
  const [actionType, setActionType] = useState<ComplaintActionType>(ComplaintActionType.INSPECTION);
  const [actionRemarks, setActionRemarks] = useState<string>("");
  const [isInternalOnly, setIsInternalOnly] = useState<boolean>(false);

  // Audit trail state
  const [auditLogs, setAuditLogs] = useState<IAuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState<boolean>(false);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const updated = await complaintService.transitionStatus(complaint.id, {
        status: targetStatus,
        remarks: remarks.trim() || undefined,
        resolutionSummary:
          targetStatus === ComplaintStatus.RESOLVED ? resolutionSummary.trim() : undefined,
        rejectionReason:
          targetStatus === ComplaintStatus.REJECTED ? rejectionReason.trim() : undefined,
        informationQuery:
          targetStatus === ComplaintStatus.INFORMATION_REQUIRED
            ? informationQuery.trim()
            : undefined,
      });

      onActionComplete(updated);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update grievance status";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const updated = await complaintService.recordAction(
        complaint.id,
        actionType,
        actionRemarks.trim(),
        isInternalOnly
      );

      onActionComplete(updated);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to log action";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const loadAuditTrail = async () => {
    setAuditLoading(true);
    try {
      const logs = await complaintService.getAuditTrail(complaint.id);
      setAuditLogs(logs as IAuditLog[]);
    } catch {
      // Ignore
    } finally {
      setAuditLoading(false);
    }
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setError(null);
    if (tab === "audit") {
      loadAuditTrail();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-primary-100 text-primary-800 dark:bg-primary-950/80 dark:text-primary-300">
                {complaint.complaintNumber}
              </span>
              <span className="text-xs text-slate-500">• {complaint.department}</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1 line-clamp-1">
              {complaint.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-slate-50/40 dark:bg-slate-850">
          <button
            type="button"
            onClick={() => handleTabChange("status")}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === "status"
                ? "border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            Update Lifecycle Status
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("action")}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === "action"
                ? "border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <FileText className="w-4 h-4" />
            Log Staff Action / Note
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("audit")}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === "audit"
                ? "border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <History className="w-4 h-4" />
            Immutable Audit Trail
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* TAB 1: STATUS TRANSITION */}
          {activeTab === "status" && (
            <form onSubmit={handleStatusSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Target Grievance Status
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { val: ComplaintStatus.UNDER_REVIEW, label: "Under Review", icon: Clock },
                    {
                      val: ComplaintStatus.ACTION_IN_PROGRESS,
                      label: "Action In Progress",
                      icon: Clock,
                    },
                    {
                      val: ComplaintStatus.INFORMATION_REQUIRED,
                      label: "Request Clarification",
                      icon: HelpCircle,
                    },
                    {
                      val: ComplaintStatus.RESOLVED,
                      label: "Mark Resolved",
                      icon: CheckCircle2,
                    },
                    { val: ComplaintStatus.REJECTED, label: "Reject Grievance", icon: XCircle },
                    { val: ComplaintStatus.ESCALATED, label: "Escalate", icon: AlertCircle },
                  ].map((st) => {
                    const Icon = st.icon;
                    const isSelected = targetStatus === st.val;
                    return (
                      <button
                        type="button"
                        key={st.val}
                        onClick={() => setTargetStatus(st.val)}
                        className={`p-2.5 rounded-xl border text-xs font-medium text-left flex items-center gap-2 transition-all ${
                          isSelected
                            ? "border-primary-600 bg-primary-50/50 text-primary-900 dark:border-primary-500 dark:bg-primary-950/50 dark:text-primary-200 ring-2 ring-primary-500/20"
                            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                        }`}
                      >
                        <Icon
                          className={`w-4 h-4 ${
                            isSelected ? "text-primary-600 dark:text-primary-400" : "text-slate-400"
                          }`}
                        />
                        <span>{st.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Conditional Payload Inputs */}
              {targetStatus === ComplaintStatus.RESOLVED && (
                <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                    <ShieldCheck className="w-4 h-4" />
                    Formal Resolution Requirement
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Resolution Summary & Action Taken *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={resolutionSummary}
                      onChange={(e) => setResolutionSummary(e.target.value)}
                      placeholder="Specify the engineering or administrative work performed to resolve this grievance..."
                      className="w-full text-xs p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {targetStatus === ComplaintStatus.REJECTED && (
                <div className="p-4 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 text-xs font-bold">
                    <AlertCircle className="w-4 h-4" />
                    Rejection Justification Requirement
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Formal Reason for Rejection *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Explain why this request is non-feasible, out of jurisdiction, or violates regulations..."
                      className="w-full text-xs p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {targetStatus === ComplaintStatus.INFORMATION_REQUIRED && (
                <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 text-xs font-bold">
                    <HelpCircle className="w-4 h-4" />
                    Clarification Query for Citizen
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Information Required *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={informationQuery}
                      onChange={(e) => setInformationQuery(e.target.value)}
                      placeholder="What specific document, landmark, or meter number is needed to proceed?"
                      className="w-full text-xs p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* General Remarks */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Department Remarks / Timeline Note
                </label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Optional status transition remark..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  {submitting ? "Transitioning..." : "Apply Status Transition"}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: RECORD ACTION */}
          {activeTab === "action" && (
            <form onSubmit={handleActionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Action Classification
                </label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value as ComplaintActionType)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                >
                  <option value={ComplaintActionType.INSPECTION}>Physical Field Inspection</option>
                  <option value={ComplaintActionType.CONTRACTOR_DISPATCHED}>
                    Contractor / Maintenance Crew Dispatched
                  </option>
                  <option value={ComplaintActionType.NOTICE_ISSUED}>
                    Statutory Notice Issued to Violator
                  </option>
                  <option value={ComplaintActionType.CITIZEN_CALL}>
                    Telephonic Verification with Citizen
                  </option>
                  <option value={ComplaintActionType.RESOLUTION_PROGRESS}>
                    Civil Work / Engineering Progress Update
                  </option>
                  <option value={ComplaintActionType.INTERNAL_NOTE}>
                    Internal Department Operational Note
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Action Details & Observations *
                </label>
                <textarea
                  required
                  rows={4}
                  value={actionRemarks}
                  onChange={(e) => setActionRemarks(e.target.value)}
                  placeholder="Record findings, dispatched equipment, spare part orders, or contractor names..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="internalOnly"
                  checked={isInternalOnly}
                  onChange={(e) => setIsInternalOnly(e.target.checked)}
                  className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 border-slate-300 dark:border-slate-700"
                />
                <label
                  htmlFor="internalOnly"
                  className="text-xs text-slate-600 dark:text-slate-400 select-none cursor-pointer"
                >
                  Internal Staff Note Only (Hide from citizen public timeline)
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !actionRemarks.trim()}
                  className="px-5 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  {submitting ? "Logging Action..." : "Record Official Action"}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: AUDIT TRAIL */}
          {activeTab === "audit" && (
            <div className="space-y-3">
              {auditLoading ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  Retrieving immutable audit records...
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  No audit trail recorded yet for this complaint.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Showing {auditLogs.length} verified system events
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    {auditLogs.map((log, idx) => (
                      <div
                        key={log.id || idx}
                        className="p-3.5 bg-white dark:bg-slate-900 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-900 dark:text-white font-mono">
                            {log.action}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-slate-600 dark:text-slate-400 text-[11px]">
                          Actor:{" "}
                          <strong className="text-slate-800 dark:text-slate-200">
                            {log.actor?.name}
                          </strong>{" "}
                          ({log.actor?.role})
                        </div>
                        {log.notes && (
                          <p className="text-slate-500 dark:text-slate-400 italic text-[11px] bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg mt-1">
                            "{log.notes}"
                          </p>
                        )}
                        {(log.previousState || log.newState) && (
                          <div className="text-[10px] text-slate-400 pt-0.5">
                            State:{" "}
                            <span className="font-medium text-slate-600 dark:text-slate-300">
                              {log.previousState || "INIT"}
                            </span>{" "}
                            &rarr;{" "}
                            <span className="font-medium text-emerald-600 dark:text-emerald-400">
                              {log.newState || "SAME"}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
