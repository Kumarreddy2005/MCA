import { Router } from "express";
import { healthRouter } from "./health.routes.js";
import { authRouter } from "./auth.routes.js";
import { complaintRouter } from "./complaint.routes.js";
import { volunteerRouter } from "./volunteer.routes.js";
import { notificationRouter } from "./notification.routes.js";
import { auditRouter } from "./audit.routes.js";
import { officialRouter } from "./official.routes.js";
import { slaRouter } from "./sla.routes.js";
import { aiRouter } from "./ai.routes.js";
import { genaiRouter } from "./genai.routes.js";
import { ragRouter } from "./rag.routes.js";
import { adminRouter } from "./admin.routes.js";
import { analyticsRouter } from "./analytics.routes.js";
import { departmentStaffRouter } from "./department-staff.routes.js";

export const apiRouter = Router();

// Health
apiRouter.use(healthRouter);

// Auth routes — Phase 1
apiRouter.use("/auth", authRouter);

// Complaint & Citizen routes — Phase 2 & Phase 4
apiRouter.use("/complaints", complaintRouter);

// Volunteer routes — Phase 3
apiRouter.use("/volunteers", volunteerRouter);

// Notifications — Phase 4
apiRouter.use("/notifications", notificationRouter);

// Audit trails — Phase 4
apiRouter.use("/audit", auditRouter);

// Official routes — Phase 5
apiRouter.use("/officials", officialRouter);

// SLA routes — Phase 6
apiRouter.use("/sla", slaRouter);

// AI routes — Phase 7
apiRouter.use("/ai", aiRouter);

// GenAI routes — Phase 8
apiRouter.use("/genai", genaiRouter);

// RAG routes — Phase 9
apiRouter.use("/rag", ragRouter);

// Admin routes — Phase 10
apiRouter.use("/admin", adminRouter);

// Analytics routes — Phase 11
apiRouter.use("/analytics", analyticsRouter);
apiRouter.use("/department-staff", departmentStaffRouter);

