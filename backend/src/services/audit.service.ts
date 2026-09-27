import mongoose from "mongoose";
import { AuditAction, AuditLog, IAuditLogDocument } from "../models/audit-log.model.js";
import { UserRole } from "../types/domain.js";
import { logger } from "../utils/logger.js";

export interface LogAuditParams {
  entityType: "COMPLAINT" | "USER" | "DEPARTMENT" | "SYSTEM";
  entityId: string;
  complaintNumber?: string;
  action: AuditAction;
  actor: {
    id?: string | mongoose.Types.ObjectId;
    name: string;
    role: UserRole | "SYSTEM";
    phone?: string;
    email?: string;
    ipAddress?: string;
  };
  previousState?: string;
  newState?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Persists an immutable audit log entry
 */
export async function logAuditEvent(params: LogAuditParams): Promise<IAuditLogDocument | null> {
  try {
    const actorId =
      params.actor.id && typeof params.actor.id === "string"
        ? new mongoose.Types.ObjectId(params.actor.id)
        : (params.actor.id as mongoose.Types.ObjectId | undefined);

    const logEntry = await AuditLog.create({
      entityType: params.entityType,
      entityId: params.entityId,
      complaintNumber: params.complaintNumber,
      action: params.action,
      actor: {
        ...params.actor,
        id: actorId,
      },
      previousState: params.previousState,
      newState: params.newState,
      notes: params.notes,
      metadata: params.metadata,
      timestamp: new Date(),
    });

    logger.debug(`[AUDIT] Logged ${params.action} on ${params.entityType}:${params.entityId} by ${params.actor.name}`);
    return logEntry;
  } catch (error) {
    logger.error(`[AUDIT] Failed to record audit log for ${params.entityType}:${params.entityId}:`, error);
    return null;
  }
}

/**
 * Retrieve audit history for a specific entity (e.g. Complaint)
 */
export async function getEntityAuditLogs(
  entityType: "COMPLAINT" | "USER" | "SYSTEM",
  entityId: string
): Promise<IAuditLogDocument[]> {
  return AuditLog.find({ entityType, entityId }).sort({ timestamp: -1 }).exec();
}
