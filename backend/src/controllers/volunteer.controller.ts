import type { Request, Response } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import {
  ComplaintSource,
  ComplaintStatus,
  FieldVerificationResult,
  GovernmentDepartments,
  normalizeDepartmentCode,
  departmentDisplayName,
  Priority,
  UserRole,
} from "../types/domain.js";
import { Complaint, IEvidenceSubdocument } from "../models/complaint.model.js";
import { User } from "../models/user.model.js";
import { calculateSlaTargetDate } from "./complaint.controller.js";
import { transitionComplaintStatus, LifecycleError } from "../services/complaint-lifecycle.service.js";
import { buildError, buildSuccess } from "../utils/apiResponse.js";
import { logger } from "../utils/logger.js";
import { logAuditEvent } from "../services/audit.service.js";

// Validation for registering a citizen
export const registerCitizenSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Phone must be a valid 10-digit Indian mobile number"),
  address: z.string().trim().optional(),
  village: z.string().trim().min(2, "Village name is required"),
  ward: z.string().trim().optional(),
  mandal: z.string().trim().optional(),
  district: z.string().trim().min(2, "District name is required"),
  pincode: z.string().trim().regex(/^\d{6}$/, "Pincode must be 6 digits").optional().or(z.literal("")),
});

// Validation for on-behalf complaint filing
export const fileAssistedComplaintSchema = z.object({
  citizenId: z.string().trim().min(1, "Citizen ID is required"),
  title: z.string().trim().min(5, "Title must be at least 5 characters").max(200),
  description: z.string().trim().min(10, "Description must be at least 10 characters").max(3000),
  category: z.string().trim().min(2, "Category is required"),
  department: z.string().trim().min(2, "Department is required"),
  village: z.string().trim().min(2, "Village is required"),
  ward: z.string().trim().optional(),
  mandal: z.string().trim().optional(),
  district: z.string().trim().min(2, "District is required"),
  pincode: z.string().trim().regex(/^\d{6}$/, "Pincode must be 6 digits").optional().or(z.literal("")),
  addressLine: z.string().trim().optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  priority: z.enum([Priority.CRITICAL, Priority.HIGH, Priority.MEDIUM, Priority.LOW]).default(Priority.MEDIUM),
  immediateVerification: z.coerce.boolean().optional().default(false),
  verificationNotes: z.string().trim().optional(),
});

// Validation for field verification
export const fieldVerificationSchema = z.object({
  result: z.enum([
    FieldVerificationResult.VERIFIED,
    FieldVerificationResult.REJECTED,
    FieldVerificationResult.REQUIRES_INFO,
  ]),
  notes: z.string().trim().min(5, "Verification notes must be at least 5 characters"),
  citizenIdentified: z.coerce.boolean().optional().default(true),
  incidentConfirmed: z.coerce.boolean().optional().default(true),
  evidenceValid: z.coerce.boolean().optional().default(true),
  severityMatches: z.coerce.boolean().optional().default(true),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
});

/**
 * 1. Register a rural citizen assisted by a volunteer
 */
export async function registerCitizen(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json(buildError("UNAUTHORIZED", "Authentication required"));
    return;
  }

  const parseResult = registerCitizenSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json(buildError("VALIDATION_ERROR", "Invalid citizen details", parseResult.error.flatten().fieldErrors));
    return;
  }

  const data = parseResult.data;

  // Check if citizen exists with this phone
  let citizen = await User.findOne({ phone: data.phone });

  if (citizen) {
    // Update existing citizen profile
    citizen.name = data.name;
    citizen.citizenProfile = {
      address: data.address || citizen.citizenProfile?.address,
      village: data.village || citizen.citizenProfile?.village,
      ward: data.ward || citizen.citizenProfile?.ward,
      district: data.district || citizen.citizenProfile?.district,
      pincode: data.pincode || citizen.citizenProfile?.pincode,
    };
    citizen.isVerified = true;
    await citizen.save();
    logger.info(`[Volunteer] Updated citizen profile for phone: ${data.phone} by volunteer: ${req.user.name}`);
  } else {
    // Create new verified citizen record
    citizen = await User.create({
      name: data.name,
      phone: data.phone,
      role: UserRole.CITIZEN,
      isActive: true,
      isVerified: true,
      citizenProfile: {
        address: data.address,
        village: data.village,
        ward: data.ward,
        district: data.district,
        pincode: data.pincode,
      },
    });
    logger.info(`[Volunteer] Created new citizen for phone: ${data.phone} by volunteer: ${req.user.name}`);
  }

  res.status(201).json(buildSuccess(citizen, "Citizen registered successfully"));
}

