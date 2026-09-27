import type { Request, Response } from "express";
import { z } from "zod";
import { Complaint, IEvidenceSubdocument } from "../models/complaint.model.js";
import { ComplaintStatus, Priority, UserRole } from "../types/domain.js";
import { buildError, buildSuccess } from "../utils/apiResponse.js";
import { logger } from "../utils/logger.js";
import { logAuditEvent } from "../services/audit.service.js";
import { autoRouteComplaint } from "../services/complaint-routing.service.js";
import { transitionComplaintStatus, LifecycleError } from "../services/complaint-lifecycle.service.js";

// Validation schemas
export const resolveWithProofSchema = z.object({
  resolutionSummary: z.string().trim().min(5, "Resolution summary must be at least 5 characters"),
  actionTaken: z.string().trim().optional(),
  contractorName: z.string().trim().optional(),
  materialsUsed: z.string().trim().optional(),
});

export const rejectComplaintSchema = z.object({
  reason: z.string().trim().min(5, "A formal rejection justification is required"),
});

export const transferDepartmentSchema = z.object({
  targetDepartment: z.string().trim().min(2, "Target department is required"),
  reason: z.string().trim().min(5, "Transfer justification is required"),
});

export const escalateComplaintSchema = z.object({
  reason: z.string().trim().min(5, "Escalation justification is required"),
});

/**
 * Fetch the 7 Departmental KPI Metrics for Official Dashboard (Requirements Section 25)
 */
export async function getOfficialDashboardMetrics(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json(buildError("UNAUTHORIZED", "Authentication required"));
    return;
  }

  const department = req.user.officialProfile?.department;
  const filter: Record<string, unknown> = {};

  if (req.user.role === UserRole.OFFICIAL) {
    if (!department) {
      res.status(400).json(buildError("CONFIG_ERROR", "User is not mapped to any department"));
      return;
    }
    filter.department = department;
  }

  const now = new Date();
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const [
    totalComplaints,
    newComplaints,
    pendingComplaints,
    urgentComplaints,
    slaRiskComplaints,
    resolvedComplaints,
    reopenedComplaints,
    assignedToMeCount,
  ] = await Promise.all([
    // Total
    Complaint.countDocuments(filter),

    // New (submitted within 48h and active)
    Complaint.countDocuments({
      ...filter,
      createdAt: { $gte: twoDaysAgo },
      status: {
        $in: [
          ComplaintStatus.SUBMITTED,
          ComplaintStatus.VALIDATING,
          ComplaintStatus.ROUTING,
          ComplaintStatus.ASSIGNED,
        ],
      },
    }),

    // Pending review or action
    Complaint.countDocuments({
      ...filter,
      status: {
        $in: [
          ComplaintStatus.ASSIGNED,
          ComplaintStatus.UNDER_REVIEW,
          ComplaintStatus.ACTION_IN_PROGRESS,
          ComplaintStatus.INFORMATION_REQUIRED,
        ],
      },
    }),

    // Urgent (Critical or High priority not yet resolved)
    Complaint.countDocuments({
      ...filter,
      priority: { $in: [Priority.CRITICAL, Priority.HIGH] },
      status: { $nin: [ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED, ComplaintStatus.CANCELLED] },
    }),

    // SLA Risk (Deadline within 24h or already breached and not resolved)
    Complaint.countDocuments({
      ...filter,
      "sla.targetResolutionDate": { $lte: next24Hours },
      status: { $nin: [ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED, ComplaintStatus.CANCELLED] },
    }),

    // Resolved or Closed
    Complaint.countDocuments({
      ...filter,
      status: { $in: [ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED] },
    }),

    // Reopened
    Complaint.countDocuments({
      ...filter,
      status: ComplaintStatus.REOPENED,
    }),

    // Assigned specifically to this officer
    Complaint.countDocuments({
      ...filter,
      assignedOfficialId: req.user._id,
      status: { $nin: [ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED, ComplaintStatus.CANCELLED] },
    }),
  ]);

  res.status(200).json(
    buildSuccess({
      department: department || "All Departments",
      totalComplaints,
      newComplaints,
      pendingComplaints,
      urgentComplaints,
      slaRiskComplaints,
      resolvedComplaints,
      reopenedComplaints,
      assignedToMeCount,
    })
  );
}

/**
 * Get Department-Isolated Work Queue with advanced filters
 */
