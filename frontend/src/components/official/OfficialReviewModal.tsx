import React, { useState, useEffect } from "react";
import {
  AlertCircle,
  ArrowRightLeft,
  Building2,
  CheckCircle2,
  ExternalLink,
  Eye,
  FileCheck2,
  History,
  Image as ImageIcon,
  MapPin,
  Send,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Loader2,
  Upload,
  User,
  X,
  XCircle,
} from "lucide-react";
import {
  ComplaintActionType,
  ComplaintStatus,
  GovernmentDepartments,
  IAuditLog,
  IComplaint,
} from "@/types/complaint";
import { officialService } from "@/services/api/official.service";
import { complaintService } from "@/services/api/complaint.service";
import { genAiService } from "@/services/api/genai.service";
import { AiInsightsBadge } from "../ai/AiInsightsBadge";

interface OfficialReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  complaint: IComplaint;
  officialDepartment: string;
  onActionComplete: (updated: IComplaint) => void;
}

type OfficialTab = "review" | "resolve" | "reject" | "transfer" | "escalate" | "action" | "audit";

export const OfficialReviewModal: React.FC<OfficialReviewModalProps> = ({
  isOpen,
  onClose,
  complaint,
  officialDepartment,
  onActionComplete,
}) => {
  const [activeTab, setActiveTab] = useState<OfficialTab>("review");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  // Resolve form state
  const [resolutionSummary, setResolutionSummary] = useState<string>("");
  const [actionTaken, setActionTaken] = useState<string>("");
  const [contractorName, setContractorName] = useState<string>("");
  const [materialsUsed, setMaterialsUsed] = useState<string>("");
  const [resolvePhotos, setResolvePhotos] = useState<File[]>([]);

  // Reject form state
  const [rejectionReason, setRejectionReason] = useState<string>("");

  // Transfer form state
  const [targetDepartment, setTargetDepartment] = useState<string>("");
  const [transferReason, setTransferReason] = useState<string>("");

  // Escalate form state
  const [escalateReason, setEscalateReason] = useState<string>("");

  // Intermediate Action Note state
  const [actionType, setActionType] = useState<ComplaintActionType>(ComplaintActionType.INSPECTION);
  const [actionRemarks, setActionRemarks] = useState<string>("");

  // GenAI Drafting state
  const [isAiDrafting, setIsAiDrafting] = useState<boolean>(false);

  // Audit state
  const [auditLogs, setAuditLogs] = useState<IAuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState<boolean>(false);

  // Load audit trail when switching to audit tab
  useEffect(() => {
    if (activeTab === "audit" && isOpen) {
      setAuditLoading(true);
      complaintService
        .getAuditTrail(complaint.id)
        .then((logs) => setAuditLogs(logs))
        .catch(() => setAuditLogs([]))
        .finally(() => setAuditLoading(false));
    }
  }, [activeTab, complaint.id, isOpen]);

  if (!isOpen) return null;

  // SLA Calculation
  const calculateSlaStatus = () => {
    const targetDate = new Date(complaint.sla.targetResolutionDate).getTime();
    const now = Date.now();
    const diffHours = Math.round((targetDate - now) / (1000 * 60 * 60));

    if (complaint.status === ComplaintStatus.RESOLVED || complaint.status === ComplaintStatus.CLOSED) {
      return {
        badge: "bg-emerald-100 text-emerald-800 border-emerald-300",
        label: "RESOLVED WITHIN SLA",
        details: "Target met successfully",
      };
    }

    if (complaint.sla.isBreached || diffHours < 0) {
      return {
        badge: "bg-red-600 text-white animate-pulse border-red-700",
        label: "SLA BREACHED",
        details: `Overdue by ${Math.abs(diffHours)} hours`,
      };
    }

    if (diffHours <= 24) {
      return {
        badge: "bg-rose-100 text-rose-800 border-rose-300 font-bold",
        label: "SLA CRITICAL (< 24h)",
        details: `${diffHours} hours remaining`,
      };
    }

    if (diffHours <= 48) {
      return {
        badge: "bg-amber-100 text-amber-800 border-amber-300",
        label: "SLA WARNING (24-48h)",
        details: `${diffHours} hours remaining`,
      };
    }

    return {
      badge: "bg-emerald-100 text-emerald-800 border-emerald-300",
      label: "SLA HEALTHY",
      details: `${Math.round(diffHours / 24)} days remaining (${diffHours}h)`,
    };
  };

  const slaInfo = calculateSlaStatus();

  // Reset errors and fields on tab change
  const handleTabChange = (tab: OfficialTab) => {
    setError(null);
    setActiveTab(tab);
  };

  const handleAiDraft = async (type: "resolution_letter" | "inspection_checklist" | "rejection_endorsement") => {
    setIsAiDrafting(true);
    setError(null);
    try {
      const actionType =
        type === "resolution_letter"
          ? "RESOLUTION"
          : type === "inspection_checklist"
          ? "INSPECTION"
          : "REJECTION";

      const res = await genAiService.draftOfficialResponse({
        complaintNumber: complaint.complaintNumber || complaint.id,
        title: complaint.title,
        category: complaint.category,
        department: complaint.department,
        actionType,
        actionNotes: complaint.description,
        citizenName: complaint.citizenName,
      });

      if (type === "resolution_letter") {
        setResolutionSummary(res.formal_letter);
        if (res.inspection_checklist && res.inspection_checklist.length > 0 && !actionTaken) {
          setActionTaken(`Verified on-site: ${res.inspection_checklist.slice(0, 2).join("; ")}`);
        }
      } else if (type === "inspection_checklist") {
        const checklistText = res.inspection_checklist.map((c: string, i: number) => `${i + 1}. ${c}`).join("\n");
        setActionRemarks((prev) =>
          prev
            ? `${prev}\n\n[AI Field Inspection Checklist]\n${checklistText}`
            : `[AI Field Inspection Checklist]\n${checklistText}`
        );
      } else if (type === "rejection_endorsement") {
        setRejectionReason(res.formal_letter);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "AI drafting failed";
      setError(msg);
    } finally {
      setIsAiDrafting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files).slice(0, 5);
      setResolvePhotos(filesArray);
    }
  };

  // Handlers
  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolutionSummary.trim()) {
      setError("Please provide a summary of the resolution work done.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const updated = await officialService.resolveComplaint(complaint.id, {
        resolutionSummary: resolutionSummary.trim(),
        actionTaken: actionTaken.trim() || undefined,
        contractorName: contractorName.trim() || undefined,
        materialsUsed: materialsUsed.trim() || undefined,
        photos: resolvePhotos,
      });
      onActionComplete(updated);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to resolve complaint";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      setError("A formal administrative justification is mandatory for rejection.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const updated = await officialService.rejectComplaint(complaint.id, {
        reason: rejectionReason.trim(),
      });
      onActionComplete(updated);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reject complaint";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetDepartment) {
      setError("Please select the target department for transfer.");
      return;
    }
    if (!transferReason.trim()) {
      setError("Please state the reason for transferring this grievance.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const updated = await officialService.transferDepartment(complaint.id, {
        targetDepartment,
        reason: transferReason.trim(),
      });
      onActionComplete(updated);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to transfer complaint";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEscalate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!escalateReason.trim()) {
      setError("Please explain why this grievance requires escalation to higher authority.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const updated = await officialService.escalateComplaint(complaint.id, {
        reason: escalateReason.trim(),
      });
      onActionComplete(updated);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to escalate complaint";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddActionNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionRemarks.trim()) {
      setError("Action remarks cannot be empty.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const updated = await complaintService.recordAction(
        complaint.id,
        actionType,
        actionRemarks.trim(),
        false
      );
      onActionComplete(updated);
      setActionRemarks("");
      setActiveTab("review");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to log action note";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center font-bold text-white shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-emerald-400">
                  {complaint.complaintNumber}
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-300 font-medium">
                  {complaint.department}
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-white line-clamp-1">
                {complaint.title}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SLA and Jurisdiction Notification Bar */}
        <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600">SLA Status:</span>
            <span className={`px-2.5 py-0.5 rounded-full font-bold border ${slaInfo.badge}`}>
              {slaInfo.label}
            </span>
            <span className="text-slate-500">({slaInfo.details})</span>
          </div>

          <div className="flex items-center gap-2 text-slate-600">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {complaint.location.village}, Taluk: {complaint.location.mandal || "Mysuru"},{" "}
              {complaint.location.district}
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 px-6 bg-white overflow-x-auto gap-2">
          <button
            onClick={() => handleTabChange("review")}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition shrink-0 flex items-center gap-1.5 ${
              activeTab === "review"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Eye className="w-4 h-4" />
            Review & Evidence
          </button>

          <button
            onClick={() => handleTabChange("resolve")}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition shrink-0 flex items-center gap-1.5 ${
              activeTab === "resolve"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Resolve with Proof
          </button>

          <button
            onClick={() => handleTabChange("action")}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition shrink-0 flex items-center gap-1.5 ${
              activeTab === "action"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4 text-blue-600" />
            Action / Inspection Note
          </button>

          <button
            onClick={() => handleTabChange("transfer")}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition shrink-0 flex items-center gap-1.5 ${
              activeTab === "transfer"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <ArrowRightLeft className="w-4 h-4 text-amber-600" />
            Transfer Dept
          </button>

          <button
            onClick={() => handleTabChange("escalate")}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition shrink-0 flex items-center gap-1.5 ${
              activeTab === "escalate"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-orange-600" />
            Escalate
          </button>

          <button
            onClick={() => handleTabChange("reject")}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition shrink-0 flex items-center gap-1.5 ${
              activeTab === "reject"
                ? "border-rose-600 text-rose-700"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <XCircle className="w-4 h-4 text-rose-600" />
            Reject
          </button>

          <button
            onClick={() => handleTabChange("audit")}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition shrink-0 flex items-center gap-1.5 ${
              activeTab === "audit"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <History className="w-4 h-4 text-slate-500" />
            Audit Trail
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: REVIEW & EVIDENCE */}
          {activeTab === "review" && (
            <div className="space-y-6">
              {/* AI Intelligence Insights (Phase 7) */}
              <AiInsightsBadge analysis={complaint.aiAnalysis} />

              {/* Grievance Description & Meta */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Citizen Grievance Description
                </h3>
                <p className="text-sm text-slate-800 whitespace-pre-line leading-relaxed">
                  {complaint.description}
                </p>
                <div className="mt-4 pt-3 border-t border-slate-200 flex flex-wrap items-center gap-4 text-xs text-slate-600">
                  <span className="flex items-center gap-1 font-medium">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    Citizen: {complaint.citizenName} (+91 {complaint.citizenPhone})
                  </span>
                  <span>•</span>
                  <span>Category: <strong>{complaint.category}</strong></span>
                  <span>•</span>
                  <span>Priority: <strong>{complaint.priority}</strong></span>
                  <span>•</span>
                  <span>Source: <strong>{complaint.source}</strong></span>
                </div>
              </div>

              {/* Volunteer Field Verification Card (if available) */}
              {complaint.verification && (
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs uppercase tracking-wider">
                      <FileCheck2 className="w-4 h-4 text-emerald-700" />
                      Village Volunteer Field Verification Report
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-200 text-emerald-900">
                      {complaint.verification.result}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-950 font-medium leading-relaxed">
                    "{complaint.verification.notes}"
                  </p>
                  <div className="mt-3 pt-2 border-t border-emerald-200/60 flex flex-wrap items-center gap-4 text-[11px] text-emerald-800">
                    <span>Verified By: <strong>{complaint.verification.verifiedByName}</strong></span>
                    <span>•</span>
                    <span>Date: {new Date(complaint.verification.verifiedAt).toLocaleString()}</span>
                  </div>

                  {complaint.verification.photos && complaint.verification.photos.length > 0 && (
                    <div className="mt-3">
                      <div className="text-[11px] font-semibold text-emerald-900 mb-1.5">
                        Volunteer On-Site Evidence Photos ({complaint.verification.photos.length}):
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {complaint.verification.photos.map((ph, idx) => (
                          <div
                            key={idx}
                            onClick={() => setPreviewPhotoUrl(ph.fileUrl)}
                            className="relative group rounded-lg overflow-hidden border border-emerald-300 aspect-video bg-black/10 cursor-pointer"
                          >
                            <img
                              src={ph.fileUrl}
                              alt={ph.fileName || "Volunteer photo"}
                              className="w-full h-full object-cover group-hover:scale-105 transition"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                              <ExternalLink className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Citizen Evidence Files */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-slate-400" />
                  Original Citizen Evidence ({complaint.evidence.length})
                </h3>
                {complaint.evidence.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No photographic evidence attached with initial filing.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {complaint.evidence.map((ev, idx) => (
                      <div
                        key={idx}
                        onClick={() => setPreviewPhotoUrl(ev.fileUrl)}
                        className="relative group rounded-xl overflow-hidden border border-slate-200 aspect-video bg-slate-100 cursor-pointer shadow-xs"
                      >
                        <img
                          src={ev.fileUrl}
                          alt={ev.fileName}
                          className="w-full h-full object-cover group-hover:scale-105 transition"
                        />
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                          <Eye className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Existing Resolution Proof (if resolved) */}
              {complaint.resolution && (
                <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs uppercase tracking-wider mb-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    Official Resolution Certificate
                  </div>
                  <p className="text-xs text-slate-800 font-medium">
                    {complaint.resolution.resolutionSummary}
                  </p>
                  <div className="mt-2 text-[11px] text-emerald-800">
                    Resolved by {complaint.resolution.resolvedByName} on{" "}
                    {new Date(complaint.resolution.resolvedAt).toLocaleString()}
                  </div>
                  {complaint.resolution.resolutionPhotos && complaint.resolution.resolutionPhotos.length > 0 && (
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {complaint.resolution.resolutionPhotos.map((ph, idx) => (
                        <div
                          key={idx}
                          onClick={() => setPreviewPhotoUrl(ph.fileUrl)}
                          className="rounded-lg overflow-hidden border border-emerald-300 aspect-video cursor-pointer"
                        >
                          <img src={ph.fileUrl} alt="Resolution proof" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: RESOLVE WITH PROOF */}
          {activeTab === "resolve" && (
            <form onSubmit={handleResolve} className="space-y-4">
              <div className="bg-emerald-50/80 border border-emerald-200 p-3.5 rounded-xl text-xs text-emerald-900">
                <strong>Proof of Resolution Requirement:</strong> Official guidelines require documenting
                the exact work completed and uploading photographic evidence for citizen verification.
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Resolution Summary <span className="text-rose-600">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleAiDraft("resolution_letter")}
                    disabled={isAiDrafting}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition"
                  >
                    {isAiDrafting ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                    )}
                    AI Draft Resolution Letter (Sakala)
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={resolutionSummary}
                  onChange={(e) => setResolutionSummary(e.target.value)}
                  placeholder="Describe the solution applied (e.g. Borewell motor replaced, pipeline leak repaired, waste cleared)..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Specific Action Taken (Optional)
                </label>
                <input
                  type="text"
                  value={actionTaken}
                  onChange={(e) => setActionTaken(e.target.value)}
                  placeholder="e.g. Replaced faulty 5HP submersible pump and restored main pipeline"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Contractor / Agency Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={contractorName}
                    onChange={(e) => setContractorName(e.target.value)}
                    placeholder="e.g., Mysore Power Infrastructure Ltd."
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Materials / Equipment Used (Optional)
                  </label>
                  <input
                    type="text"
                    value={materialsUsed}
                    onChange={(e) => setMaterialsUsed(e.target.value)}
                    placeholder="e.g., 20m 4-inch PVC pipe, 5HP Submersible pump"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Upload Photo Proof of Work Done (Up to 5 images)
                </label>
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center bg-slate-50 hover:bg-slate-100 transition">
                  <input
                    type="file"
                    id="resolve-photos-input"
                    multiple
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="resolve-photos-input"
                    className="cursor-pointer flex flex-col items-center justify-center gap-1.5"
                  >
                    <Upload className="w-6 h-6 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-700">
                      Click to browse or drag & drop resolution photos
                    </span>
                    <span className="text-[11px] text-slate-500">
                      PNG, JPG up to 5MB each (Max 5 files)
                    </span>
                  </label>
                </div>
                {resolvePhotos.length > 0 && (
                  <div className="mt-2 text-xs text-emerald-800 font-medium">
                    Selected {resolvePhotos.length} photo(s):{" "}
                    {resolvePhotos.map((f) => f.name).join(", ")}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab("review")}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {submitting ? "Submitting Resolution..." : "Confirm & Resolve Grievance"}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: ACTION / INSPECTION NOTE */}
          {activeTab === "action" && (
            <form onSubmit={handleAddActionNote} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Action Type
                </label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value as ComplaintActionType)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  <option value={ComplaintActionType.INSPECTION}>Field Site Inspection</option>
                  <option value={ComplaintActionType.CONTRACTOR_DISPATCHED}>Contractor Dispatched</option>
                  <option value={ComplaintActionType.NOTICE_ISSUED}>Formal Notice Issued</option>
                  <option value={ComplaintActionType.CITIZEN_CALL}>Citizen Consultation / Call</option>
                  <option value={ComplaintActionType.RESOLUTION_PROGRESS}>Work In Progress Update</option>
                  <option value={ComplaintActionType.INTERNAL_NOTE}>Internal Administrative Note</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Inspection / Action Remarks <span className="text-rose-600">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleAiDraft("inspection_checklist")}
                    disabled={isAiDrafting}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition"
                  >
                    {isAiDrafting ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3 text-blue-600" />
                    )}
                    AI Inspection Checklist
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={actionRemarks}
                  onChange={(e) => setActionRemarks(e.target.value)}
                  placeholder="Record intermediate notes, dispatch details, findings, or expected completion date..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab("review")}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-sm"
                >
                  <Send className="w-4 h-4" />
                  {submitting ? "Logging Note..." : "Save Action Note"}
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: TRANSFER DEPARTMENT */}
          {activeTab === "transfer" && (
            <form onSubmit={handleTransfer} className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl text-xs text-amber-900">
                <strong>Departmental Reassignment:</strong> If this grievance falls under another
                jurisdiction, select the correct department. The VCGIS routing engine will re-assign
                the grievance and notify the designated department executive.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Target Government Department <span className="text-rose-600">*</span>
                </label>
                <select
                  value={targetDepartment}
                  onChange={(e) => setTargetDepartment(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  required
                >
                  <option value="">-- Select Target Department --</option>
                  {GovernmentDepartments.filter((d) => d !== officialDepartment).map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason for Transfer <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={3}
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  placeholder="Explain why this matter pertains to the selected target department..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab("review")}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition shadow-sm"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  {submitting ? "Transferring..." : "Reassign Department"}
                </button>
              </div>
            </form>
          )}

          {/* TAB 5: ESCALATE */}
          {activeTab === "escalate" && (
            <form onSubmit={handleEscalate} className="space-y-4">
              <div className="bg-orange-50 border border-orange-200 p-3.5 rounded-xl text-xs text-orange-900">
                <strong>High-Level Administrative Escalation:</strong> Escalating triggers priority
                alerts to the District Collector and Department Head for immediate intervention or
                budgetary approvals.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Escalation Justification <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={4}
                  value={escalateReason}
                  onChange={(e) => setEscalateReason(e.target.value)}
                  placeholder="Specify blockers (e.g., Major budget allocation required, inter-departmental dispute, public safety emergency)..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab("review")}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs transition shadow-sm"
                >
                  <ShieldAlert className="w-4 h-4" />
                  {submitting ? "Escalating..." : "Escalate to District Collector"}
                </button>
              </div>
            </form>
          )}

          {/* TAB 6: REJECT */}
          {activeTab === "reject" && (
            <form onSubmit={handleReject} className="space-y-4">
              <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-xl text-xs text-rose-900">
                <strong>Formal Rejection Protocol:</strong> Rejection requires full legal and administrative
                justification. The reason is permanently audited and dispatched to the citizen and volunteer.
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Administrative Rejection Reason <span className="text-rose-600">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleAiDraft("rejection_endorsement")}
                    disabled={isAiDrafting}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition"
                  >
                    {isAiDrafting ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3 text-rose-600" />
                    )}
                    AI Statutory Rejection Endorsement
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Provide precise reason (e.g. Duplicate of grievance #KRN-xxx, private property dispute beyond government purview)..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  required
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab("review")}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition shadow-sm"
                >
                  <XCircle className="w-4 h-4" />
                  {submitting ? "Rejecting..." : "Confirm Formal Rejection"}
                </button>
              </div>
            </form>
          )}

          {/* TAB 7: AUDIT TRAIL */}
          {activeTab === "audit" && (
            <div>
              {auditLoading ? (
                <div className="py-8 text-center text-xs text-slate-500">Loading tamper-proof audit logs...</div>
              ) : auditLogs.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">No audit events recorded yet.</div>
              ) : (
                <div className="space-y-3">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-start justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                            {log.action}
                          </span>
                          <span className="text-slate-500">by</span>
                          <span className="font-semibold text-slate-800">
                            {log.actor.name} ({log.actor.role})
                          </span>
                        </div>
                        {log.notes && <p className="text-slate-600 italic">"{log.notes}"</p>}
                        {log.previousState && log.newState && (
                          <div className="text-[11px] text-slate-500">
                            State transition:{" "}
                            <strong className="text-slate-700">{log.previousState}</strong> &rarr;{" "}
                            <strong className="text-slate-700">{log.newState}</strong>
                          </div>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 shrink-0">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Full Image Preview Lightbox */}
        {previewPhotoUrl && (
          <div
            onClick={() => setPreviewPhotoUrl(null)}
            className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4 cursor-pointer"
          >
            <div className="max-w-3xl max-h-[85vh] relative">
              <img
                src={previewPhotoUrl}
                alt="Evidence Full View"
                className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
              />
              <button
                onClick={() => setPreviewPhotoUrl(null)}
                className="absolute top-3 right-3 bg-black/60 text-white p-2 rounded-full hover:bg-black/90 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
