import mongoose from "mongoose";
import { Complaint, IComplaintDocument } from "../models/complaint.model.js";
import { User } from "../models/user.model.js";
import { ComplaintStatus, UserRole, normalizeDepartmentCode, departmentDisplayName } from "../types/domain.js";
import { logAuditEvent } from "./audit.service.js";
import { sendNotification } from "./notification.service.js";
import { logger } from "../utils/logger.js";

export interface ManualAssignParams {
  complaintId: string;
  officialId: string;
  actor: {
    id: string;
    name: string;
    role: UserRole;
    phone?: string;
    email?: string;
    ipAddress?: string;
  };
  reason?: string;
}

/**
 * Automatically inspects complaint department & jurisdiction and routes/assigns to an eligible official
 */
export async function autoRouteComplaint(
  complaintOrId: string | IComplaintDocument
): Promise<{ assigned: boolean; official?: { id: string; name: string; designation: string } }> {
  const complaint =
    typeof complaintOrId === "string" ? await Complaint.findById(complaintOrId) : complaintOrId;

  if (!complaint) {
    logger.warn("[ROUTING] Complaint not found for auto-routing");
    return { assigned: false };
  }

  const departmentCode = complaint.departmentCode || normalizeDepartmentCode(complaint.department);
  const department = departmentDisplayName(departmentCode);
  if (!departmentCode || !department) {
    logger.warn(`[ROUTING] Complaint ${complaint.complaintNumber} has an unknown/out-of-scope department; leaving unassigned.`);
    return { assigned: false };
  }
  if (!complaint.departmentCode) {
    complaint.departmentCode = departmentCode as "ROAD" | "ELECTRICITY" | "WATER";
    complaint.department = department;
  }
  const district = complaint.location.district;
  const taluk = complaint.location.mandal; // mandal/taluk field

  // 1. Locate active Department Staff for this operational department
  const staffUser = await User.findOne({
    role: UserRole.DEPARTMENT_STAFF,
    isActive: true,
    "departmentStaffProfile.departmentCode": departmentCode,
  });

  // 2. Locate supervising Official for departmental oversight
  let official = await User.findOne({
    role: UserRole.OFFICIAL,
    isActive: true,
    "officialProfile.departmentCode": departmentCode,
    ...(taluk ? { "officialProfile.jurisdictionTaluk": taluk } : {}),
  });

  if (!official && district) {
    official = await User.findOne({
      role: UserRole.OFFICIAL,
      isActive: true,
      "officialProfile.departmentCode": departmentCode,
      "officialProfile.jurisdictionDistrict": district,
    });
  }

  if (!official) {
    official = await User.findOne({
      role: UserRole.OFFICIAL,
      isActive: true,
      "officialProfile.departmentCode": departmentCode,
    });
  }

  if (!staffUser && !official) {
    logger.info(
      `[ROUTING] No available Department Staff or Official found for department '${department}'. Exception state: ON_HOLD.`
    );
    complaint.status = ComplaintStatus.ON_HOLD;
    complaint.timeline.push({
      status: ComplaintStatus.ON_HOLD,
      message: `No active Department Staff or Official found for '${department}'. Grievance queued for administrative manual assignment.`,
      actorRole: "SYSTEM",
      actorName: "Automated Routing Engine",
      timestamp: new Date(),
    });
    await complaint.save();

    await logAuditEvent({
      entityType: "COMPLAINT",
      entityId: complaint._id.toString(),
      complaintNumber: complaint.complaintNumber,
      action: "STATUS_TRANSITION",
      actor: { name: "Automated Routing Engine", role: "SYSTEM" },
      previousState: complaint.status,
      newState: ComplaintStatus.ON_HOLD,
      notes: `Unassigned exception state. No staff available for department '${department}'`,
    });
    return { assigned: false };
  }

  // Assign to complaint
  const previousStatus = complaint.status;
  if (official) {
    complaint.assignedOfficialId = official._id as mongoose.Types.ObjectId;
    complaint.assignedOfficialName = official.name;
  }

  complaint.status = ComplaintStatus.ASSIGNED;

  const staffName = staffUser?.name || "Department Staff Queue";
  const officialName = official?.name || "Supervising Official";
  const assignMessage = `Routed to ${department} Operational Staff (${staffName}) with supervisory oversight by ${officialName}.`;

  complaint.timeline.push({
    status: ComplaintStatus.ASSIGNED,
    message: assignMessage,
    actorRole: "SYSTEM",
    actorName: "Automated Routing Engine",
    timestamp: new Date(),
  });

  await complaint.save();

  const designation = official?.officialProfile?.designation || "Officer";

  // Record audit log
  await logAuditEvent({
    entityType: "COMPLAINT",
    entityId: complaint._id.toString(),
    complaintNumber: complaint.complaintNumber,
    action: "SYSTEM_AUTO_ROUTE",
    actor: {
      name: "Automated Routing Engine",
      role: "SYSTEM",
    },
    previousState: previousStatus,
    newState: ComplaintStatus.ASSIGNED,
    notes: assignMessage,
    metadata: {
      assignedOfficialId: official ? official._id.toString() : undefined,
      assignedOfficialName: official ? official.name : undefined,
      department,
      departmentCode,
      district,
      taluk,
    },
  });

  if (official) {
    // Notify Official
    await sendNotification({
      recipientId: official._id,
      role: UserRole.OFFICIAL,
      title: `New Grievance Assigned: ${complaint.complaintNumber}`,
      message: `A new ${complaint.priority} priority grievance has been assigned: "${complaint.title}". Target SLA: ${new Date(
        complaint.sla.targetResolutionDate
      ).toLocaleDateString()}.`,
      type: complaint.priority === "CRITICAL" ? "URGENT" : "INFO",
      complaintId: complaint._id,
      complaintNumber: complaint.complaintNumber,
    });
  }

  // Notify Citizen
  await sendNotification({
    recipientId: complaint.citizenId,
    role: UserRole.CITIZEN,
    title: `Grievance Routed to Department`,
    message: `Your grievance ${complaint.complaintNumber} has been routed to ${department} Department (${officialName}).`,
    type: "INFO",
    complaintId: complaint._id,
    complaintNumber: complaint.complaintNumber,
  });

  logger.info(
    `[ROUTING] Successfully auto-routed ${complaint.complaintNumber} to ${department} (Staff: ${staffName}, Official: ${officialName})`
  );

  return {
    assigned: true,
    official: official
      ? {
          id: official._id.toString(),
          name: official.name,
          designation,
        }
      : undefined,
  };
}

