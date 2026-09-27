import type { NextFunction, Request, Response } from "express";
import { Complaint, type IComplaintDocument } from "../models/complaint.model.js";
import { UserRole, normalizeDepartmentCode } from "../types/domain.js";
import { buildError } from "../utils/apiResponse.js";
import { logAuditEvent } from "../services/audit.service.js";
import { logger } from "../utils/logger.js";

/**
 * Middleware ensuring an official can ONLY access grievances within their assigned department.
 * Admins are permitted cross-department oversight.
 */
export async function requireOfficialDepartment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    res.status(401).json(buildError("UNAUTHORIZED", "Authentication required"));
    return;
  }

  // Admins have universal authority
  if (req.user.role === UserRole.ADMIN) {
    next();
    return;
  }

  // Must be an official
  if (req.user.role !== UserRole.OFFICIAL) {
    res.status(403).json(buildError("FORBIDDEN", "Only Department Officials can access this portal"));
    return;
  }

  const { id } = req.params;
  if (!id) {
    next();
    return;
  }

  const complaint = await Complaint.findById(id);
  if (!complaint) {
    res.status(404).json(buildError("NOT_FOUND", "Grievance not found"));
    return;
  }

  const officialDeptCode = req.user.officialProfile?.departmentCode || normalizeDepartmentCode(req.user.officialProfile?.department);
  const complaintDeptCode = complaint.departmentCode || normalizeDepartmentCode(complaint.department);

  if (!officialDeptCode || !complaintDeptCode || complaintDeptCode !== officialDeptCode) {
    logger.warn(
      `[SECURITY] Department isolation breach blocked: Official ${req.user.name} (${officialDept}) attempted unauthorized action on complaint ${complaint.complaintNumber} (${complaint.department})`
    );

    // Audit the security violation
    await logAuditEvent({
      entityType: "COMPLAINT",
      entityId: complaint._id.toString(),
      complaintNumber: complaint.complaintNumber,
      action: "STATUS_TRANSITION",
      actor: {
        id: req.user._id.toString(),
        name: req.user.name,
        role: req.user.role,
        phone: req.user.phone,
        email: req.user.email,
        ipAddress: req.ip,
      },
      notes: `BLOCKED unauthorized cross-department access attempt. Official Dept: ${officialDeptCode || "UNKNOWN"} vs Complaint Dept: ${complaintDeptCode || "UNKNOWN"}`,
    });

    res.status(403).json(
      buildError(
        "DEPARTMENT_ISOLATION_VIOLATION",
        `Access denied. This grievance belongs to '${complaint.department}'. Your jurisdiction is restricted to '${req.user.officialProfile?.department || "None"}'.`
      )
    );
    return;
  }

  // Attach complaint to request for subsequent handlers if needed
  (req as Request & { complaint?: IComplaintDocument }).complaint = complaint;
  next();
}
