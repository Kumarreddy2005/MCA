import type { Request, Response } from "express";
import { getEntityAuditLogs } from "../services/audit.service.js";
import { buildError, buildSuccess } from "../utils/apiResponse.js";

/**
 * Fetch immutable audit logs for a complaint
 */
export async function getComplaintAuditLogs(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json(buildError("UNAUTHORIZED", "Authentication required"));
    return;
  }

  const { id } = req.params;
  if (!id || typeof id !== "string") {
    res.status(400).json(buildError("VALIDATION_ERROR", "Complaint ID is required"));
    return;
  }

  // Citizens can view audit logs if it is their complaint (or Officials/Admins)
  const auditLogs = await getEntityAuditLogs("COMPLAINT", id);

  res.status(200).json(buildSuccess(auditLogs, "Audit logs retrieved successfully"));
}
