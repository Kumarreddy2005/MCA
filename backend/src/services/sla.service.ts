/**
 * VCGIS SLA Engine & Multi-Tier Escalation Service (Phase 6)
 * Handles SLA calculation, warning dispatch, breach detection,
 * multi-tier administrative escalation, and compliance analytics.
 */

import mongoose from "mongoose";
import { Complaint, IComplaintDocument } from "../models/complaint.model.js";
import {
  ComplaintStatus,
  ISlaAnalyticsData,
  ISlaEscalationEvent,
  Priority,
  SlaStatus,
  UserRole,
} from "../types/domain.js";
import { logAuditEvent } from "./audit.service.js";
import { sendNotification } from "./notification.service.js";
import { logger } from "../utils/logger.js";
import { Department } from "../models/department.model.js";
import { normalizeDepartmentCode } from "../types/domain.js";

export interface SlaSweepSummary {
  scannedCount: number;
  warningsDispatched: number;
  breachesDetected: number;
  escalationsTriggered: number;
  evaluatedAt: Date;
}

/**
 * Standard Multi-Tier Escalation Authority Hierarchy
 */
export function getEscalationTierInfo(level: number): {
  level: number;
  title: string;
  authority: string;
} {
  switch (level) {
    case 1:
      return {
        level: 1,
        title: "Level 1: Taluk Escalation",
        authority: "Taluk Executive Officer / Tahsildar",
      };
    case 2:
      return {
        level: 2,
        title: "Level 2: District Escalation",
        authority: "District Collector / Deputy Commissioner",
      };
    case 3:
      return {
        level: 3,
        title: "Level 3: State Level Escalation",
        authority: "Principal Secretary / State Department Head",
      };
    default:
      return {
        level: 0,
        title: "Level 0: Department Official",
        authority: "Field Executive Engineer / Panchayat Officer",
      };
  }
}

/**
 * Calculate dynamic SLA resolution deadline based on priority and category
 */
export async function calculateDepartmentSlaTarget(priority: Priority, departmentValue?: string): Promise<Date> {
  const code = normalizeDepartmentCode(departmentValue);
  const dept = code ? await Department.findOne({ code, isActive: true }).lean() : null;
  const hours = dept?.slaConfig ? ({
    [Priority.CRITICAL]: dept.slaConfig.criticalHours,
    [Priority.HIGH]: dept.slaConfig.highHours,
    [Priority.MEDIUM]: dept.slaConfig.mediumHours,
    [Priority.LOW]: dept.slaConfig.lowHours,
  } as Record<Priority, number>)[priority] : undefined;
  return new Date(Date.now() + (hours ?? 120) * 60 * 60 * 1000);
}

export function calculateSlaTarget(priority: Priority, _category?: string): Date {
  const now = new Date();
  let durationHours = 120; // Default Medium: 5 days

  switch (priority) {
    case Priority.CRITICAL:
      durationHours = 24; // 24 Hours
      break;
    case Priority.HIGH:
      durationHours = 48; // 48 Hours
      break;
    case Priority.MEDIUM:
      durationHours = 120; // 5 Days
      break;
    case Priority.LOW:
      durationHours = 240; // 10 Days
      break;
  }

  return new Date(now.getTime() + durationHours * 60 * 60 * 1000);
}

/**
 * Evaluate real-time SLA metrics for an individual complaint
 */
export function evaluateComplaintSla(complaint: IComplaintDocument): {
  status: SlaStatus;
  elapsedHours: number;
  remainingHours: number;
  isBreached: boolean;
  overdueHours: number;
} {
  const startDate = complaint.sla?.startDate ? new Date(complaint.sla.startDate).getTime() : new Date(complaint.createdAt).getTime();
  const targetDate = new Date(complaint.sla.targetResolutionDate).getTime();
  const now = Date.now();

  const elapsedHours = Math.max(0, Math.round((now - startDate) / (1000 * 60 * 60)));
  const remainingHours = Math.round((targetDate - now) / (1000 * 60 * 60));
  const isBreached = remainingHours < 0;
  const overdueHours = isBreached ? Math.abs(remainingHours) : 0;

  let status: SlaStatus = SlaStatus.ON_TRACK;

  if (complaint.status === ComplaintStatus.RESOLVED || complaint.status === ComplaintStatus.CLOSED) {
    status = SlaStatus.RESOLVED;
  } else if (isBreached) {
    status = SlaStatus.BREACHED;
  } else if (remainingHours <= 24) {
    status = SlaStatus.AT_RISK;
  } else {
    status = SlaStatus.ON_TRACK;
  }

  return {
    status,
    elapsedHours,
    remainingHours,
    isBreached,
    overdueHours,
  };
}

