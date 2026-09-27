import { Router } from "express";
import {
  getMyNotifications,
  markAllAsRead,
  markAsRead,
} from "../controllers/notification.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const notificationRouter = Router();

notificationRouter.use(authenticate);

notificationRouter.get("/", asyncHandler(getMyNotifications));
notificationRouter.patch("/read-all", asyncHandler(markAllAsRead));
notificationRouter.patch("/:id/read", asyncHandler(markAsRead));
