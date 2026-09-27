import { Router } from "express";
import {
  getAdminStats,
  listUsers,
  getUserById,
  createUser,
  updateUser,
  updateUserStatus,
  listDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  updateDepartmentSla,
  listVolunteers,
  updateVolunteerJurisdiction,
  listOfficials,
  updateOfficialAssignment,
  listAuditLogs,
} from "../controllers/admin.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import { UserRole } from "../types/domain.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const adminRouter = Router();

// Strict RBAC: All administrator routes require authentication and UserRole.ADMIN
adminRouter.use(authenticate);
adminRouter.use(authorize(UserRole.ADMIN));

// Overview stats
adminRouter.get("/stats", asyncHandler(getAdminStats));

// User Lifecycle Management
adminRouter.get("/users", asyncHandler(listUsers));
adminRouter.post("/users", asyncHandler(createUser));
adminRouter.get("/users/:id", asyncHandler(getUserById));
adminRouter.patch("/users/:id", asyncHandler(updateUser));
adminRouter.patch("/users/:id/status", asyncHandler(updateUserStatus));

// Karnataka Department & SLA Configuration
adminRouter.get("/departments", asyncHandler(listDepartments));
adminRouter.post("/departments", asyncHandler(createDepartment));
adminRouter.get("/departments/:id", asyncHandler(getDepartment));
adminRouter.patch("/departments/:id", asyncHandler(updateDepartment));
adminRouter.patch("/departments/:id/sla", asyncHandler(updateDepartmentSla));

// Volunteer Jurisdictions
adminRouter.get("/volunteers", asyncHandler(listVolunteers));
adminRouter.patch("/volunteers/:id/jurisdiction", asyncHandler(updateVolunteerJurisdiction));

// Official Hierarchy & Assignments
adminRouter.get("/officials", asyncHandler(listOfficials));
adminRouter.patch("/officials/:id/assignment", asyncHandler(updateOfficialAssignment));

// Cross-System Audit Explorer
adminRouter.get("/audit", asyncHandler(listAuditLogs));