/**
 * Automated SLA Monitoring & Multi-Tier Escalation Sweep
 * Scans active grievances, emits proactive warnings, detects breaches,
 * and escalates to Taluk -> District -> State levels.
 */
export async function processSlaWarningsAndBreaches(): Promise<SlaSweepSummary> {
  const activeStatuses = [
    ComplaintStatus.ASSIGNED,
    ComplaintStatus.UNDER_REVIEW,
    ComplaintStatus.ACTION_IN_PROGRESS,
    ComplaintStatus.INFORMATION_REQUIRED,
    ComplaintStatus.REOPENED,
    ComplaintStatus.ROUTING,
  ];

  const complaints = await Complaint.find({
    status: { $in: activeStatuses },
  }).exec();

  const summary: SlaSweepSummary = {
    scannedCount: complaints.length,
    warningsDispatched: 0,
    breachesDetected: 0,
    escalationsTriggered: 0,
    evaluatedAt: new Date(),
  };

  const now = Date.now();

  for (const complaint of complaints) {
    let modified = false;
    const targetTime = new Date(complaint.sla.targetResolutionDate).getTime();
    const diffHours = Math.round((targetTime - now) / (1000 * 60 * 60));

    // 1. Proactive SLA Warning (< 24 Hours remaining)
    if (diffHours > 0 && diffHours <= 24 && !complaint.sla.warningSent) {
      complaint.sla.warningSent = true;
      complaint.sla.warningSentAt = new Date();
      complaint.sla.status = SlaStatus.AT_RISK;
      modified = true;
      summary.warningsDispatched++;

      // Send warning notification to assigned official or department
      if (complaint.assignedOfficialId) {
        await sendNotification({
          recipientId: complaint.assignedOfficialId.toString(),
          role: UserRole.OFFICIAL,
          title: `⚠️ SLA Warning: ${complaint.complaintNumber}`,
          message: `Grievance "${complaint.title}" is approaching its SLA deadline in ${diffHours} hour(s). Immediate action required.`,
          type: "WARNING",
          complaintId: complaint._id.toString(),
          complaintNumber: complaint.complaintNumber,
        });
      }

      await logAuditEvent({
        entityType: "COMPLAINT",
        entityId: complaint._id.toString(),
        complaintNumber: complaint.complaintNumber,
        action: "SLA_WARNING",
        actor: {
          name: "SLA Monitoring Engine",
          role: "SYSTEM",
        },
        previousState: SlaStatus.ON_TRACK,
        newState: SlaStatus.AT_RISK,
        notes: `Proactive SLA warning dispatched. ${diffHours} hour(s) remaining before breach.`,
      });
    }

    // 2. SLA Breach Detection (Target Time has elapsed)
    if (diffHours <= 0) {
      const overdueHours = Math.abs(diffHours);

      if (!complaint.sla.isBreached) {
        complaint.sla.isBreached = true;
        complaint.sla.breachedAt = new Date();
        complaint.sla.status = SlaStatus.BREACHED;
        modified = true;
        summary.breachesDetected++;

        // Notify Citizen and Official of breach
        await sendNotification({
          recipientId: complaint.citizenId.toString(),
          role: UserRole.CITIZEN,
          title: `SLA Update: ${complaint.complaintNumber}`,
          message: `Your grievance has exceeded the standard resolution timeframe. It is being automatically escalated to supervisory authorities.`,
          type: "WARNING",
          complaintId: complaint._id.toString(),
          complaintNumber: complaint.complaintNumber,
        });

        await logAuditEvent({
          entityType: "COMPLAINT",
          entityId: complaint._id.toString(),
          complaintNumber: complaint.complaintNumber,
          action: "SLA_BREACH",
          actor: {
            name: "SLA Monitoring Engine",
            role: "SYSTEM",
          },
          previousState: complaint.sla.status,
          newState: SlaStatus.BREACHED,
          notes: `Grievance breached target SLA deadline by ${overdueHours} hour(s).`,
        });
      }

      // 3. Multi-Tier Automated Escalation Hierarchy
      // Level 1: Overdue > 0h (Immediate breach) -> Taluk Executive Officer
      // Level 2: Overdue >= 24h -> District Collector
      // Level 3: Overdue >= 48h -> State Department Head
      let targetTier = 1;
      if (overdueHours >= 48) {
        targetTier = 3;
      } else if (overdueHours >= 24) {
        targetTier = 2;
      }

      const currentTier = complaint.sla.escalationLevel || 0;

      if (targetTier > currentTier) {
        const tierInfo = getEscalationTierInfo(targetTier);
        const escalationEvent: ISlaEscalationEvent = {
          level: targetTier,
          levelName: tierInfo.title,
          reason: `Auto-escalated due to SLA breach (${overdueHours}h overdue). Escalated to ${tierInfo.authority}.`,
          triggeredBy: "AUTOMATED_ENGINE",
          actorName: "Automated Escalation Engine",
          escalatedAt: new Date(),
        };

        complaint.sla.escalationLevel = targetTier;
        complaint.sla.escalatedAt = new Date();
        if (!complaint.sla.escalationHistory) {
          complaint.sla.escalationHistory = [];
        }
        complaint.sla.escalationHistory.push(escalationEvent);

        complaint.timeline.push({
          status: ComplaintStatus.ESCALATED,
          message: `[${tierInfo.title}] Auto-escalated to ${tierInfo.authority}. Reason: Overdue by ${overdueHours}h past target deadline.`,
          actorRole: "SYSTEM",
          actorName: "SLA Escalation Engine",
          timestamp: new Date(),
        });

        modified = true;
        summary.escalationsTriggered++;

        // Audit Log for Escalation
        await logAuditEvent({
          entityType: "COMPLAINT",
          entityId: complaint._id.toString(),
          complaintNumber: complaint.complaintNumber,
          action: "SLA_ESCALATION",
          actor: {
            name: "SLA Escalation Engine",
            role: "SYSTEM",
          },
          previousState: `Tier ${currentTier}`,
          newState: `Tier ${targetTier}`,
          notes: escalationEvent.reason,
          metadata: {
            escalationLevel: targetTier,
            authority: tierInfo.authority,
            overdueHours,
          },
        });
      }
    }

    if (modified) {
      await complaint.save();
    }
  }

  logger.info(
    `[SLA_SWEEP] Completed: Scanned=${summary.scannedCount}, Warnings=${summary.warningsDispatched}, Breaches=${summary.breachesDetected}, Escalations=${summary.escalationsTriggered}`
  );

  return summary;
}

