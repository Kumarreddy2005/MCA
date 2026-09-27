import mongoose from "mongoose";
import { Complaint, IComplaintDocument, IEvidenceSubdocument } from "../models/complaint.model.js";
import { ComplaintStatus, SlaStatus, UserRole } from "../types/domain.js";
import { logAuditEvent } from "./audit.service.js";
import { sendNotification } from "./notification.service.js";
import { logger } from "../utils/logger.js";

// Allowed transitions from each status
export const ALLOWED_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  [ComplaintStatus.DRAFT]: [ComplaintStatus.SUBMITTED, ComplaintStatus.CANCELLED],
  [ComplaintStatus.SUBMITTED]: [
    ComplaintStatus.VALIDATING,
    ComplaintStatus.VERIFICATION_REQUIRED,
    ComplaintStatus.VERIFIED,
    ComplaintStatus.ROUTING,
    ComplaintStatus.ASSIGNED,
    ComplaintStatus.UNDER_REVIEW,
    ComplaintStatus.REJECTED,
    ComplaintStatus.DUPLICATE,
    ComplaintStatus.CANCELLED,
  ],
  [ComplaintStatus.VALIDATING]: [
    ComplaintStatus.VERIFICATION_REQUIRED,
    ComplaintStatus.VERIFIED,
    ComplaintStatus.ROUTING,
    ComplaintStatus.ASSIGNED,
    ComplaintStatus.REJECTED,
    ComplaintStatus.DUPLICATE,
  ],
  [ComplaintStatus.VERIFICATION_REQUIRED]: [
    ComplaintStatus.VERIFIED,
    ComplaintStatus.REJECTED,
    ComplaintStatus.DUPLICATE,
    ComplaintStatus.CANCELLED,
  ],
  [ComplaintStatus.VERIFIED]: [
    ComplaintStatus.ROUTING,
    ComplaintStatus.ASSIGNED,
    ComplaintStatus.UNDER_REVIEW,
    ComplaintStatus.REJECTED,
    ComplaintStatus.DUPLICATE,
  ],
  [ComplaintStatus.AI_ANALYSIS]: [
    ComplaintStatus.ROUTING,
    ComplaintStatus.ASSIGNED,
    ComplaintStatus.UNDER_REVIEW,
  ],
  [ComplaintStatus.ROUTING]: [
    ComplaintStatus.ASSIGNED,
    ComplaintStatus.UNDER_REVIEW,
    ComplaintStatus.REJECTED,
  ],
  [ComplaintStatus.ASSIGNED]: [
    ComplaintStatus.UNDER_REVIEW,
    ComplaintStatus.ACTION_IN_PROGRESS,
    ComplaintStatus.ESCALATED,
    ComplaintStatus.ON_HOLD,
    ComplaintStatus.REJECTED,
    ComplaintStatus.DUPLICATE,
  ],
  [ComplaintStatus.UNDER_REVIEW]: [
    ComplaintStatus.ACTION_IN_PROGRESS,
    ComplaintStatus.INFORMATION_REQUIRED,
    ComplaintStatus.RESOLVED,
    ComplaintStatus.REJECTED,
    ComplaintStatus.DUPLICATE,
    ComplaintStatus.ESCALATED,
    ComplaintStatus.ON_HOLD,
  ],
  [ComplaintStatus.ACTION_IN_PROGRESS]: [
    ComplaintStatus.INFORMATION_REQUIRED,
    ComplaintStatus.RESOLVED,
    ComplaintStatus.ON_HOLD,
    ComplaintStatus.ESCALATED,
    ComplaintStatus.REJECTED,
  ],
  [ComplaintStatus.INFORMATION_REQUIRED]: [
    ComplaintStatus.UNDER_REVIEW,
    ComplaintStatus.ACTION_IN_PROGRESS,
    ComplaintStatus.REJECTED,
    ComplaintStatus.CANCELLED,
  ],
  [ComplaintStatus.ON_HOLD]: [
    ComplaintStatus.UNDER_REVIEW,
    ComplaintStatus.ACTION_IN_PROGRESS,
    ComplaintStatus.RESOLVED,
    ComplaintStatus.ESCALATED,
    ComplaintStatus.REJECTED,
  ],
  [ComplaintStatus.ESCALATED]: [
    ComplaintStatus.UNDER_REVIEW,
    ComplaintStatus.ACTION_IN_PROGRESS,
    ComplaintStatus.RESOLVED,
    ComplaintStatus.ON_HOLD,
    ComplaintStatus.REJECTED,
  ],
  [ComplaintStatus.RESOLVED]: [
    ComplaintStatus.CLOSED,
    ComplaintStatus.REOPENED,
  ],
  [ComplaintStatus.CLOSED]: [
    ComplaintStatus.REOPENED,
  ],
  [ComplaintStatus.REOPENED]: [
    ComplaintStatus.UNDER_REVIEW,
    ComplaintStatus.ASSIGNED,
    ComplaintStatus.ACTION_IN_PROGRESS,
    ComplaintStatus.ESCALATED,
  ],
  [ComplaintStatus.REJECTED]: [
    ComplaintStatus.REOPENED,
  ],
  [ComplaintStatus.DUPLICATE]: [
    ComplaintStatus.REOPENED,
  ],
  [ComplaintStatus.CANCELLED]: [],
};

