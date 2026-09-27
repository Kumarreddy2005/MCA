import { Router } from "express";
import {
  getOverviewStats,
  getDepartmentPerformance,
  getTrends,
  getCategoryBreakdown,
  getGeographicIntelligence,
  getVolunteerMetrics,
  getAiIntelligenceMetrics,
  exportComplaintsCsv,
  getExecutiveReport,
} from "../controllers/analytics.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import { UserRole } from "../types/domain.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const analyticsRouter = Router();

// Strict RBAC: Analytics is restricted to authorized Government Officials and Administrators
analyticsRouter.use(authenticate);
analyticsRouter.use(authorize(UserRole.OFFICIAL, UserRole.ADMIN));

// Overview KPIs
analyticsRouter.get("/overview", asyncHandler(getOverviewStats));

// Operational department Performance Matrix
analyticsRouter.get("/departments", asyncHandler(getDepartmentPerformance));

// Temporal Trends
analyticsRouter.get("/trends", asyncHandler(getTrends));

// Category & Priority Breakdown
analyticsRouter.get("/categories", asyncHandler(getCategoryBreakdown));

// Geographic Intelligence & Spatial Hotspots (Zero-PII)
analyticsRouter.get("/geo", asyncHandler(getGeographicIntelligence));

// Volunteer Field Operations
analyticsRouter.get("/volunteers", asyncHandler(getVolunteerMetrics));

// AI Model & NLP Intelligence Accuracy
analyticsRouter.get("/ai", asyncHandler(getAiIntelligenceMetrics));

// Data Exports & Strategic Reporting
analyticsRouter.get("/export/csv", asyncHandler(exportComplaintsCsv));
analyticsRouter.get("/export/report", asyncHandler(getExecutiveReport));