/**
 * 2. Search registered citizens (in volunteer cluster or by query)
 */
export async function searchCitizens(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json(buildError("UNAUTHORIZED", "Authentication required"));
    return;
  }

  const query = typeof req.query.query === "string" ? req.query.query.trim() : "";
  const limit = Math.min(Number(req.query.limit) || 20, 100);

  const filter: Record<string, unknown> = {
    role: UserRole.CITIZEN,
  };

  if (query) {
    filter.$or = [
      { name: { $regex: query, $options: "i" } },
      { phone: { $regex: query } },
    ];
  } else if (req.user.volunteerProfile?.assignedVillage) {
    filter["citizenProfile.village"] = req.user.volunteerProfile.assignedVillage;
  }

  const citizens = await User.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .select("-password");

  res.json(buildSuccess(citizens, "Citizens retrieved successfully"));
}

/**
 * 3. File complaint on behalf of a citizen
 */
export async function fileAssistedComplaint(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json(buildError("UNAUTHORIZED", "Authentication required"));
    return;
  }

  const parseResult = fileAssistedComplaintSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json(buildError("VALIDATION_ERROR", "Invalid grievance submission", parseResult.error.flatten().fieldErrors));
    return;
  }

  const data = parseResult.data;
  const citizen = await User.findById(data.citizenId);
  if (!citizen) {
    res.status(404).json(buildError("NOT_FOUND", "Citizen not found. Please register the citizen first."));
    return;
  }

  const files = (req.files as Express.Multer.File[]) || [];
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

  const initialStatus = data.immediateVerification ? ComplaintStatus.VERIFIED : ComplaintStatus.SUBMITTED;
  const volunteerBadge = req.user.volunteerProfile?.volunteerId || "VOL-FIELD";

  const timeline: Array<{
    status: ComplaintStatus;
    message: string;
    actorId?: mongoose.Types.ObjectId;
    actorRole: string;
    actorName?: string;
    timestamp: Date;
  }> = [
    {
      status: ComplaintStatus.SUBMITTED,
      message: `Assisted grievance registered by Village Volunteer ${req.user.name} (Badge: ${volunteerBadge}) on behalf of citizen ${citizen.name}.`,
      actorId: req.user._id,
      actorRole: UserRole.VOLUNTEER,
      actorName: req.user.name,
      timestamp: new Date(),
    },
  ];

  let verificationData = undefined;
  if (data.immediateVerification) {
    timeline.push({
      status: ComplaintStatus.VERIFIED,
      message: `On-site field verification performed during registration: ${data.verificationNotes || "Field incident validated and authentic."}`,
      actorId: req.user._id,
      actorRole: UserRole.VOLUNTEER,
      actorName: req.user.name,
      timestamp: new Date(),
    });

    verificationData = {
      verifiedBy: req.user._id,
      verifiedByName: req.user.name,
      verifiedBadge: volunteerBadge,
      verifiedAt: new Date(),
      result: FieldVerificationResult.VERIFIED,
      notes: data.verificationNotes || "On-site field verification confirmed during grievance intake.",
      checklist: {
        citizenIdentified: true,
        incidentConfirmed: true,
        evidenceValid: true,
        severityMatches: true,
      },
      coordinates: {
        latitude: data.latitude,
        longitude: data.longitude,
      },
      photos: evidence,
    };
  }

  const complaint = await Complaint.create({
    complaintNumber,
    citizenId: citizen._id,
    citizenName: citizen.name,
    citizenPhone: citizen.phone,
    title: data.title,
    description: data.description,
    category: data.category,
    department: normalizedDepartment,
    departmentCode: departmentCode as "ROAD" | "ELECTRICITY" | "WATER",
    status: initialStatus,
    priority,
    source: ComplaintSource.VOLUNTEER_ASSISTED,
    registeredBy: req.user._id,
    assignedVolunteerId: req.user._id,
    location: {
      village: data.village,
      ward: data.ward,
      mandal: data.mandal,
      district: data.district,
      pincode: data.pincode || undefined,
      addressLine: data.addressLine,
      coordinates:
        data.latitude !== undefined && data.longitude !== undefined
          ? { latitude: data.latitude, longitude: data.longitude }
          : undefined,
    },
    evidence,
    timeline,
    verification: verificationData,
    sla: {
      targetResolutionDate: slaTarget,
      isBreached: false,
    },
  });

  logger.info(`[Volunteer] Filed assisted complaint ${complaintNumber} by ${req.user.name}`);
  res.status(201).json(buildSuccess(complaint, "Assisted grievance registered successfully"));
}