export async function getOfficialWorkQueue(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json(buildError("UNAUTHORIZED", "Authentication required"));
    return;
  }

  const department = req.user.officialProfile?.department;
  const filter: Record<string, unknown> = {};

  if (req.user.role === UserRole.OFFICIAL) {
    if (!department) {
      res.status(400).json(buildError("CONFIG_ERROR", "User is not assigned to any department"));
      return;
    }
    filter.department = department;
  }

  const {
    assignedToMe,
    status,
    priority,
    slaRisk,
    taluk,
    village,
    search,
    page = "1",
    limit = "20",
  } = req.query;

  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  if (assignedToMe === "true") {
    filter.assignedOfficialId = req.user._id;
  }

  if (status && status !== "ALL") {
    filter.status = status;
  }

  if (priority && priority !== "ALL") {
    filter.priority = priority;
  }

  if (slaRisk === "true") {
    const next24Hours = new Date(Date.now() + 24 * 60 * 60 * 1000);
    filter["sla.targetResolutionDate"] = { $lte: next24Hours };
    filter.status = { $nin: [ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED, ComplaintStatus.CANCELLED] };
  }

  if (taluk) {
    filter["location.mandal"] = taluk;
  }

  if (village) {
    filter["location.village"] = village;
  }

  if (search) {
    const searchRegex = new RegExp(String(search), "i");
    filter.$or = [
      { complaintNumber: searchRegex },
      { title: searchRegex },
      { citizenName: searchRegex },
      { citizenPhone: searchRegex },
      { "location.village": searchRegex },
    ];
  }

  const [complaints, total] = await Promise.all([
    Complaint.find(filter).sort({ priority: -1, createdAt: -1 }).skip(skip).limit(limitNum).exec(),
    Complaint.countDocuments(filter),
  ]);

  res.status(200).json(
    buildSuccess(
      {
        complaints: complaints.map((c) => c.toJSON()),
      },
      undefined,
      {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      }
    )
  );
}

/**
 * Resolve a complaint with mandatory photographic evidence of completed work
 */
export async function resolveComplaintWithProof(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json(buildError("UNAUTHORIZED", "Authentication required"));
    return;
  }

  const { id } = req.params;
  if (!id || typeof id !== "string") {
    res.status(400).json(buildError("VALIDATION_ERROR", "Complaint ID is required"));
    return;
  }

  const parseResult = resolveWithProofSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json(
      buildError("VALIDATION_ERROR", "Invalid resolution payload", parseResult.error.flatten().fieldErrors)
    );
    return;
  }

  const files = (req.files as Express.Multer.File[]) || [];
  if (files.length === 0) {
    res.status(400).json(
      buildError("PHOTO_PROOF_REQUIRED", "At least one photograph of completed work is required to resolve a grievance")
    );
    return;
  }

  const resolutionPhotos: IEvidenceSubdocument[] = files.map((file) => ({
    fileName: file.originalname,
    fileUrl: `/uploads/evidence/${file.filename}`,
    fileType: file.mimetype,
    fileSize: file.size,
    uploadedAt: new Date(),
  }));

  const data = parseResult.data;
  let remarksText = `Resolved by ${req.user.name}. ${data.resolutionSummary}`;
  if (data.actionTaken) remarksText += ` Action: ${data.actionTaken}`;
  if (data.contractorName) remarksText += ` (Contractor: ${data.contractorName})`;
  if (data.materialsUsed) remarksText += ` (Materials: ${data.materialsUsed})`;

  try {
    const updated = await transitionComplaintStatus(id, {
      newStatus: ComplaintStatus.RESOLVED,
      resolutionSummary: data.resolutionSummary,
      resolutionPhotos,
      remarks: remarksText,
      actor: {
        id: req.user._id.toString(),
        name: req.user.name,
        role: req.user.role,
        phone: req.user.phone,
        email: req.user.email,
        ipAddress: req.ip,
      },
    });

    // Also log formal action
    if (!updated.actions) updated.actions = [];
    updated.actions.push({
      actionType: "RESOLUTION_PROGRESS",
      remarks: remarksText,
      isInternalOnly: false,
      actorId: req.user._id,
      actorName: req.user.name,
      actorRole: req.user.role,
      attachments: resolutionPhotos,
      createdAt: new Date(),
    });
    await updated.save();

    logger.info(`[OFFICIAL] Complaint ${updated.complaintNumber} resolved with ${resolutionPhotos.length} photo(s)`);

    res.status(200).json(buildSuccess(updated.toJSON(), "Grievance resolved successfully with proof of work"));
  } catch (error) {
    if (error instanceof LifecycleError) {
      res.status(400).json(buildError(error.code, error.message));
      return;
    }
    throw error;
  }
}

/**
 * Formal rejection of a complaint requiring justification
 */