/**
 * Manually assign or reassign an official to a complaint
 */
export async function manualAssignComplaint(params: ManualAssignParams): Promise<IComplaintDocument> {
  const complaint = await Complaint.findById(params.complaintId);
  if (!complaint) {
    throw new Error(`Complaint '${params.complaintId}' not found`);
  }

  const official = await User.findOne({ _id: params.officialId, role: UserRole.OFFICIAL });
  if (!official) {
    throw new Error(`Official '${params.officialId}' was not found or is not active`);
  }

  const previousOfficialName = complaint.assignedOfficialName;
  const previousStatus = complaint.status;

  complaint.assignedOfficialId = official._id as mongoose.Types.ObjectId;
  complaint.assignedOfficialName = official.name;
  complaint.status = ComplaintStatus.ASSIGNED;

  const designation = official.officialProfile?.designation || "Officer";
  const reasonText = params.reason ? ` Reason: ${params.reason}` : "";
  const message = previousOfficialName
    ? `Reassigned from ${previousOfficialName} to ${official.name} (${designation}) by ${params.actor.name}.${reasonText}`
    : `Manually assigned to ${official.name} (${designation}) by ${params.actor.name}.${reasonText}`;

  complaint.timeline.push({
    status: ComplaintStatus.ASSIGNED,
    message,
    actorId: new mongoose.Types.ObjectId(params.actor.id),
    actorRole: params.actor.role,
    actorName: params.actor.name,
    timestamp: new Date(),
  });

  await complaint.save();

  // Audit
  await logAuditEvent({
    entityType: "COMPLAINT",
    entityId: complaint._id.toString(),
    complaintNumber: complaint.complaintNumber,
    action: previousOfficialName ? "OFFICIAL_REASSIGNED" : "OFFICIAL_ASSIGNED",
    actor: {
      id: params.actor.id,
      name: params.actor.name,
      role: params.actor.role,
      phone: params.actor.phone,
      email: params.actor.email,
      ipAddress: params.actor.ipAddress,
    },
    previousState: previousStatus,
    newState: ComplaintStatus.ASSIGNED,
    notes: message,
    metadata: {
      assignedOfficialId: official._id.toString(),
      assignedOfficialName: official.name,
      previousOfficialName,
      reason: params.reason,
    },
  });

  // Notify Official
  await sendNotification({
    recipientId: official._id,
    role: UserRole.OFFICIAL,
    title: `Grievance Assignment: ${complaint.complaintNumber}`,
    message: `You have been assigned grievance "${complaint.title}" by ${params.actor.name}.${reasonText}`,
    type: "INFO",
    complaintId: complaint._id,
    complaintNumber: complaint.complaintNumber,
  });

  return complaint;
}
