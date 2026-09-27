import type { Request, Response } from "express";
import { z } from "zod";
import {
  ComplaintActionType,
  ComplaintSource,
  ComplaintStatus,
  GovernmentDepartments,
  normalizeDepartmentCode,
  departmentDisplayName,
  Priority,
  UserRole,
} from "../types/domain.js";
import { Complaint, IEvidenceSubdocument } from "../models/complaint.model.js";
import { buildError, buildSuccess } from "../utils/apiResponse.js";
import { logger } from "../utils/logger.js";
import { logAuditEvent, getEntityAuditLogs } from "../services/audit.service.js";
import { sendNotification } from "../services/notification.service.js";
import { autoRouteComplaint, manualAssignComplaint } from "../services/complaint-routing.service.js";
import { transitionComplaintStatus, LifecycleError } from "../services/complaint-lifecycle.service.js";
import { aiService } from "../services/ai.service.js";
import { calculateDepartmentSlaTarget } from "../services/sla.service.js";

// Validation schema for creating complaint
export const createComplaintSchema = z.object({
  title: z.string().trim().min(5, "Title must be at least 5 characters").max(200),
  description: z.string().trim().min(10, "Description must be at least 10 characters").max(3000),
  category: z.string().trim().min(2, "Category is required"),
  department: z.string().trim().min(2, "Department is required"),
  village: z.string().trim().min(2, "Village / Locality is required"),
  ward: z.string().trim().optional(),
  mandal: z.string().trim().optional(),
  district: z.string().trim().min(2, "District is required"),
  pincode: z.string().trim().regex(/^\d{6}$/, "Pincode must be 6 digits").optional().or(z.literal("")),
  addressLine: z.string().trim().optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  priority: z.enum([Priority.CRITICAL, Priority.HIGH, Priority.MEDIUM, Priority.LOW]).default(Priority.MEDIUM),
});

// Validation schema for status transition
export const transitionStatusSchema = z.object({
  status: z.nativeEnum(ComplaintStatus),
  remarks: z.string().trim().optional(),
  resolutionSummary: z.string().trim().optional(),
  rejectionReason: z.string().trim().optional(),
  informationQuery: z.string().trim().optional(),
  informationResponse: z.string().trim().optional(),
  duplicateOfComplaintNumber: z.string().trim().optional(),
});

// Validation schema for official assignment
export const assignOfficialSchema = z.object({
  officialId: z.string().trim().min(1, "Official ID is required"),
  reason: z.string().trim().optional(),
});

// Validation schema for recording action
export const recordActionSchema = z.object({
  actionType: z.enum([
    ComplaintActionType.INSPECTION,
    ComplaintActionType.NOTICE_ISSUED,
    ComplaintActionType.CONTRACTOR_DISPATCHED,
    ComplaintActionType.INTERNAL_NOTE,
    ComplaintActionType.CITIZEN_CALL,
    ComplaintActionType.RESOLUTION_PROGRESS,
  ]),
  remarks: z.string().trim().min(3, "Action remarks are required"),
  isInternalOnly: z.boolean().default(false),
});

// Validation schema for responding to info request
export const respondInfoSchema = z.object({
  response: z.string().trim().min(3, "Clarification response is required"),
});

// Validation schema for feedback
export const feedbackSchema = z.object({
  rating: z.coerce.number().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
});

// Validation schema for reopen
export const reopenSchema = z.object({
  reason: z.string().trim().min(5, "Please provide a reason for reopening"),
});

/**
 * Calculate SLA target date based on priority
 */
export async function calculateSlaTargetDate(priority: Priority, department?: string): Promise<Date> {
  return calculateDepartmentSlaTarget(priority, department);
}

/**
 * Submit a new grievance (Citizen or Volunteer)
 */
