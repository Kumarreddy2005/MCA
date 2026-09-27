/**
 * VCGIS Administrator Controller (Phase 10)
 * Handles administration endpoints for User Management,
 * Departments & SLA Configuration, Volunteer/Official Jurisdictions,
 * and System Audit Trail Explorer.
 */

import { Request, Response } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { adminService, AdminActor } from "../services/admin.service.js";
import { UserRole } from "../types/domain.js";
import { AuditAction } from "../models/audit-log.model.js";
import { buildSuccess, buildError } from "../utils/apiResponse.js";

// Helper to extract actor from authenticated admin request
function getAdminActor(req: Request): AdminActor {
  return {
    id: req.user?._id ? (req.user._id as mongoose.Types.ObjectId).toString() : "ADMIN",
    name: req.user?.name || "Administrator",
    role: (req.user?.role as UserRole) || UserRole.ADMIN,
    email: req.user?.email,
    phone: req.user?.phone,
  };
}

// ─── Zod Schemas ──────────────────────────────────────────────

const createUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email format").optional(),
  phone: z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
  role: z.nativeEnum(UserRole),
  citizenProfile: z
    .object({
      address: z.string().optional(),
      village: z.string().optional(),
      ward: z.string().optional(),
      district: z.string().optional(),
      pincode: z.string().optional(),
    })
    .optional(),
  volunteerProfile: z
    .object({
      volunteerId: z.string().optional(),
      assignedVillage: z.string(),
      assignedWard: z.string(),
      assignedPanchayat: z.string().optional(),
      district: z.string(),
    })
    .optional(),
  officialProfile: z
    .object({
      department: z.string(),
      departmentCode: z.enum(["ROAD", "ELECTRICITY", "WATER"]).optional(),
      designation: z.string(),
      jurisdictionDistrict: z.string(),
      jurisdictionTaluk: z.string().optional(),
    })
    .optional(),
  adminProfile: z
    .object({
      superAdmin: z.boolean().default(false),
      permissions: z.array(z.string()).default([]),
    })
    .optional(),
});

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().regex(/^\d{10}$/).optional(),
  role: z.nativeEnum(UserRole).optional(),
  citizenProfile: z.record(z.unknown()).optional(),
  volunteerProfile: z.record(z.unknown()).optional(),
  officialProfile: z.record(z.unknown()).optional(),
  adminProfile: z.record(z.unknown()).optional(),
});

const updateStatusSchema = z.object({
  isActive: z.boolean(),
});

const updateDepartmentSlaSchema = z.object({
  criticalHours: z.number().positive(),
  highHours: z.number().positive(),
  mediumHours: z.number().positive(),
  lowHours: z.number().positive(),
});

const updateVolunteerJurisdictionSchema = z.object({
  assignedVillage: z.string().min(1, "Assigned village is required"),
  assignedWard: z.string().min(1, "Assigned ward is required"),
  assignedPanchayat: z.string().optional(),
  district: z.string().min(1, "District is required"),
});

const updateOfficialAssignmentSchema = z.object({
  department: z.string().min(1, "Department is required"),
  departmentCode: z.enum(["ROAD", "ELECTRICITY", "WATER"]).optional(),
  designation: z.string().min(1, "Designation is required"),
  jurisdictionDistrict: z.string().min(1, "Jurisdiction district is required"),
  jurisdictionTaluk: z.string().optional(),
});

// ─── Controller Functions ─────────────────────────────────────

/**
 * GET /api/admin/stats
 * Overview metrics for Administrator Dashboard
 */
export async function getAdminStats(_req: Request, res: Response): Promise<void> {
  const stats = await adminService.getSystemStats();
  res.status(200).json(buildSuccess(stats, "System statistics retrieved successfully"));
}

/**
 * GET /api/admin/users
 * Paginated list of users with filtering
 */
export async function listUsers(req: Request, res: Response): Promise<void> {
  const { role, isActive, department, search, page, limit } = req.query;

  const result = await adminService.listUsers({
    role: typeof role === "string" ? role : undefined,
    isActive: typeof isActive === "string" ? isActive === "true" : undefined,
    department: typeof department === "string" ? department : undefined,
    search: typeof search === "string" ? search : undefined,
    page: typeof page === "string" ? parseInt(page, 10) : 1,
    limit: typeof limit === "string" ? parseInt(limit, 10) : 20,
  });

  res.status(200).json(buildSuccess(result, "Users retrieved successfully"));
}

/**
 * GET /api/admin/users/:id
 * Retrieve single user
 */
