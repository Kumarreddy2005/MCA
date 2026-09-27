import React, { useState } from "react";
import { complaintService } from "@/services/api/complaint.service";
import { IComplaint, ComplaintStatus, Priority } from "@/types/complaint";
import {
  X,
  MapPin,
  Calendar,
  Building,
  Clock,
  CheckCircle2,
  AlertCircle,
  Paperclip,
  Star,
  RotateCcw,
  User,
  Shield,
  FileText,
} from "lucide-react";

interface GrievanceDetailModalProps {
  complaint: IComplaint | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export const GrievanceDetailModal: React.FC<GrievanceDetailModalProps> = ({
  complaint,
  isOpen,
  onClose,
  onUpdate,
}) => {
  const [rating, setRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  const [showReopen, setShowReopen] = useState(false);
  const [reopenReason, setReopenReason] = useState("");
  const [reopenLoading, setReopenLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !complaint) return null;

  const isResolvedOrClosed =
    complaint.status === ComplaintStatus.RESOLVED ||
    complaint.status === ComplaintStatus.CLOSED;

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackLoading(true);
    setError(null);
    try {
      await complaintService.submitFeedback(complaint.id, rating, feedbackComment);
      setFeedbackSuccess(true);
      onUpdate();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit feedback");
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleReopenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReopenLoading(true);
    setError(null);
    try {
      await complaintService.reopenComplaint(complaint.id, reopenReason);
      setShowReopen(false);
      onUpdate();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to reopen grievance");
    } finally {
      setReopenLoading(false);
    }
  };

  const getStatusBadge = (status: ComplaintStatus) => {
    switch (status) {
      case ComplaintStatus.RESOLVED:
      case ComplaintStatus.CLOSED:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Resolved
          </span>
        );
      case ComplaintStatus.ACTION_IN_PROGRESS:
      case ComplaintStatus.UNDER_REVIEW:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <Clock className="w-4 h-4 text-blue-600" /> In Progress
          </span>
        );
      case ComplaintStatus.REOPENED:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <AlertCircle className="w-4 h-4 text-amber-600" /> Reopened
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
            <Clock className="w-4 h-4 text-slate-600" /> Submitted
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-5 border-b border-slate-100 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-sm font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                {complaint.complaintNumber}
              </span>
              <span
                className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded border ${
                  complaint.priority === Priority.CRITICAL
                    ? "bg-red-50 text-red-700 border-red-200"
                    : complaint.priority === Priority.HIGH
                    ? "bg-amber-50 text-amber-800 border-amber-200"
                    : "bg-slate-100 text-slate-700 border-slate-200"
                }`}
              >
                {complaint.priority} Priority
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
              {complaint.title}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {getStatusBadge(complaint.status)}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-sm text-red-700">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        {/* Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
            <div className="text-slate-500 font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-blue-600" /> Department
            </div>
            <div className="font-bold text-slate-900">{complaint.department}</div>
            <div className="text-[11px] text-slate-500">{complaint.category}</div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
            <div className="text-slate-500 font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-600" /> Location
            </div>
            <div className="font-bold text-slate-900">
              {complaint.location.village}, {complaint.location.district}
            </div>
            <div className="text-[11px] text-slate-500">
              {complaint.location.ward || "Village Ward"}
              {complaint.location.pincode ? ` • ${complaint.location.pincode}` : ""}
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
            <div className="text-slate-500 font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" /> Target Resolution
            </div>
            <div className="font-bold text-slate-900">
              {new Date(complaint.sla.targetResolutionDate).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </div>
            <div className="text-[11px] text-slate-500">SLA Protected Window</div>
          </div>
        </div>

        {/* Detailed Description */}
        <div className="mb-6 p-4 rounded-2xl bg-white border border-slate-200">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            Grievance Description
          </h3>
          <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
            {complaint.description}
          </p>
          {complaint.location.addressLine && (
            <p className="text-xs text-slate-500 mt-2 italic">
              <strong>Landmark:</strong> {complaint.location.addressLine}
            </p>
          )}
        </div>

        {/* Evidence files */}
        {complaint.evidence.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <Paperclip className="w-4 h-4 text-blue-600" /> Attached Evidence ({complaint.evidence.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {complaint.evidence.map((file, idx) => (
                <a
                  key={idx}
                  href={`http://localhost:5001${file.fileUrl}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50/50 hover:border-blue-300 transition flex items-center gap-3 text-xs"
                >
                  <FileText className="w-5 h-5 text-blue-600 shrink-0" />
                  <div className="truncate flex-1">
                    <div className="font-semibold text-slate-900 truncate">{file.fileName}</div>
                    <div className="text-slate-400 text-[10px]">
                      {(file.fileSize / (1024 * 1024)).toFixed(2)} MB • {file.fileType}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="mb-8">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-blue-600" /> Chronological Timeline
          </h3>

          <div className="relative pl-6 border-l-2 border-slate-200 space-y-6">
            {complaint.timeline.map((event, idx) => (
              <div key={idx} className="relative">
                {/* Timeline node */}
                <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-blue-600 ring-4 ring-white border border-blue-600 flex items-center justify-center" />

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-slate-900 uppercase">
                      {event.status}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(event.timestamp).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    {event.message}
                  </p>

                  <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
                    {event.actorRole === "CITIZEN" ? (
                      <User className="w-3 h-3 text-blue-500" />
                    ) : (
                      <Shield className="w-3 h-3 text-emerald-500" />
                    )}
                    <span>{event.actorName || "Officer"}</span>
                    <span className="text-slate-400">({event.actorRole})</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Satisfaction Rating (if resolved) */}
        {isResolvedOrClosed && (
          <div className="p-5 bg-emerald-50/70 rounded-2xl border border-emerald-200 mb-6">
            <h4 className="text-sm font-bold text-emerald-900 mb-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              Grievance Marked Resolved
            </h4>

            {complaint.feedback ? (
              <div className="text-xs text-emerald-800 space-y-1 mt-2">
                <div className="flex items-center gap-1">
                  <strong>Your Rating:</strong>
                  <div className="flex text-amber-500">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${
                          s <= (complaint.feedback?.rating || 0) ? "fill-amber-500" : "text-slate-300"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                {complaint.feedback.comment && (
                  <p className="italic">"{complaint.feedback.comment}"</p>
                )}
              </div>
            ) : feedbackSuccess ? (
              <p className="text-xs text-emerald-800 font-semibold mt-2">
                Thank you! Your feedback has been recorded.
              </p>
            ) : (
              <form onSubmit={handleFeedbackSubmit} className="mt-3 space-y-3">
                <p className="text-xs text-emerald-800">
                  Are you satisfied with the resolution provided by the department?
                </p>

                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        type="button"
                        key={s}
                        onClick={() => setRating(s)}
                        className="text-amber-500 hover:scale-110 transition"
                      >
                        <Star
                          className={`w-5 h-5 ${s <= rating ? "fill-amber-500" : "text-slate-300"}`}
                        />
                      </button>
                    ))}
                  </div>
                  <span className="text-xs font-bold text-emerald-900">{rating}/5 Stars</span>
                </div>

                <input
                  type="text"
                  placeholder="Optional resolution remarks / comment..."
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-emerald-300 bg-white outline-hidden"
                />

                <button
                  type="submit"
                  disabled={feedbackLoading}
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition"
                >
                  {feedbackLoading ? "Submitting..." : "Submit Satisfaction Feedback"}
                </button>
              </form>
            )}

            {/* Reopen Action */}
            {!showReopen && (
              <div className="mt-4 pt-3 border-t border-emerald-200/60 flex items-center justify-between">
                <span className="text-xs text-slate-600">
                  Issue still not resolved on the ground?
                </span>
                <button
                  type="button"
                  onClick={() => setShowReopen(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700 hover:underline"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reopen Grievance
                </button>
              </div>
            )}

            {showReopen && (
              <form onSubmit={handleReopenSubmit} className="mt-4 pt-3 border-t border-red-200 space-y-2">
                <label className="block text-xs font-bold text-red-800">
                  Reason for Reopening:
                </label>
                <textarea
                  required
                  rows={2}
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  placeholder="State why the resolution was unsatisfactory..."
                  className="w-full p-2.5 text-xs rounded-xl border border-red-300 bg-white outline-hidden resize-none"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowReopen(false)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={reopenLoading}
                    className="px-4 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700"
                  >
                    {reopenLoading ? "Reopening..." : "Confirm Reopen"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        <div className="text-right">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