export async function createComplaint(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json(buildError("UNAUTHORIZED", "Authentication required"));
    return;
  }

  const parseResult = createComplaintSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json(buildError("VALIDATION_ERROR", "Invalid grievance submission", parseResult.error.flatten().fieldErrors));
    return;
  }

  const data = parseResult.data;
  const files = (req.files as Express.Multer.File[]) || [];

  // Process evidence files
  const evidence: IEvidenceSubdocument[] = files.map((file) => ({
    fileName: file.originalname,
    fileUrl: `/uploads/evidence/${file.filename}`,
    fileType: file.mimetype,
    fileSize: file.size,
    uploadedAt: new Date(),
  }));

  const departmentCode = normalizeDepartmentCode(data.department);
  const normalizedDepartment = departmentDisplayName(departmentCode);
  if (!departmentCode || !normalizedDepartment) {
    res.status(400).json(buildError("INVALID_DEPARTMENT", "Department must be Roads & Transport, Electricity & Power, or Water Supply"));
    return;
  }

  const complaintNumber = await Complaint.generateComplaintNumber();
  const priority = data.priority || Priority.MEDIUM;
  const slaTarget = await calculateSlaTargetDate(priority, departmentCode);

  const initialTimeline = [
    {
      status: ComplaintStatus.SUBMITTED,
      message: `Grievance registered under category '${data.category}' for department '${normalizedDepartment}'.`,
      actorId: req.user._id,
      actorRole: req.user.role,
      actorName: req.user.name,
      timestamp: new Date(),
    },
  ];

  // Run AI Intelligence pipeline (department confidence, urgency score, similarity clustering, summary)
  let aiAnalysis;
  try {
    const activeCandidates = await Complaint.find({
      status: {
        $in: [
          ComplaintStatus.SUBMITTED,
          ComplaintStatus.ASSIGNED,
          ComplaintStatus.UNDER_REVIEW,
          ComplaintStatus.ACTION_IN_PROGRESS,
        ],
      },
      $or: [
        { "location.village": data.village },
        { "location.district": data.district },
      ],
    })
      .select("_id complaintNumber title description category status location")
      .limit(20)
      .lean();

    const candidates = activeCandidates.map((c) => ({
      id: c._id.toString(),
      complaint_number: c.complaintNumber,
      title: c.title,
      description: c.description,
      category: c.category,
      status: c.status,
      latitude: c.location?.coordinates?.latitude,
      longitude: c.location?.coordinates?.longitude,
      village: c.location?.village,
      taluk: c.location?.mandal,
    }));

    aiAnalysis = await aiService.analyzeComplaint({
      title: data.title,
      description: data.description,
      category: data.category,
      latitude: data.latitude,
      longitude: data.longitude,
      village: data.village,
      taluk: data.mandal,
      district: data.district,
      existingComplaints: candidates,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error";
    logger.warn(`[AI] Background analysis failed: ${msg}`);
  }

  const complaint = await Complaint.create({
    complaintNumber,
    citizenId: req.user._id,
    citizenName: req.user.name,
    citizenPhone: req.user.phone,
    title: data.title,
    description: data.description,
    category: data.category,
    department: normalizedDepartment,
    departmentCode: departmentCode as "ROAD" | "ELECTRICITY" | "WATER",
    status: ComplaintStatus.SUBMITTED,
    priority,
    source: req.user.role === UserRole.VOLUNTEER ? ComplaintSource.VOLUNTEER_ASSISTED : ComplaintSource.CITIZEN_PORTAL,
    location: {
      village: data.village,
      ward: data.ward,
      mandal: data.mandal,
      district: data.district,
      pincode: data.pincode || undefined,
      addressLine: data.addressLine,
      coordinates:
        data.latitude && data.longitude
          ? { latitude: data.latitude, longitude: data.longitude }
          : undefined,
    },
    evidence,
    timeline: initialTimeline,
    sla: {
      targetResolutionDate: slaTarget,
      isBreached: false,
    },
    aiAnalysis,
  });

  // AI safety gate: uncertain or out-of-scope analysis must enter human review before routing.
  const aiClassification = aiAnalysis?.classification;
  const aiDept = aiClassification?.primary_department;
  const needsVolunteerReview = Boolean(aiClassification?.needs_volunteer_review) || aiDept === "UNCERTAIN" || aiDept === "OUT_OF_SCOPE";
  const departmentConflict = Boolean(aiDept && ["ROAD", "ELECTRICITY", "WATER"].includes(aiDept) && aiDept !== departmentCode);
  if (needsVolunteerReview || departmentConflict) {
    complaint.status = ComplaintStatus.VERIFICATION_REQUIRED;
    complaint.timeline.push({
      status: ComplaintStatus.VERIFICATION_REQUIRED,
      message: needsVolunteerReview
        ? "AI analysis is uncertain/out-of-scope. Volunteer verification is required before department routing."
        : "AI department prediction conflicts with the submitted department. Volunteer verification is required.",
      actorId: req.user._id, actorRole: "AI", actorName: "VCGIS AI", timestamp: new Date(),
    });
    await complaint.save();
  }

  logger.info(`[COMPLAINT] Created ${complaint.complaintNumber} by ${req.user.name} (${req.user.phone})`);

  // 1. Immutable Audit Log
  await logAuditEvent({
    entityType: "COMPLAINT",
    entityId: complaint._id.toString(),
    complaintNumber: complaint.complaintNumber,
    action: "COMPLAINT_CREATED",
    actor: {
      id: req.user._id.toString(),
      name: req.user.name,
      role: req.user.role,
      phone: req.user.phone,
      email: req.user.email,
    },
    newState: complaint.status,
    notes: `Grievance registered under ${data.department} (${data.category})`,
    metadata: {
      priority,
      district: data.district,
      village: data.village,
    },
  });

  // 2. Dispatch Citizen Acknowledgement Notification
  await sendNotification({
    recipientId: req.user._id,
    role: UserRole.CITIZEN,
    title: "Grievance Registered Successfully",
    message: `Your grievance ${complaint.complaintNumber} has been submitted under ${normalizedDepartment}. Target resolution: ${slaTarget.toLocaleDateString()}.`,
    type: "SUCCESS",
    complaintId: complaint._id,
    complaintNumber: complaint.complaintNumber,
  });

  // 3. Trigger Automatic Department & Officer Routing only after AI safety gate
  if (complaint.status !== ComplaintStatus.VERIFICATION_REQUIRED) {
    try {
      await autoRouteComplaint(complaint);
    } catch (routingErr) {
      logger.warn(`[ROUTING] Auto-routing failed for ${complaint.complaintNumber}:`, routingErr);
    }
  }

  // Refetch updated complaint after potential auto-routing
  const finalComplaint = (await Complaint.findById(complaint._id)) || complaint;

  res.status(201).json(buildSuccess(finalComplaint.toJSON(), "Grievance submitted successfully"));
}

/**
 * Get all complaints submitted by the authenticated citizen
 */
export async function getMyComplaints(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json(buildError("UNAUTHORIZED", "Authentication required"));
    return;
  }

  const { status, search, page = "1", limit = "10" } = req.query;

  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  // Build filter
  const query: Record<string, unknown> = { citizenId: req.user._id };

  if (status && status !== "ALL") {
    query.status = status;
  }

  if (search) {
    const searchRegex = new RegExp(String(search), "i");
    query.$or = [
      { complaintNumber: searchRegex },
      { title: searchRegex },
      { category: searchRegex },
      { department: searchRegex },
    ];
  }

  const [complaints, total, stats] = await Promise.all([
    Complaint.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
    Complaint.countDocuments(query),
    // Compute quick dashboard statistics for the citizen
    Complaint.aggregate([
      { $match: { citizenId: req.user._id } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  // Format stats
  const statCounts = {
    total: 0,
    active: 0,
    resolved: 0,
    pending: 0,
  };

  stats.forEach((s) => {
    statCounts.total += s.count;
    if (s._id === ComplaintStatus.RESOLVED || s._id === ComplaintStatus.CLOSED) {
      statCounts.resolved += s.count;
    } else if (s._id === ComplaintStatus.SUBMITTED || s._id === ComplaintStatus.UNDER_REVIEW) {
      statCounts.pending += s.count;
    } else {
      statCounts.active += s.count;
    }
  });

  res.status(200).json(
    buildSuccess(
      {
        complaints: complaints.map((c) => c.toJSON()),
        stats: statCounts,
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
 * Get full complaint details by ID
 */
export async function getComplaintById(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json(buildError("UNAUTHORIZED", "Authentication required"));
    return;
  }

  const { id } = req.params;
  const complaint = await Complaint.findById(id);

  if (!complaint) {
    res.status(404).json(buildError("NOT_FOUND", "Grievance not found"));
    return;
  }

  // Security: Citizens can only inspect their own grievances
  if (req.user.role === UserRole.CITIZEN && !complaint.citizenId.equals(req.user._id)) {
    res.status(403).json(buildError("FORBIDDEN", "You are not authorized to view this grievance"));
    return;
  }

  const json = complaint.toJSON() as Record<string, unknown>;
  if (req.user.role === UserRole.CITIZEN && Array.isArray(json.actions)) {
    json.actions = json.actions.filter((a: { isInternalOnly?: boolean }) => !a.isInternalOnly);
  }

  res.status(200).json(buildSuccess(json));
}

/**
 * Submit citizen feedback on resolved complaint
 */
export async function submitComplaintFeedback(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json(buildError("UNAUTHORIZED", "Authentication required"));
    return;
  }

  const { id } = req.params;
  const parseResult = feedbackSchema.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json(buildError("VALIDATION_ERROR", "Invalid rating or comment", parseResult.error.flatten().fieldErrors));
    return;
  }

  const complaint = await Complaint.findById(id);
  if (!complaint) {
    res.status(404).json(buildError("NOT_FOUND", "Grievance not found"));
    return;
  }

  if (!complaint.citizenId.equals(req.user._id)) {
    res.status(403).json(buildError("FORBIDDEN", "Only the submitting citizen can provide resolution feedback"));
    return;
  }

  complaint.feedback = {
    rating: parseResult.data.rating,
    comment: parseResult.data.comment,
    submittedAt: new Date(),
  };

  complaint.timeline.push({
    status: complaint.status,
    message: `Citizen provided satisfaction feedback: ${parseResult.data.rating} / 5 stars.${parseResult.data.comment ? ` Comment: "${parseResult.data.comment}"` : ""}`,
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
    action: "FEEDBACK_SUBMITTED",
    actor: {
      id: req.user._id.toString(),
      name: req.user.name,
      role: req.user.role,
      phone: req.user.phone,
      email: req.user.email,
    },
    previousState: complaint.status,
    newState: complaint.status,
    notes: `Feedback: ${parseResult.data.rating} stars`,
    metadata: { rating: parseResult.data.rating, comment: parseResult.data.comment },
  });

  res.status(200).json(buildSuccess(complaint.toJSON(), "Feedback submitted successfully"));
}

/**
 * Reopen a resolved/closed complaint if dissatisfied
 */
export async function reopenComplaint(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json(buildError("UNAUTHORIZED", "Authentication required"));
    return;
  }

  const { id } = req.params;
  if (!id || typeof id !== "string") {
    res.status(400).json(buildError("VALIDATION_ERROR", "Complaint ID is required"));
    return;
  }
  const parseResult = reopenSchema.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json(buildError("VALIDATION_ERROR", "Reopen reason required", parseResult.error.flatten().fieldErrors));
    return;
  }

  const complaint = await Complaint.findById(id);
  if (!complaint) {
    res.status(404).json(buildError("NOT_FOUND", "Grievance not found"));
    return;
  }

  if (!complaint.citizenId.equals(req.user._id)) {
    res.status(403).json(buildError("FORBIDDEN", "Only the original citizen can reopen this grievance"));
    return;
  }

  const eligibleForReopen: ComplaintStatus[] = [
    ComplaintStatus.RESOLVED,
    ComplaintStatus.CLOSED,
    ComplaintStatus.REJECTED,
  ];
  if (!eligibleForReopen.includes(complaint.status)) {
    res.status(400).json(buildError("INVALID_STATE", `Cannot reopen grievance in '${complaint.status}' state.`));
    return;
  }

  try {
    const updated = await transitionComplaintStatus(id, {
      newStatus: ComplaintStatus.REOPENED,
      remarks: parseResult.data.reason,
      actor: {
        id: req.user._id.toString(),
        name: req.user.name,
        role: req.user.role,
        phone: req.user.phone,
        email: req.user.email,
        ipAddress: req.ip,
      },
    });

    res.status(200).json(buildSuccess(updated.toJSON(), "Grievance reopened for administrative review"));
  } catch (error) {
    if (error instanceof LifecycleError) {
      res.status(400).json(buildError(error.code, error.message));
      return;
    }
    throw error;
  }
}

/**
 * Transition complaint status via Lifecycle Engine (Officials & Admins)
 */
export async function transitionStatus(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json(buildError("UNAUTHORIZED", "Authentication required"));
    return;
  }

  const { id } = req.params;
  if (!id || typeof id !== "string") {
    res.status(400).json(buildError("VALIDATION_ERROR", "Complaint ID is required"));
    return;
  }
  const parseResult = transitionStatusSchema.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json(
      buildError("VALIDATION_ERROR", "Invalid transition payload", parseResult.error.flatten().fieldErrors)
    );
    return;
  }

  const data = parseResult.data;

  try {
    const updated = await transitionComplaintStatus(id, {
      newStatus: data.status,
      remarks: data.remarks,
      resolutionSummary: data.resolutionSummary,
      rejectionReason: data.rejectionReason,
      informationQuery: data.informationQuery,
      informationResponse: data.informationResponse,
      duplicateOfComplaintNumber: data.duplicateOfComplaintNumber,
      actor: {
        id: req.user._id.toString(),
        name: req.user.name,
        role: req.user.role,
        phone: req.user.phone,
        email: req.user.email,
        ipAddress: req.ip,
      },
    });

    res.status(200).json(buildSuccess(updated.toJSON(), `Status successfully transitioned to ${data.status}`));
  } catch (error) {
    if (error instanceof LifecycleError) {
      const statusMap: Record<string, number> = {
        UNAUTHORIZED_ROLE: 403,
        INVALID_TRANSITION: 400,
        MISSING_REQUIRED_PAYLOAD: 400,
        NOT_FOUND: 404,
      };
      res.status(statusMap[error.code] || 400).json(buildError(error.code, error.message));
      return;
    }
    throw error;
  }
}

/**
 * Assign or reassign department official (Admins & Senior Officials)
 */
export async function assignOfficial(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json(buildError("UNAUTHORIZED", "Authentication required"));
    return;
  }

  if (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.OFFICIAL) {
    res.status(403).json(buildError("FORBIDDEN", "Only Officials and Administrators can assign grievances"));
    return;
  }

  const { id } = req.params;
  if (!id || typeof id !== "string") {
    res.status(400).json(buildError("VALIDATION_ERROR", "Complaint ID is required"));
    return;
  }
  const parseResult = assignOfficialSchema.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json(
      buildError("VALIDATION_ERROR", "Invalid assignment payload", parseResult.error.flatten().fieldErrors)
    );
    return;
  }

  try {
    const updated = await manualAssignComplaint({
      complaintId: id,
      officialId: parseResult.data.officialId,
      reason: parseResult.data.reason,
      actor: {
        id: req.user._id.toString(),
        name: req.user.name,
        role: req.user.role,
        phone: req.user.phone,
        email: req.user.email,
        ipAddress: req.ip,
      },
    });

    res.status(200).json(buildSuccess(updated.toJSON(), "Official successfully assigned to grievance"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Assignment failed";
    res.status(400).json(buildError("ASSIGN_FAILED", message));
  }
}

/**
 * Record an official action or internal note on a complaint
 */
export async function recordAction(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json(buildError("UNAUTHORIZED", "Authentication required"));
    return;
  }

  if (req.user.role !== UserRole.OFFICIAL && req.user.role !== UserRole.ADMIN) {
    res.status(403).json(buildError("FORBIDDEN", "Only Officials and Administrators can log actions"));
    return;
  }

  const { id } = req.params;
  if (!id || typeof id !== "string") {
    res.status(400).json(buildError("VALIDATION_ERROR", "Complaint ID is required"));
    return;
  }
  const parseResult = recordActionSchema.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json(
      buildError("VALIDATION_ERROR", "Invalid action payload", parseResult.error.flatten().fieldErrors)
    );
    return;
  }

  const complaint = await Complaint.findById(id);
  if (!complaint) {
    res.status(404).json(buildError("NOT_FOUND", "Grievance not found"));
    return;
  }

  const data = parseResult.data;

  // Append action
  if (!complaint.actions) {
    complaint.actions = [];
  }

  complaint.actions.push({
    actionType: data.actionType,
    remarks: data.remarks,
    isInternalOnly: data.isInternalOnly,
    actorId: req.user._id,
    actorName: req.user.name,
    actorRole: req.user.role,
    createdAt: new Date(),
  });

  // If public action, also add to citizen timeline
  if (!data.isInternalOnly) {
    complaint.timeline.push({
      status: complaint.status,
      message: `[${data.actionType.replace(/_/g, " ")}] ${data.remarks}`,
      actorId: req.user._id,
      actorRole: req.user.role,
      actorName: req.user.name,
      timestamp: new Date(),
    });
  }

  await complaint.save();

  // Audit
  await logAuditEvent({
    entityType: "COMPLAINT",
    entityId: complaint._id.toString(),
    complaintNumber: complaint.complaintNumber,
    action: "ACTION_LOGGED",
    actor: {
      id: req.user._id.toString(),
      name: req.user.name,
      role: req.user.role,
      phone: req.user.phone,
      email: req.user.email,
      ipAddress: req.ip,
    },
    notes: `[${data.actionType}] ${data.remarks}${data.isInternalOnly ? " (Internal)" : ""}`,
    metadata: {
      actionType: data.actionType,
      isInternalOnly: data.isInternalOnly,
    },
  });

  res.status(200).json(buildSuccess(complaint.toJSON(), "Action recorded successfully"));
}