export async function getUserById(req: Request, res: Response): Promise<void> {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json(buildError("INVALID_ID", "A valid User ID is required"));
    return;
  }

  const user = await adminService.getUserById(id);
  if (!user) {
    res.status(404).json(buildError("USER_NOT_FOUND", "User not found"));
    return;
  }

  res.status(200).json(buildSuccess(user, "User details retrieved successfully"));
}

/**
 * POST /api/admin/users
 * Provision or create a new user account
 */
export async function createUser(req: Request, res: Response): Promise<void> {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(buildError("VALIDATION_ERROR", "Invalid user payload", parsed.error.flatten().fieldErrors));
    return;
  }

  const actor = getAdminActor(req);

  try {
    const user = await adminService.createUser(parsed.data, actor);
    res.status(201).json(buildSuccess(user, "User created successfully"));
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to create user";
    res.status(409).json(buildError("USER_CREATE_FAILED", msg));
  }
}

/**
 * PATCH /api/admin/users/:id
 * Update user details, role, or profile
 */
export async function updateUser(req: Request, res: Response): Promise<void> {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json(buildError("INVALID_ID", "A valid User ID is required"));
    return;
  }

  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(buildError("VALIDATION_ERROR", "Invalid update payload", parsed.error.flatten().fieldErrors));
    return;
  }

  const actor = getAdminActor(req);
  const updatedUser = await adminService.updateUser(id, parsed.data, actor);

  if (!updatedUser) {
    res.status(404).json(buildError("USER_NOT_FOUND", "User not found"));
    return;
  }

  res.status(200).json(buildSuccess(updatedUser, "User updated successfully"));
}

/**
 * PATCH /api/admin/users/:id/status
 * Activate or deactivate user
 */
export async function updateUserStatus(req: Request, res: Response): Promise<void> {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json(buildError("INVALID_ID", "A valid User ID is required"));
    return;
  }

  const parsed = updateStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(buildError("VALIDATION_ERROR", "isActive boolean required", parsed.error.flatten().fieldErrors));
    return;
  }

  const actor = getAdminActor(req);
  const updatedUser = await adminService.updateUserStatus(id, parsed.data.isActive, actor);

  if (!updatedUser) {
    res.status(404).json(buildError("USER_NOT_FOUND", "User not found"));
    return;
  }

  res.status(200).json(
    buildSuccess(
      updatedUser,
      `User account ${parsed.data.isActive ? "activated" : "deactivated"} successfully`
    )
  );
}

// ─── Department Handlers ──────────────────────────────────────

/**
 * GET /api/admin/departments
 * List all departments
 */
export async function listDepartments(_req: Request, res: Response): Promise<void> {
  const departments = await adminService.listDepartments();
  res.status(200).json(buildSuccess(departments, "Departments retrieved successfully"));
}

/**
 * GET /api/admin/departments/:id
 * Get department by ID or Code
 */
export async function getDepartment(req: Request, res: Response): Promise<void> {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!id) {
    res.status(400).json(buildError("ID_REQUIRED", "Department ID or Code is required"));
    return;
  }

  const dept = await adminService.getDepartment(id);
  if (!dept) {
    res.status(404).json(buildError("DEPT_NOT_FOUND", "Department not found"));
    return;
  }

  res.status(200).json(buildSuccess(dept, "Department details retrieved successfully"));
}

/**
 * POST /api/admin/departments
 * Create a new department
 */
export async function createDepartment(req: Request, res: Response): Promise<void> {
  const actor = getAdminActor(req);
  try {
    const department = await adminService.createDepartment(req.body, actor);
    res.status(201).json(buildSuccess(department, "Department created successfully"));
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to create department";
    res.status(400).json(buildError("DEPARTMENT_CREATE_FAILED", msg));
  }
}

/**
 * PATCH /api/admin/departments/:id
 * Update department details, categories, or active status
 */
export async function updateDepartment(req: Request, res: Response): Promise<void> {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json(buildError("INVALID_ID", "A valid Department ID is required"));
    return;
  }

  const actor = getAdminActor(req);
  const updatedDept = await adminService.updateDepartment(id, req.body, actor);

  if (!updatedDept) {
    res.status(404).json(buildError("DEPT_NOT_FOUND", "Department not found"));
    return;
  }

  res.status(200).json(buildSuccess(updatedDept, "Department updated successfully"));
}

/**
 * PATCH /api/admin/departments/:id/sla
 * Update department SLA resolution configurations
 */
export async function updateDepartmentSla(req: Request, res: Response): Promise<void> {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json(buildError("INVALID_ID", "A valid Department ID is required"));
    return;
  }

  const parsed = updateDepartmentSlaSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(buildError("VALIDATION_ERROR", "Invalid SLA parameters", parsed.error.flatten().fieldErrors));
    return;
  }

  const actor = getAdminActor(req);
  const updatedDept = await adminService.updateDepartmentSla(id, parsed.data, actor);

  if (!updatedDept) {
    res.status(404).json(buildError("DEPT_NOT_FOUND", "Department not found"));
    return;
  }

  res.status(200).json(buildSuccess(updatedDept, "Department SLA thresholds updated successfully"));
}

