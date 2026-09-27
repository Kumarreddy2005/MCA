import { Router } from "express";
import { getComplaintAuditLogs } from "../controllers/audit.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const auditRouter = Router();

auditRouter.use(authenticate);

auditRouter.get("/complaints/:id", asyncHandler(getComplaintAuditLogs));