/**
 * 4. Get volunteer work queue and cluster overview stats
 */
export async function getWorkQueue(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json(buildError("UNAUTHORIZED", "Authentication required"));
    return;
  }

  const assignedVillage = req.user.volunteerProfile?.assignedVillage || "";
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const skip = (page - 1) * limit;

  const statusFilter = req.query.status as string | undefined;
  const priorityFilter = req.query.priority as string | undefined;
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const tab = req.query.tab as string | undefined; // "verifications", "cluster", "registered"

  // Base cluster filter matching volunteer
  const clusterConditions: Record<string, unknown>[] = [
    { assignedVolunteerId: req.user._id },
    { registeredBy: req.user._id },
  ];
  if (assignedVillage) {
    clusterConditions.push({ "location.village": { $regex: `^${assignedVillage}$`, $options: "i" } });
  }

  const filter: Record<string, unknown> = {
    $or: clusterConditions,
  };

  if (tab === "verifications") {
    filter.status = { $in: [ComplaintStatus.SUBMITTED, ComplaintStatus.VERIFICATION_REQUIRED] };
  } else if (statusFilter && statusFilter !== "ALL") {
    filter.status = statusFilter;
  }

  if (priorityFilter && priorityFilter !== "ALL") {
    filter.priority = priorityFilter;
  }

  if (search) {
    filter.$and = [
      {
        $or: [
          { complaintNumber: { $regex: search, $options: "i" } },
          { title: { $regex: search, $options: "i" } },
          { citizenName: { $regex: search, $options: "i" } },
          { citizenPhone: { $regex: search } },
        ],
      },
    ];
  }

  const [complaints, total] = await Promise.all([
    Complaint.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Complaint.countDocuments(filter),
  ]);

  // Compute cluster KPI stats
  const [
    totalCluster,
    pendingVerification,
    verifiedCount,
    resolvedCount,
    urgentCount,
    registeredCitizens,
  ] = await Promise.all([
    Complaint.countDocuments({ $or: clusterConditions }),
    Complaint.countDocuments({
      $or: clusterConditions,
      status: { $in: [ComplaintStatus.SUBMITTED, ComplaintStatus.VERIFICATION_REQUIRED] },
    }),
    Complaint.countDocuments({
      $or: clusterConditions,
      status: ComplaintStatus.VERIFIED,
    }),
    Complaint.countDocuments({
      $or: clusterConditions,
      status: { $in: [ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED] },
    }),
    Complaint.countDocuments({
      $or: clusterConditions,
      priority: { $in: [Priority.CRITICAL, Priority.HIGH] },
    }),
    User.countDocuments({
      role: UserRole.CITIZEN,
      ...(assignedVillage ? { "citizenProfile.village": { $regex: `^${assignedVillage}$`, $options: "i" } } : {}),
    }),
  ]);

  res.json(
    buildSuccess({
      complaints,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        totalCluster,
        pendingVerification,
        verifiedCount,
        resolvedCount,
        urgentCount,
        registeredCitizens,
        assignedVillage: assignedVillage || "Rampura",
        assignedWard: req.user.volunteerProfile?.assignedWard || "Ward 4",
      },
    })
  );
}

/**
 * 5. Submit on-site field verification for a grievance
 */