// Roles authorized to execute specific target transitions
export const ROLE_TRANSITION_PERMISSIONS: Partial<Record<ComplaintStatus, UserRole[]>> = {
  [ComplaintStatus.CANCELLED]: [UserRole.CITIZEN, UserRole.ADMIN],
  [ComplaintStatus.VERIFIED]: [UserRole.VOLUNTEER, UserRole.OFFICIAL, UserRole.ADMIN],
  [ComplaintStatus.ROUTING]: [UserRole.ADMIN, UserRole.OFFICIAL],
  [ComplaintStatus.ASSIGNED]: [UserRole.ADMIN, UserRole.OFFICIAL],
  [ComplaintStatus.UNDER_REVIEW]: [UserRole.OFFICIAL, UserRole.DEPARTMENT_STAFF, UserRole.ADMIN, UserRole.CITIZEN], // Citizen can return from INFORMATION_REQUIRED
  [ComplaintStatus.ACTION_IN_PROGRESS]: [UserRole.OFFICIAL, UserRole.DEPARTMENT_STAFF, UserRole.ADMIN],
  [ComplaintStatus.INFORMATION_REQUIRED]: [UserRole.OFFICIAL, UserRole.DEPARTMENT_STAFF, UserRole.ADMIN],
  [ComplaintStatus.RESOLVED]: [UserRole.OFFICIAL, UserRole.ADMIN],
  [ComplaintStatus.REJECTED]: [UserRole.OFFICIAL, UserRole.ADMIN],
  [ComplaintStatus.DUPLICATE]: [UserRole.OFFICIAL, UserRole.ADMIN],
  [ComplaintStatus.ESCALATED]: [UserRole.OFFICIAL, UserRole.ADMIN],
  [ComplaintStatus.ON_HOLD]: [UserRole.OFFICIAL, UserRole.DEPARTMENT_STAFF, UserRole.ADMIN],
  [ComplaintStatus.CLOSED]: [UserRole.ADMIN, UserRole.OFFICIAL],
  [ComplaintStatus.REOPENED]: [UserRole.CITIZEN, UserRole.ADMIN],
};

export interface StatusTransitionPayload {
  newStatus: ComplaintStatus;
  remarks?: string;
  resolutionSummary?: string;
  resolutionPhotos?: IEvidenceSubdocument[];
  rejectionReason?: string;
  informationQuery?: string;
  informationResponse?: string;
  duplicateOfComplaintNumber?: string;
  actor: {
    id: string;
    name: string;
    role: UserRole;
    phone?: string;
    email?: string;
    ipAddress?: string;
  };
}

export class LifecycleError extends Error {
  constructor(
    public code: "INVALID_TRANSITION" | "UNAUTHORIZED_ROLE" | "MISSING_REQUIRED_PAYLOAD" | "NOT_FOUND",
    message: string
  ) {
    super(message);
    this.name = "LifecycleError";
  }
}

/**
 * Transitions a complaint through the state machine with validation, audit logging, and notifications
 */