export async function rejectComplaintWithReason(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json(buildError("UNAUTHORIZED", "Authentication required"));
    return;
  }

  const { id } = req.params;
  if (!id || typeof id !== "string") {
    res.status(400).json(buildError("VALIDATION_ERROR", "Complaint ID is required"));
    return;
  }

  const parseResult = rejectComplaintSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json(
      buildError("VALIDATION_ERROR", "Rejection reason is required", parseResult.error.flatten().fieldErrors)
    );
    return;
  }

  try {
    const updated = await transitionComplaintStatus(id, {
      newStatus: ComplaintStatus.REJECTED,
      rejectionReason: parseResult.data.reason,
      actor: {
        id: req.user._id.toString(),
        name: req.user.name,
        role: req.user.role,
        phone: req.user.phone,
        email: req.user.email,
        ipAddress: req.ip,
      },
    });

    res.status(200).json(buildSuccess(updated.toJSON(), "Grievance rejected with formal administrative justification"));
  } catch (error) {
    if (error instanceof LifecycleError) {
      res.status(400).json(buildError(error.code, error.message));
      return;
    }
    throw error;
  }
}

/**
 * Transfer / Reassign complaint to another department when misrouted
 */
export async function transferComplaintDepartment(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json(buildError("UNAUTHORIZED", "Authentication required"));
    return;
  }

  const { id } = req.params;
  if (!id || typeof id !== "string") {
    res.status(400).json(buildError("VALIDATION_ERROR", "Complaint ID is required"));
    return;
  }

  const parseResult = transferDepartmentSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json(
      buildError("VALIDATION_ERROR", "Target department and reason required", parseResult.error.flatten().fieldErrors)
    );
    return;
  }

  const complaint = await Complaint.findById(id);
  if (!complaint) {
    res.status(404).json(buildError("NOT_FOUND", "Grievance not found"));
    return;
  }

  const oldDepartment = complaint.department;
  const newDepartment = parseResult.data.targetDepartment;
  const transferReason = parseResult.data.reason;

  complaint.department = newDepartment;
  complaint.assignedOfficialId = undefined;
  complaint.assignedOfficialName = undefined;
  complaint.status = ComplaintStatus.ROUTING;

  const message = `Department transfer: Transferred from '${oldDepartment}' to '${newDepartment}' by ${req.user.name}. Reason: "${transferReason}"`;

  complaint.timeline.push({
    status: ComplaintStatus.ROUTING,
    message,
    actorId: req.user._id,
    actorRole: req.user.role,
    actorName: req.user.name,
    timestamp: new Date(),
  });

  await complaint.save();

  // Audit
  await logAuditEvent({
    entityType: "COMPLAINT",
    entityId: complaint._id.toString(),
    complaintNumber: complaint.complaintNumber,
    action: "STATUS_TRANSITION",
    actor: {
      id: req.user._id.toString(),
      name: req.user.name,
      role: req.user.role,
      phone: req.user.phone,
      email: req.user.email,
      ipAddress: req.ip,
    },
    previousState: oldDepartment,
    newState: newDepartment,
    notes: message,
    metadata: { oldDepartment, newDepartment, transferReason },
  });

  // Re-run auto-routing for the new department!
  try {
    await autoRouteComplaint(complaint);
  } catch (err) {
    logger.warn(`Failed to auto-route transferred complaint ${complaint.complaintNumber}:`, err);
  }

  const finalComplaint = (await Complaint.findById(complaint._id)) || complaint;

  res.status(200).json(buildSuccess(finalComplaint.toJSON(), `Grievance transferred to ${newDepartment}`));
}

/**
 * Escalate an unresolvable complaint to higher authority
 */
export async function escalateComplaint(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json(buildError("UNAUTHORIZED", "Authentication required"));
    return;
  }

  const { id } = req.params;
  if (!id || typeof id !== "string") {
    res.status(400).json(buildError("VALIDATION_ERROR", "Complaint ID is required"));
    return;
  }

  const parseResult = escalateComplaintSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json(
      buildError("VALIDATION_ERROR", "Escalation reason required", parseResult.error.flatten().fieldErrors)
    );
    return;
  }

  try {
    const updated = await transitionComplaintStatus(id, {
      newStatus: ComplaintStatus.ESCALATED,
      remarks: `Escalated by ${req.user.name}: ${parseResult.data.reason}`,
      actor: {
        id: req.user._id.toString(),
        name: req.user.name,
        role: req.user.role,
        phone: req.user.phone,
        email: req.user.email,
        ipAddress: req.ip,
      },
    });

    res.status(200).json(buildSuccess(updated.toJSON(), "Grievance escalated to higher administrative authority"));
  } catch (error) {
    if (error instanceof LifecycleError) {
      res.status(400).json(buildError(error.code, error.message));
      return;
    }
    throw error;
  }
}
