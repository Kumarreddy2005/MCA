import mongoose from "mongoose";
import { INotificationDocument, Notification, NotificationType } from "../models/notification.model.js";
import { UserRole } from "../types/domain.js";
import { logger } from "../utils/logger.js";

export interface SendNotificationParams {
  recipientId: string | mongoose.Types.ObjectId;
  role: UserRole;
  title: string;
  message: string;
  type?: NotificationType;
  complaintId?: string | mongoose.Types.ObjectId;
  complaintNumber?: string;
}

/**
 * Creates and stores an in-app notification
 */
export async function sendNotification(params: SendNotificationParams): Promise<INotificationDocument | null> {
  try {
    const recipientId =
      typeof params.recipientId === "string"
        ? new mongoose.Types.ObjectId(params.recipientId)
        : params.recipientId;

    const complaintId =
      params.complaintId && typeof params.complaintId === "string"
        ? new mongoose.Types.ObjectId(params.complaintId)
        : (params.complaintId as mongoose.Types.ObjectId | undefined);

    const notification = await Notification.create({
      recipientId,
      role: params.role,
      title: params.title,
      message: params.message,
      type: params.type || "INFO",
      complaintId,
      complaintNumber: params.complaintNumber,
      isRead: false,
    });

    logger.debug(`[NOTIFICATION] Dispatched to user:${params.recipientId} (${params.role}): "${params.title}"`);
    return notification;
  } catch (error) {
    logger.error(`[NOTIFICATION] Failed to send notification to user:${params.recipientId}:`, error);
    return null;
  }
}

/**
 * Fetch paginated notifications and unread count for a user
 */
export async function getUserNotifications(
  userId: string | mongoose.Types.ObjectId,
  options: { limit?: number; page?: number; unreadOnly?: boolean } = {}
): Promise<{ notifications: INotificationDocument[]; total: number; unreadCount: number }> {
  const limit = Math.min(options.limit || 20, 50);
  const page = Math.max(options.page || 1, 1);
  const skip = (page - 1) * limit;

  const recipientId = typeof userId === "string" ? new mongoose.Types.ObjectId(userId) : userId;

  const filter: Record<string, unknown> = { recipientId };
  if (options.unreadOnly) {
    filter.isRead = false;
  }

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipientId, isRead: false }),
  ]);

  return { notifications, total, unreadCount };
}

/**
 * Mark a single notification as read
 */
export async function markNotificationRead(
  notificationId: string,
  userId: string | mongoose.Types.ObjectId
): Promise<INotificationDocument | null> {
  const recipientId = typeof userId === "string" ? new mongoose.Types.ObjectId(userId) : userId;
  return Notification.findOneAndUpdate(
    { _id: notificationId, recipientId },
    { $set: { isRead: true, readAt: new Date() } },
    { new: true }
  ).exec();
}

/**
 * Mark all notifications for a user as read
 */
export async function markAllNotificationsRead(
  userId: string | mongoose.Types.ObjectId
): Promise<{ modifiedCount: number }> {
  const recipientId = typeof userId === "string" ? new mongoose.Types.ObjectId(userId) : userId;
  const result = await Notification.updateMany(
    { recipientId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  ).exec();

  return { modifiedCount: result.modifiedCount };
}