export async function submitFieldVerification(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json(buildError("UNAUTHORIZED", "Authentication required"));
    return;
  }

  const complaintId = req.params.id;
  const complaint = await Complaint.findById(complaintId);
  if (!complaint) {
    res.status(404).json(buildError("NOT_FOUND", "Complaint not found"));
    return;
  }

  const vp = req.user.volunteerProfile;
  const sameDistrict = !vp?.district || !complaint.location?.district || vp.district.toLowerCase() === complaint.location.district.toLowerCase();
  const sameVillage = !vp?.assignedVillage || !complaint.location?.village || vp.assignedVillage.toLowerCase() === complaint.location.village.toLowerCase();
  const sameWard = !vp?.assignedWard || !complaint.location?.ward || vp.assignedWard.toLowerCase() === complaint.location.ward.toLowerCase();
  if (!sameDistrict || (!sameVillage && !sameWard)) {
    await logAuditEvent({ entityType:"COMPLAINT", entityId:complaint._id.toString(), complaintNumber:complaint.complaintNumber, action:"STATUS_TRANSITION", actor:{id:req.user._id.toString(),name:req.user.name,role:req.user.role,phone:req.user.phone,email:req.user.email,ipAddress:req.ip}, notes:"Blocked volunteer verification outside assigned jurisdiction" });
    res.status(403).json(buildError("VOLUNTEER_JURISDICTION_VIOLATION", "This grievance is outside your assigned village/ward jurisdiction"));
    return;
  }

  const parseResult = fieldVerificationSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json(buildError("VALIDATION_ERROR", "Invalid field verification data", parseResult.error.flatten().fieldErrors));
    return;
  }

  const data = parseResult.data;
  const files = (req.files as Express.Multer.File[]) || [];
  const photos: IEvidenceSubdocument[] = files.map((file) => ({
    fileName: file.originalname,
    fileUrl: `/uploads/evidence/${file.filename}`,
    fileType: file.mimetype,
    fileSize: file.size,
    uploadedAt: new Date(),
  }));

  // Append new photos to complaint evidence as well
  if (photos.length > 0) {
    complaint.evidence.push(...photos);
  }

  let nextStatus: ComplaintStatus = ComplaintStatus.VERIFIED;
  if (data.result === FieldVerificationResult.REJECTED) {
    nextStatus = ComplaintStatus.REJECTED;
  } else if (data.result === FieldVerificationResult.REQUIRES_INFO) {
    nextStatus = ComplaintStatus.INFORMATION_REQUIRED;
  }

  const volunteerBadge = req.user.volunteerProfile?.volunteerId || "VOL-FIELD";

  // Update verification subdocument
  complaint.verification = {
    verifiedBy: req.user._id,
    verifiedByName: req.user.name,
    verifiedBadge: volunteerBadge,
    verifiedAt: new Date(),
    result: data.result,
    notes: data.notes,
    checklist: {
      citizenIdentified: data.citizenIdentified,
      incidentConfirmed: data.incidentConfirmed,
      evidenceValid: data.evidenceValid,
      severityMatches: data.severityMatches,
    },
    coordinates:
      data.latitude !== undefined && data.longitude !== undefined
        ? { latitude: data.latitude, longitude: data.longitude }
        : undefined,
    photos,
  };

  complaint.assignedVolunteerId = req.user._id;
  await complaint.save();

  const target = data.result === FieldVerificationResult.REQUIRES_INFO ? complaint.status : nextStatus;
  if (target !== complaint.status) {
    try {
      await transitionComplaintStatus(complaint._id.toString(), {
        newStatus: target, remarks: `Field verification result: ${data.result}. ${data.notes}`,
        actor: { id:req.user._id.toString(), name:req.user.name, role:UserRole.VOLUNTEER, phone:req.user.phone, email:req.user.email, ipAddress:req.ip },
      });
    } catch (err) {
      if (err instanceof LifecycleError) {
        res.status(400).json(buildError(err.code, err.message));
        return;
      }
      throw err;
    }
  } else {
    complaint.timeline.push({ status: complaint.status, message:`Volunteer verification requires additional information: ${data.notes}`, actorId:req.user._id, actorRole:UserRole.VOLUNTEER, actorName:req.user.name, timestamp:new Date() });
    await complaint.save();
  }
  logger.info(`[Volunteer] Verified complaint ${complaint.complaintNumber} with result ${data.result}`);

  res.json(buildSuccess(complaint, "Field verification recorded successfully"));
}

/**
 * 6. Volunteer AI Assistant Helper
 * Structures rough colloquial statements into clean, formal government grievances
 */