/**
 * Manually trigger administrative grievance escalation
 */
export async function escalateComplaintManually(
  complaintId: string,
  actor: { id: string; name: string; role: UserRole | "SYSTEM" },
  targetLevel: number,
  reason: string
): Promise<IComplaintDocument> {
  const complaint = await Complaint.findById(complaintId).exec();
  if (!complaint) {
    throw new Error("Complaint not found");
  }

  const validLevel = Math.min(3, Math.max(1, targetLevel));
  const tierInfo = getEscalationTierInfo(validLevel);

  const escalationEvent: ISlaEscalationEvent = {
    level: validLevel,
    levelName: tierInfo.title,
    reason: reason.trim(),
    triggeredBy: "MANUAL_STAFF",
    actorName: actor.name,
    escalatedAt: new Date(),
  };

  complaint.sla.escalationLevel = validLevel;
  complaint.sla.escalatedAt = new Date();
  if (!complaint.sla.escalationHistory) {
    complaint.sla.escalationHistory = [];
  }
  complaint.sla.escalationHistory.push(escalationEvent);

  complaint.status = ComplaintStatus.ESCALATED;
  complaint.timeline.push({
    status: ComplaintStatus.ESCALATED,
    message: `Manually escalated to ${tierInfo.authority} by ${actor.name} (${actor.role}). Justification: "${reason.trim()}"`,
    actorId: new mongoose.Types.ObjectId(actor.id),
    actorRole: actor.role,
    actorName: actor.name,
    timestamp: new Date(),
  });

  await complaint.save();

  await logAuditEvent({
    entityType: "COMPLAINT",
    entityId: complaint._id.toString(),
    complaintNumber: complaint.complaintNumber,
    action: "MANUAL_ESCALATION",
    actor: {
      id: actor.id,
      name: actor.name,
      role: actor.role,
    },
    previousState: ComplaintStatus.ACTION_IN_PROGRESS,
    newState: ComplaintStatus.ESCALATED,
    notes: reason.trim(),
    metadata: {
      escalationLevel: validLevel,
      authority: tierInfo.authority,
    },
  });

  return complaint;
}

