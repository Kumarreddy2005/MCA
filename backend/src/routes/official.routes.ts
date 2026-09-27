import { Router } from "express";
import {
  getOfficialDashboardMetrics,
  getOfficialWorkQueue,
  resolveComplaintWithProof,
  rejectComplaintWithReason,
  transferComplaintDepartment,
  escalateComplaint,
} from "../controllers/official.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import { requireOfficialDepartment } from "../middlewares/department-isolation.middleware.js";
import { uploadEvidence } from "../middlewares/upload.middleware.js";
import { UserRole } from "../types/domain.js";

export const officialRouter = Router();

// Official routes guarded: only OFFICIAL or ADMIN
officialRouter.use(authenticate);
officialRouter.use(authorize(UserRole.OFFICIAL, UserRole.ADMIN));

// 1. Departmental Metrics & Work Queue
officialRouter.get("/metrics", getOfficialDashboardMetrics);
officialRouter.get("/queue", getOfficialWorkQueue);

// 2. Official Action Workflows (Guarded by Department Isolation)
officialRouter.post(
  "/complaints/:id/resolve",
  requireOfficialDepartment,
  uploadEvidence.array("photos", 5),
  resolveComplaintWithProof
);

officialRouter.post(
  "/complaints/:id/reject",
  requireOfficialDepartment,
  rejectComplaintWithReason
);

officialRouter.post(
  "/complaints/:id/transfer",
  requireOfficialDepartment,
  transferComplaintDepartment
);

officialRouter.post(
  "/complaints/:id/escalate",
  requireOfficialDepartment,
  escalateComplaint
);
