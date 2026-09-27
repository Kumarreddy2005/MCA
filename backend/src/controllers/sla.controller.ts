import type { Request, Response } from "express";
import { z } from "zod";
import { Complaint } from "../models/complaint.model.js";
import { ComplaintStatus, UserRole } from "../types/domain.js";
import { buildError, buildSuccess } from "../utils/apiResponse.js";
import {
  escalateComplaintManually,
  getSlaAnalytics,
  processSlaWarningsAndBreaches,
} from "../services/sla.service.js";

const manualEscalationSchema = z.object({
  targetLevel: z.number().int().min(1).max(3),
  reason: z.string().trim().min(5, "Escalation reason must be at least 5 characters"),
});

/**
 * Fetch System-wide or Departmental SLA Analytics
 */
export async function getSlaAnalyticsHandler(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json(buildError("UNAUTHORIZED", "Authentication required"));
    return;
  }

  const { department, district } = req.query;
  const userDept = req.user.role === UserRole.OFFICIAL ? req.user.officialProfile?.department : undefined;
  const targetDept = userDept || (department as string | undefined);

  const analytics = await getSlaAnalytics(targetDept, district as string | undefined);

  res.status(200).json(buildSuccess(analytics));
}

/**
 * Get Breached and At-Risk Grievances Queue
 */
export async function getAtRiskAndBreachedQueue(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json(buildError("UNAUTHORIZED", "Authentication required"));
    return;
  }

  const { department, tier, page = "1", limit = "20" } = req.query;
  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const filter: Record<string, unknown> = {
    status: {
      $nin: [ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED, ComplaintStatus.REJECTED, ComplaintStatus.CANCELLED],
    },
  };

  // Department isolation for officials
  if (req.user.role === UserRole.OFFICIAL) {
    filter.department = req.user.officialProfile?.department;
  } else if (department && department !== "ALL") {
    filter.department = department;
  }

  if (tier) {
    filter["sla.escalationLevel"] = parseInt(tier as string, 10);
  }

  const now = new Date();
  const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  filter.$or = [
    { "sla.isBreached": true },
    { "sla.targetResolutionDate": { $lte: next24Hours } },
  ];

  const [complaints, total] = await Promise.all([
    Complaint.find(filter)
      .sort({ "sla.targetResolutionDate": 1, priority: -1 })
      .skip(skip)
      .limit(limitNum)
      .exec(),
    Complaint.countDocuments(filter),
  ]);

  res.status(200).json(
    buildSuccess(
      {
        complaints: complaints.map((c) => c.toJSON()),
      },
      undefined,
      {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      }
    )
  );
}

/**
 * Manually trigger background SLA evaluation sweep (Admin / Scheduled trigger)
 */
export async function triggerSlaEvaluationSweep(_req: Request, res: Response): Promise<void> {
  const summary = await processSlaWarningsAndBreaches();
  res.status(200).json(buildSuccess(summary, "SLA monitoring sweep executed successfully"));
}

/**
 * Escalate complaint to higher authority tier
 */
export async function escalateComplaintHandler(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json(buildError("UNAUTHORIZED", "Authentication required"));
    return;
  }

  const { id } = req.params;
  if (!id || typeof id !== "string") {
    res.status(400).json(buildError("VALIDATION_ERROR", "Complaint ID is required"));
    return;
  }

  const parsed = manualEscalationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(buildError("VALIDATION_ERROR", parsed.error.issues[0]?.message || "Invalid payload"));
    return;
  }

  try {
    const updated = await escalateComplaintManually(
      id,
      {
        id: req.user._id.toString(),
        name: req.user.name,
        role: req.user.role,
      },
      parsed.data.targetLevel,
      parsed.data.reason
    );

    res.status(200).json(buildSuccess(updated.toJSON(), "Complaint escalated successfully"));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to escalate complaint";
    res.status(500).json(buildError("ESCALATION_FAILED", msg));
  }
}