// ─── Volunteer Handlers ───────────────────────────────────────

/**
 * GET /api/admin/volunteers
 * List volunteers with cluster jurisdictions & metrics
 */
export async function listVolunteers(req: Request, res: Response): Promise<void> {
  const { district, village, ward, search, page, limit } = req.query;

  const result = await adminService.listVolunteers({
    district: typeof district === "string" ? district : undefined,
    village: typeof village === "string" ? village : undefined,
    ward: typeof ward === "string" ? ward : undefined,
    search: typeof search === "string" ? search : undefined,
    page: typeof page === "string" ? parseInt(page, 10) : 1,
    limit: typeof limit === "string" ? parseInt(limit, 10) : 20,
  });

  res.status(200).json(buildSuccess(result, "Volunteers retrieved successfully"));
}

/**
 * PATCH /api/admin/volunteers/:id/jurisdiction
 * Reassign volunteer jurisdiction
 */
export async function updateVolunteerJurisdiction(req: Request, res: Response): Promise<void> {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json(buildError("INVALID_ID", "A valid Volunteer ID is required"));
    return;
  }

  const parsed = updateVolunteerJurisdictionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(buildError("VALIDATION_ERROR", "Invalid jurisdiction parameters", parsed.error.flatten().fieldErrors));
    return;
  }

  const actor = getAdminActor(req);
  const updatedUser = await adminService.updateVolunteerJurisdiction(id, parsed.data, actor);

  if (!updatedUser) {
    res.status(404).json(buildError("VOLUNTEER_NOT_FOUND", "Volunteer not found"));
    return;
  }

  res.status(200).json(buildSuccess(updatedUser, "Volunteer jurisdiction updated successfully"));
}

// ─── Official Handlers ────────────────────────────────────────

/**
 * GET /api/admin/officials
 * List department officials with assignments
 */
export async function listOfficials(req: Request, res: Response): Promise<void> {
  const { department, district, taluk, search, page, limit } = req.query;

  const result = await adminService.listOfficials({
    department: typeof department === "string" ? department : undefined,
    district: typeof district === "string" ? district : undefined,
    taluk: typeof taluk === "string" ? taluk : undefined,
    search: typeof search === "string" ? search : undefined,
    page: typeof page === "string" ? parseInt(page, 10) : 1,
    limit: typeof limit === "string" ? parseInt(limit, 10) : 20,
  });

  res.status(200).json(buildSuccess(result, "Officials retrieved successfully"));
}

/**
 * PATCH /api/admin/officials/:id/assignment
 * Reassign official department, designation, and jurisdiction
 */
export async function updateOfficialAssignment(req: Request, res: Response): Promise<void> {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json(buildError("INVALID_ID", "A valid Official ID is required"));
    return;
  }

  const parsed = updateOfficialAssignmentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(buildError("VALIDATION_ERROR", "Invalid assignment parameters", parsed.error.flatten().fieldErrors));
    return;
  }

  const actor = getAdminActor(req);
  const updatedUser = await adminService.updateOfficialAssignment(id, parsed.data, actor);

  if (!updatedUser) {
    res.status(404).json(buildError("OFFICIAL_NOT_FOUND", "Official not found"));
    return;
  }

  res.status(200).json(buildSuccess(updatedUser, "Official assignment updated successfully"));
}

// ─── System Audit Explorer Handlers ───────────────────────────

/**
 * GET /api/admin/audit
 * Cross-system audit log explorer
 */
export async function listAuditLogs(req: Request, res: Response): Promise<void> {
  const { entityType, action, actorRole, startDate, endDate, search, page, limit } = req.query;

  const result = await adminService.listAuditLogs({
    entityType:
      typeof entityType === "string"
        ? (entityType as "COMPLAINT" | "USER" | "DEPARTMENT" | "SYSTEM")
        : undefined,
    action: typeof action === "string" ? (action as AuditAction) : undefined,
    actorRole: typeof actorRole === "string" ? actorRole : undefined,
    startDate: typeof startDate === "string" ? startDate : undefined,
    endDate: typeof endDate === "string" ? endDate : undefined,
    search: typeof search === "string" ? search : undefined,
    page: typeof page === "string" ? parseInt(page, 10) : 1,
    limit: typeof limit === "string" ? parseInt(limit, 10) : 30,
  });

  res.status(200).json(buildSuccess(result, "Audit logs retrieved successfully"));
}