/**
 * Citizen responds to requested information
 */
export async function respondToInformation(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json(buildError("UNAUTHORIZED", "Authentication required"));
    return;
  }

  const { id } = req.params;
  if (!id || typeof id !== "string") {
    res.status(400).json(buildError("VALIDATION_ERROR", "Complaint ID is required"));
    return;
  }
  const parseResult = respondInfoSchema.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json(
      buildError("VALIDATION_ERROR", "Clarification response required", parseResult.error.flatten().fieldErrors)
    );
    return;
  }

  try {
    const updated = await transitionComplaintStatus(id, {
      newStatus: ComplaintStatus.UNDER_REVIEW,
      informationResponse: parseResult.data.response,
      actor: {
        id: req.user._id.toString(),
        name: req.user.name,
        role: req.user.role,
        phone: req.user.phone,
        email: req.user.email,
        ipAddress: req.ip,
      },
    });

    res.status(200).json(buildSuccess(updated.toJSON(), "Clarification provided successfully"));
  } catch (error) {
    if (error instanceof LifecycleError) {
      res.status(400).json(buildError(error.code, error.message));
      return;
    }
    throw error;
  }
}

/**
 * Fetch immutable audit trail for a complaint
 */
export async function getComplaintAuditTrail(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json(buildError("UNAUTHORIZED", "Authentication required"));
    return;
  }

  const { id } = req.params;
  if (!id || typeof id !== "string") {
    res.status(400).json(buildError("VALIDATION_ERROR", "Complaint ID is required"));
    return;
  }
  const complaint = await Complaint.findById(id);
  if (!complaint) {
    res.status(404).json(buildError("NOT_FOUND", "Grievance not found"));
    return;
  }

  if (req.user.role === UserRole.CITIZEN && !complaint.citizenId.equals(req.user._id)) {
    res.status(403).json(buildError("FORBIDDEN", "Unauthorized to view audit trail"));
    return;
  }

  const auditLogs = await getEntityAuditLogs("COMPLAINT", id);
  res.status(200).json(buildSuccess(auditLogs, "Audit trail retrieved"));
}

