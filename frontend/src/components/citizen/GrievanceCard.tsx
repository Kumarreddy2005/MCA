import React from "react";
import { IComplaint, ComplaintStatus, Priority } from "@/types/complaint";
import { Clock, MapPin, Paperclip, ChevronRight, AlertCircle, CheckCircle2 } from "lucide-react";

interface GrievanceCardProps {
  complaint: IComplaint;
  onClick: () => void;
}

export const GrievanceCard: React.FC<GrievanceCardProps> = ({ complaint, onClick }) => {
  const getStatusBadge = (status: ComplaintStatus) => {
    switch (status) {
      case ComplaintStatus.RESOLVED:
      case ComplaintStatus.CLOSED:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Resolved
          </span>
        );
      case ComplaintStatus.ACTION_IN_PROGRESS:
      case ComplaintStatus.UNDER_REVIEW:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3 h-3" /> In Progress
          </span>
        );
      case ComplaintStatus.REOPENED:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
            <AlertCircle className="w-3 h-3" /> Reopened
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            <Clock className="w-3 h-3" /> Submitted
          </span>
        );
    }
  };

  const getPriorityBadge = (priority: Priority) => {
    switch (priority) {
      case Priority.CRITICAL:
        return <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">Critical</span>;
      case Priority.HIGH:
        return <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">High</span>;
      default:
        return <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">Standard</span>;
    }
  };

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md hover:border-blue-300 transition cursor-pointer flex flex-col justify-between group"
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
              {complaint.complaintNumber}
            </span>
            {getPriorityBadge(complaint.priority)}
          </div>
          {getStatusBadge(complaint.status)}
        </div>

        <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition line-clamp-1 mb-1.5">
          {complaint.title}
        </h3>

        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-4">
          {complaint.description}
        </p>
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            {complaint.location.village}, {complaint.location.district}
          </span>
          {complaint.evidence.length > 0 && (
            <span className="flex items-center gap-1 text-slate-500">
              <Paperclip className="w-3 h-3" />
              {complaint.evidence.length} file(s)
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-blue-600 font-semibold group-hover:translate-x-0.5 transition">
          <span>Track</span>
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};