export async function assistantHelper(req: Request, res: Response): Promise<void> {
  const { citizenStatement, village } = req.body;
  if (!citizenStatement || typeof citizenStatement !== "string" || citizenStatement.trim().length < 5) {
    res.status(400).json(buildError("VALIDATION_ERROR", "Citizen statement of at least 5 characters is required"));
    return;
  }

  const statement = citizenStatement.trim().toLowerCase();
  const villageName = village || req.user?.volunteerProfile?.assignedVillage || "Village";

  let category = "General Citizen Grievance";
  let department: string = GovernmentDepartments[0];
  let priority: Priority = Priority.MEDIUM;
  const missingInfo: string[] = [];

  if (statement.match(/water|tap|pipe|tank|borewell|drinking|leak/)) {
    category = "Drinking Water Supply";
    department = "Water Supply";
    priority = statement.match(/stopped|contaminated|poison|foul|dirty|sewage/) ? Priority.HIGH : Priority.MEDIUM;
    missingInfo.push("Specify nearest public tap number, street name, or overhead tank landmark.");
    missingInfo.push("Verify if the water supply is completely halted or has low pressure/bad smell.");
    missingInfo.push("Estimate how many households or streets are currently impacted.");
  } else if (statement.match(/light|dark|pole|wire|spark|current|power|electricity|transformer/)) {
    category = "Electricity & Power Supply";
    department = "Electricity & Power";
    priority = statement.match(/wire|spark|hanging|shock|fire/) ? Priority.CRITICAL : Priority.HIGH;
    missingInfo.push("Record the electricity pole number or transformer code if visible.");
    missingInfo.push("Check if there are any broken or exposed live wires posing an urgent hazard.");
    missingInfo.push("State whether this is an individual house fault or an entire street blackout.");
  } else if (statement.match(/road|pothole|tar|mud|bridge|path|culvert|accident/)) {
    category = "Roads & Infrastructure";
    department = "Roads & Transport";
    priority = statement.match(/accident|collapsed|blocked/) ? Priority.HIGH : Priority.MEDIUM;
    missingInfo.push("Identify the start and end landmark of the damaged road stretch.");
    missingInfo.push("Check if emergency vehicles (ambulances, school buses) are able to pass.");
    missingInfo.push("Upload at least two clear ground photos showing pothole depth.");
  } else if (statement.match(/drain|sewage|garbage|trash|smell|gutter|mosquito|sanitation/)) {
    category = "Drainage & Sanitation";
    department = "Roads & Transport";
    priority = statement.match(/overflow|house|fever|dengue/) ? Priority.HIGH : Priority.MEDIUM;
    missingInfo.push("Identify whether the drain is completely choked with plastic or silt.");
    missingInfo.push("Confirm if contaminated water is back-flowing into homes or schools.");
  } else if (statement.match(/ration|rice|dealer|shop|sugar|kerosene|pds|quota/)) {
    category = "PDS & Ration Supplies";
    department = "Food & Civil Supplies";
    priority = Priority.MEDIUM;
    missingInfo.push("Record citizen's Ration Card Number or Rice Card ID.");
    missingInfo.push("Identify the Fair Price Shop (FPS) number or dealer name.");
  } else if (statement.match(/pension|widow|old age|disability|yojana|scheme|payment/)) {
    category = "Social Welfare & Pensions";
    department = "Social Welfare Department";
    priority = Priority.MEDIUM;
    missingInfo.push("Record the citizen's Pension Beneficiary ID / Aadhaar number.");
    missingInfo.push("Mention the month and year from which the disbursement was stopped.");
  } else {
    missingInfo.push("Obtain exact address and nearest known landmark in the village.");
    missingInfo.push("Clarify the specific relief or outcome expected by the citizen.");
  }

  const structuredTitle = `${category} issue reported at ${villageName}`;
  const formalDescription = `Citizen Verbal Statement: "${citizenStatement.trim()}"\n\nVolunteer Assisted Assessment:\nThe citizen reports a persistent concern regarding ${category} in ${villageName}. On preliminary inquiry, immediate administrative attention from the ${department} is requested to resolve the disruption and prevent hardship to village residents.`;

  res.json(
    buildSuccess({
      title: structuredTitle,
      formalDescription,
      suggestedCategory: category,
      suggestedDepartment: department,
      suggestedPriority: priority,
      missingInformation: missingInfo,
      suggestedQuestions: [
        "How long has this issue persisted?",
        "Has any prior complaint or petition been submitted?",
        "Are there vulnerable residents (elderly, infants) affected?",
      ],
    })
  );
}
