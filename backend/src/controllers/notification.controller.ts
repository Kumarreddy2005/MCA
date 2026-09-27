import type { Request, Response } from "express";
import {
  getUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../services/notification.service.js";
import { buildError, buildSuccess } from "../utils/apiResponse.js";

/**
 * Get current user's notifications
 */
export async function getMyNotifications(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json(buildError("UNAUTHORIZED", "Authentication required"));
    return;
  }

  const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
  const unreadOnly = req.query.unreadOnly === "true";

  const result = await getUserNotifications(req.user.id, { page, limit, unreadOnly });

  res.status(200).json(
    buildSuccess(
      {
        notifications: result.notifications,
        unreadCount: result.unreadCount,
      },
      "Notifications fetched successfully",
      {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      }
    )
  );
}

/**
 * Mark a single notification as read
 */
export async function markAsRead(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json(buildError("UNAUTHORIZED", "Authentication required"));
    return;
  }

  const { id } = req.params;
  if (!id || typeof id !== "string") {
    res.status(400).json(buildError("VALIDATION_ERROR", "Notification ID is required"));
    return;
  }
  const updated = await markNotificationRead(id, req.user.id);

  if (!updated) {
    res.status(404).json(buildError("NOT_FOUND", "Notification not found"));
    return;
  }

  res.status(200).json(buildSuccess(updated, "Notification marked as read"));
}

/**
 * Mark all user notifications as read
 */
export async function markAllAsRead(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json(buildError("UNAUTHORIZED", "Authentication required"));
    return;
  }

  const result = await markAllNotificationsRead(req.user.id);
  res.status(200).json(buildSuccess(result, "All notifications marked as read"));
}