/**
 * Query all complaints with multi-parameter filtering (Officials & Admins)
 */
export async function getAllComplaints(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json(buildError("UNAUTHORIZED", "Authentication required"));
    return;
  }

  if (req.user.role === UserRole.CITIZEN) {
    res.status(403).json(buildError("FORBIDDEN", "Citizens cannot access global complaint list"));
    return;
  }

  const {
    department,
    status,
    priority,
    district,
    mandal,
    village,
    assignedToMe,
    search,
    page = "1",
    limit = "20",
  } = req.query;

  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const filter: Record<string, unknown> = {};

  // Officials are scoped to their department unless admin
  if (req.user.role === UserRole.OFFICIAL) {
    const userDept = req.user.officialProfile?.department;
    if (userDept) {
      filter.department = userDept;
    }
  } else if (department && department !== "ALL") {
    filter.department = department;
  }

  if (status && status !== "ALL") {
    filter.status = status;
  }

  if (priority && priority !== "ALL") {
    filter.priority = priority;
  }

  if (district && district !== "ALL") {
    filter["location.district"] = district;
  }

  if (mandal) {
    filter["location.mandal"] = mandal;
  }

  if (village) {
    filter["location.village"] = village;
  }

  if (assignedToMe === "true") {
    filter.assignedOfficialId = req.user._id;
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
    Complaint.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).exec(),
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
 * List available government departments and categories
 */
export async function getDepartmentCategories(_req: Request, res: Response): Promise<void> {
  res.status(200).json(
    buildSuccess({
      departments: GovernmentDepartments,
    })
  );
}