export async function transitionComplaintStatus(
  complaintId: string,
  payload: StatusTransitionPayload
): Promise<IComplaintDocument> {
  const complaint = await Complaint.findById(complaintId);
  if (!complaint) {
    throw new LifecycleError("NOT_FOUND", `Complaint with ID '${complaintId}' was not found`);
  }

  const currentStatus = complaint.status;
  const targetStatus = payload.newStatus;

  // 1. Check if the transition is allowed in the state graph
  const allowedNext = ALLOWED_TRANSITIONS[currentStatus] || [];
  if (!allowedNext.includes(targetStatus)) {
    throw new LifecycleError(
      "INVALID_TRANSITION",
      `Cannot transition complaint from '${currentStatus}' to '${targetStatus}'. Allowed target states: [${allowedNext.join(", ")}]`
    );
  }

  // 2. Check role authorization
  const allowedRoles = ROLE_TRANSITION_PERMISSIONS[targetStatus];
  if (allowedRoles && !allowedRoles.includes(payload.actor.role) && payload.actor.role !== UserRole.ADMIN) {
    throw new LifecycleError(
      "UNAUTHORIZED_ROLE",
      `Role '${payload.actor.role}' is not authorized to transition complaints to '${targetStatus}'`
    );
  }

  // Citizens can only transition their own complaints
  if (payload.actor.role === UserRole.CITIZEN && complaint.citizenId.toString() !== payload.actor.id) {
    throw new LifecycleError("UNAUTHORIZED_ROLE", "Citizens can only perform actions on their own grievances");
  }

  // Department Officials must belong to the same department (unless admin)
  if (payload.actor.role === UserRole.OFFICIAL) {
    // Official department check is enforced by route middleware.
  }
  if (payload.actor.role === UserRole.DEPARTMENT_STAFF) {
    const actor = await mongoose.model("User").findById(payload.actor.id).lean() as any;
    const staffDept = actor?.departmentStaffProfile?.departmentCode;
    if (!staffDept || complaint.departmentCode !== staffDept) {
      throw new LifecycleError("UNAUTHORIZED_ROLE", "Department Staff may only modify complaints belonging to their assigned department");
    }
  }

  // 3. Validate required payloads per target status
  let timelineMessage = payload.remarks || `Status changed from ${currentStatus} to ${targetStatus}.`;

  if (targetStatus === ComplaintStatus.RESOLVED) {
    if (!payload.resolutionSummary || payload.resolutionSummary.trim().length < 5) {
      throw new LifecycleError(
        "MISSING_REQUIRED_PAYLOAD",
        "A formal resolution summary (at least 5 characters) is required to resolve a grievance."
      );
    }
    complaint.resolution = {
      resolvedBy: new mongoose.Types.ObjectId(payload.actor.id),
      resolvedByName: payload.actor.name,
      resolvedAt: new Date(),
      resolutionSummary: payload.resolutionSummary.trim(),
      resolutionPhotos: payload.resolutionPhotos || [],
    };
    timelineMessage = `Grievance marked as RESOLVED by ${payload.actor.name}. Action: "${payload.resolutionSummary.trim()}"`;
  } else if (targetStatus === ComplaintStatus.REJECTED) {
    if (!payload.rejectionReason || payload.rejectionReason.trim().length < 5) {
      throw new LifecycleError(
        "MISSING_REQUIRED_PAYLOAD",
        "A formal rejection justification (at least 5 characters) is required to reject a grievance."
      );
    }
    complaint.rejection = {
      rejectedBy: new mongoose.Types.ObjectId(payload.actor.id),
      rejectedByName: payload.actor.name,
      rejectedAt: new Date(),
      reason: payload.rejectionReason.trim(),
    };
    timelineMessage = `Grievance REJECTED by ${payload.actor.name}. Justification: "${payload.rejectionReason.trim()}"`;
  } else if (targetStatus === ComplaintStatus.INFORMATION_REQUIRED) {
    if (!payload.informationQuery || payload.informationQuery.trim().length < 5) {
      throw new LifecycleError(
        "MISSING_REQUIRED_PAYLOAD",
        "Please specify the information or clarification requested from the citizen."
      );
    }
    complaint.informationRequested = {
      query: payload.informationQuery.trim(),
      requestedBy: new mongoose.Types.ObjectId(payload.actor.id),
      requestedByName: payload.actor.name,
      requestedAt: new Date(),
    };
    timelineMessage = `Clarification requested by ${payload.actor.name}: "${payload.informationQuery.trim()}"`;
  } else if (targetStatus === ComplaintStatus.UNDER_REVIEW && currentStatus === ComplaintStatus.INFORMATION_REQUIRED) {
    if (payload.informationResponse && complaint.informationRequested) {
      complaint.informationRequested.response = payload.informationResponse.trim();
      complaint.informationRequested.respondedAt = new Date();
      timelineMessage = `Citizen provided clarification: "${payload.informationResponse.trim()}". Status resumed to UNDER_REVIEW.`;
    }
  } else if (targetStatus === ComplaintStatus.REOPENED) {
    const reopenReason = payload.remarks || "Citizen requested grievance reconsideration.";
    timelineMessage = `Grievance REOPENED. Reason: "${reopenReason}"`;
    if (!complaint.sla.isBreached) {
      complaint.sla.status = SlaStatus.AT_RISK;
    }
  }

  // 4. Update complaint status and append timeline event
  complaint.status = targetStatus;
  if (targetStatus === ComplaintStatus.RESOLVED || targetStatus === ComplaintStatus.CLOSED) {
    complaint.sla.status = SlaStatus.RESOLVED;
  }
  complaint.timeline.push({
    status: targetStatus,
    message: timelineMessage,
    actorId: new mongoose.Types.ObjectId(payload.actor.id),
    actorRole: payload.actor.role,
    actorName: payload.actor.name,
    timestamp: new Date(),
  });

  await complaint.save();

  // 5. Immutable Audit Log
  await logAuditEvent({
    entityType: "COMPLAINT",
    entityId: complaint._id.toString(),
    complaintNumber: complaint.complaintNumber,
    action: "STATUS_TRANSITION",
    actor: {
      id: payload.actor.id,
      name: payload.actor.name,
      role: payload.actor.role,
      phone: payload.actor.phone,
      email: payload.actor.email,
      ipAddress: payload.actor.ipAddress,
    },
    previousState: currentStatus,
    newState: targetStatus,
    notes: timelineMessage,
    metadata: {
      resolutionSummary: payload.resolutionSummary,
      rejectionReason: payload.rejectionReason,
      informationQuery: payload.informationQuery,
      informationResponse: payload.informationResponse,
    },
  });

  // 6. In-App Notifications
  try {
    // Notify Citizen of significant state transitions
    if (payload.actor.role !== UserRole.CITIZEN) {
      let notifTitle = `Grievance Status: ${targetStatus}`;
      let notifType: "INFO" | "SUCCESS" | "WARNING" | "URGENT" = "INFO";

      if (targetStatus === ComplaintStatus.ACTION_IN_PROGRESS) {
        notifTitle = "Field Action In Progress";
      } else if (targetStatus === ComplaintStatus.RESOLVED) {
        notifTitle = "Grievance Resolved";
        notifType = "SUCCESS";
      } else if (targetStatus === ComplaintStatus.REJECTED) {
        notifTitle = "Grievance Not Feasible / Rejected";
        notifType = "WARNING";
      } else if (targetStatus === ComplaintStatus.INFORMATION_REQUIRED) {
        notifTitle = "Clarification Needed for Your Grievance";
        notifType = "URGENT";
      }

      await sendNotification({
        recipientId: complaint.citizenId,
        role: UserRole.CITIZEN,
        title: notifTitle,
        message: timelineMessage,
        type: notifType,
        complaintId: complaint._id,
        complaintNumber: complaint.complaintNumber,
      });
    }

    // If Reopened, notify assigned official
    if (targetStatus === ComplaintStatus.REOPENED && complaint.assignedOfficialId) {
      await sendNotification({
        recipientId: complaint.assignedOfficialId,
        role: UserRole.OFFICIAL,
        title: `Grievance Reopened: ${complaint.complaintNumber}`,
        message: timelineMessage,
        type: "URGENT",
        complaintId: complaint._id,
        complaintNumber: complaint.complaintNumber,
      });
    }
  } catch (notifErr) {
    logger.warn(`Failed to dispatch notification for complaint ${complaint.complaintNumber}:`, notifErr);
  }

  logger.info(
    `[LIFECYCLE] Complaint ${complaint.complaintNumber} transitioned from ${currentStatus} -> ${targetStatus} by ${payload.actor.name} (${payload.actor.role})`
  );

  return complaint;
}
