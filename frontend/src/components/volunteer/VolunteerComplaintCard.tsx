import React from "react";
import { IComplaint, ComplaintStatus, Priority } from "@/types/complaint";
import {
  MapPin,
  Paperclip,
  ChevronRight,
  ClipboardCheck,
  ShieldAlert,
  ShieldCheck,
  User,
  Clock,
} from "lucide-react";

interface VolunteerComplaintCardProps {
  complaint: IComplaint;
  onViewDetails: () => void;
  onVerify: () => void;
}

export const VolunteerComplaintCard: React.FC<VolunteerComplaintCardProps> = ({
  complaint,
  onViewDetails,
  onVerify,
}) => {
  const isVerified =
    complaint.status === ComplaintStatus.VERIFIED || complaint.verification?.result === "VERIFIED";

  const isPendingVerification =
    complaint.status === ComplaintStatus.SUBMITTED ||
    complaint.status === ComplaintStatus.VERIFICATION_REQUIRED;

  const getPriorityBadge = (priority: Priority) => {
    switch (priority) {
      case Priority.CRITICAL:
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200">
            Critical
          </span>
        );
      case Priority.HIGH:
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
            High
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">
            Standard
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md hover:border-amber-300 transition flex flex-col justify-between group">
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
              {complaint.complaintNumber}
            </span>
            {getPriorityBadge(complaint.priority)}
            {complaint.source === "VOLUNTEER_ASSISTED" && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                Volunteer-Assisted
              </span>
            )}
          </div>

          {/* Verification Status */}
          {isVerified ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Verified On-Site
            </span>
          ) : isPendingVerification ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              <ShieldAlert className="w-3.5 h-3.5 text-blue-600" /> Pending Visit
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              <Clock className="w-3 h-3" /> {complaint.status}
            </span>
          )}
        </div>

        {/* Title & Description */}
        <h3
          onClick={onViewDetails}
          className="text-base font-bold text-slate-900 group-hover:text-amber-700 transition line-clamp-1 mb-1.5 cursor-pointer"
        >
          {complaint.title}
        </h3>

        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-3">
          {complaint.description}
        </p>

        {/* Citizen & Location metadata */}
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 mb-3">
          <div className="flex items-center gap-1.5 font-medium">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {complaint.citizenName} ({complaint.citizenPhone})
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-500">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {complaint.location.village} {complaint.location.ward ? `• ${complaint.location.ward}` : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3 text-slate-500">
          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
            {complaint.category}
          </span>
          {complaint.evidence && complaint.evidence.length > 0 && (
            <span className="flex items-center gap-1">
              <Paperclip className="w-3 h-3" />
              {complaint.evidence.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isPendingVerification && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onVerify();
              }}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-xs transition border border-blue-200"
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              <span>Verify</span>
            </button>
          )}
          <button
            onClick={onViewDetails}
            className="inline-flex items-center gap-1 text-slate-700 hover:text-amber-700 font-semibold transition px-2 py-1 rounded-lg hover:bg-slate-50"
          >
            <span>Details</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
