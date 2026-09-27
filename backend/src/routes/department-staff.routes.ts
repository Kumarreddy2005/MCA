import { Router } from "express";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import { UserRole } from "../types/domain.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getStaffQueue, updateStaffStatus, addStaffAction } from "../controllers/department-staff.controller.js";

export const departmentStaffRouter=Router();
departmentStaffRouter.use(authenticate, authorize(UserRole.DEPARTMENT_STAFF, UserRole.ADMIN));
departmentStaffRouter.get("/queue", asyncHandler(getStaffQueue));
departmentStaffRouter.patch("/complaints/:id/status", asyncHandler(updateStaffStatus));
departmentStaffRouter.post("/complaints/:id/actions", asyncHandler(addStaffAction));
