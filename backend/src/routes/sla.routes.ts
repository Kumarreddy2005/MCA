import { Router } from "express";
import {
  escalateComplaintHandler,
  getAtRiskAndBreachedQueue,
  getSlaAnalyticsHandler,
  triggerSlaEvaluationSweep,
} from "../controllers/sla.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import { UserRole } from "../types/domain.js";

export const slaRouter = Router();

// Guarded: only OFFICIAL and ADMIN can monitor and manage SLAs
slaRouter.use(authenticate);
slaRouter.use(authorize(UserRole.OFFICIAL, UserRole.ADMIN));

// 1. SLA Analytics & Metrics
slaRouter.get("/analytics", getSlaAnalyticsHandler);

// 2. Breached and At-Risk Queue
slaRouter.get("/queue", getAtRiskAndBreachedQueue);

// 3. Trigger Automated SLA Evaluation Sweep
slaRouter.post("/sweep", triggerSlaEvaluationSweep);

// 4. Manually Escalate Complaint Tier
slaRouter.post("/complaints/:id/escalate", escalateComplaintHandler);
