/**
 * VCGIS Analytics Controller (Phase 11)
 * Serves aggregated analytics, GIS spatial intelligence,
 * department performance rankings, CSV downloads, and executive digests.
 */

import { Request, Response } from "express";
import { analyticsService, AnalyticsFilter } from "../services/analytics.service.js";
import { buildSuccess } from "../utils/apiResponse.js";

function parseAnalyticsFilter(req: Request): AnalyticsFilter {
  const { department, district, priority, status, startDate, endDate } = req.query;

  return {
    department: typeof department === "string" ? department : undefined,
    district: typeof district === "string" ? district : undefined,
    priority: typeof priority === "string" ? priority : undefined,
    status: typeof status === "string" ? status : undefined,
    startDate: typeof startDate === "string" ? startDate : undefined,
    endDate: typeof endDate === "string" ? endDate : undefined,
  };
}

/**
 * GET /api/analytics/overview
 */
export async function getOverviewStats(req: Request, res: Response): Promise<void> {
  const filter = parseAnalyticsFilter(req);
  const data = await analyticsService.getOverviewStats(filter);
  res.status(200).json(buildSuccess(data, "Overview statistics retrieved successfully"));
}

/**
 * GET /api/analytics/departments
 */
export async function getDepartmentPerformance(req: Request, res: Response): Promise<void> {
  const filter = parseAnalyticsFilter(req);
  const data = await analyticsService.getDepartmentPerformance(filter);
  res.status(200).json(buildSuccess(data, "Department performance ranking retrieved successfully"));
}

/**
 * GET /api/analytics/trends
 */
export async function getTrends(req: Request, res: Response): Promise<void> {
  const filter = parseAnalyticsFilter(req);
  const interval = req.query.interval === "weekly" || req.query.interval === "monthly" ? req.query.interval : "daily";
  const data = await analyticsService.getTrends(filter, interval);
  res.status(200).json(buildSuccess(data, "Trends retrieved successfully"));
}

/**
 * GET /api/analytics/categories
 */
export async function getCategoryBreakdown(req: Request, res: Response): Promise<void> {
  const filter = parseAnalyticsFilter(req);
  const data = await analyticsService.getCategoryAndPriorityBreakdown(filter);
  res.status(200).json(buildSuccess(data, "Category & priority breakdown retrieved successfully"));
}

/**
 * GET /api/analytics/geo
 * Geographic coordinates and spatial hotspot clusters
 */
export async function getGeographicIntelligence(req: Request, res: Response): Promise<void> {
  const filter = parseAnalyticsFilter(req);
  const data = await analyticsService.getGeographicIntelligence(filter);
  res.status(200).json(buildSuccess(data, "Geographic intelligence data retrieved successfully"));
}

/**
 * GET /api/analytics/volunteers
 */
export async function getVolunteerMetrics(req: Request, res: Response): Promise<void> {
  const filter = parseAnalyticsFilter(req);
  const data = await analyticsService.getVolunteerMetrics(filter);
  res.status(200).json(buildSuccess(data, "Volunteer performance metrics retrieved successfully"));
}

/**
 * GET /api/analytics/ai
 */
export async function getAiIntelligenceMetrics(_req: Request, res: Response): Promise<void> {
  const data = await analyticsService.getAiIntelligenceMetrics();
  res.status(200).json(buildSuccess(data, "AI intelligence metrics retrieved successfully"));
}

/**
 * GET /api/analytics/export/csv
 * Downloads RFC 4180 compliant CSV stream
 */
export async function exportComplaintsCsv(req: Request, res: Response): Promise<void> {
  const filter = parseAnalyticsFilter(req);
  const csvData = await analyticsService.generateComplaintsCsv(filter);

  const filename = `vcgis_complaints_${new Date().toISOString().split("T")[0]}.csv`;
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.status(200).send(csvData);
}

/**
 * GET /api/analytics/export/report
 */
export async function getExecutiveReport(req: Request, res: Response): Promise<void> {
  const filter = parseAnalyticsFilter(req);
  const data = await analyticsService.generateExecutiveReport(filter);
  res.status(200).json(buildSuccess(data, "Executive report digest generated successfully"));
}