/**
 * Compute System-Wide or Departmental SLA Compliance Analytics
 */
export async function getSlaAnalytics(
  department?: string,
  _district?: string
): Promise<ISlaAnalyticsData> {
  const matchFilter: Record<string, unknown> = {};
  if (department && department !== "ALL") {
    matchFilter.department = department;
  }

  const complaints = await Complaint.find(matchFilter).exec();

  let onTrackCount = 0;
  let atRiskCount = 0;
  let breachedCount = 0;
  let resolvedWithinSlaCount = 0;
  let totalResolvedTimeHours = 0;
  let resolvedTotal = 0;

  const priorityMap: Record<Priority, { total: number; breached: number; complianceRate: number }> = {
    [Priority.CRITICAL]: { total: 0, breached: 0, complianceRate: 100 },
    [Priority.HIGH]: { total: 0, breached: 0, complianceRate: 100 },
    [Priority.MEDIUM]: { total: 0, breached: 0, complianceRate: 100 },
    [Priority.LOW]: { total: 0, breached: 0, complianceRate: 100 },
  };

  const departmentMap: Record<string, { total: number; breached: number; complianceRate: number }> = {};

  const now = Date.now();

  for (const c of complaints) {
    const isResolved = c.status === ComplaintStatus.RESOLVED || c.status === ComplaintStatus.CLOSED;
    const targetDate = new Date(c.sla.targetResolutionDate).getTime();
    const startDate = c.sla.startDate ? new Date(c.sla.startDate).getTime() : new Date(c.createdAt).getTime();

    // Priority breakdown tracking
    const p = c.priority as Priority;
    if (priorityMap[p]) {
      priorityMap[p].total++;
    }

    // Department breakdown tracking
    const deptData = departmentMap[c.department] || { total: 0, breached: 0, complianceRate: 100 };
    deptData.total++;
    departmentMap[c.department] = deptData;

    if (isResolved) {
      resolvedTotal++;
      const resolvedAt = c.resolution?.resolvedAt ? new Date(c.resolution.resolvedAt).getTime() : new Date(c.updatedAt).getTime();
      const resolutionHours = Math.max(0, Math.round((resolvedAt - startDate) / (1000 * 60 * 60)));
      totalResolvedTimeHours += resolutionHours;

      if (resolvedAt <= targetDate) {
        resolvedWithinSlaCount++;
      } else {
        breachedCount++;
        if (priorityMap[p]) priorityMap[p].breached++;
        deptData.breached++;
      }
    } else {
      if (c.sla.isBreached || now > targetDate) {
        breachedCount++;
        if (priorityMap[p]) priorityMap[p].breached++;
        deptData.breached++;
      } else if (targetDate - now <= 24 * 60 * 60 * 1000) {
        atRiskCount++;
      } else {
        onTrackCount++;
      }
    }
  }

  // Calculate compliance percentages
  for (const key of Object.keys(priorityMap) as Priority[]) {
    const item = priorityMap[key];
    item.complianceRate = item.total > 0 ? Math.round(((item.total - item.breached) / item.total) * 100) : 100;
  }

  for (const dept of Object.keys(departmentMap)) {
    const item = departmentMap[dept];
    if (item) {
      item.complianceRate = item.total > 0 ? Math.round(((item.total - item.breached) / item.total) * 100) : 100;
    }
  }

  const totalTracked = complaints.length;
  const complianceRatePercentage = totalTracked > 0 ? Math.round(((totalTracked - breachedCount) / totalTracked) * 100) : 100;
  const breachRatePercentage = totalTracked > 0 ? Math.round((breachedCount / totalTracked) * 100) : 0;
  const averageResolutionHours = resolvedTotal > 0 ? Math.round(totalResolvedTimeHours / resolvedTotal) : 0;

  return {
    totalTracked,
    onTrackCount,
    atRiskCount,
    breachedCount,
    resolvedWithinSlaCount,
    complianceRatePercentage,
    breachRatePercentage,
    averageResolutionHours,
    byPriority: priorityMap,
    byDepartment: departmentMap,
  };
}
