import { Router } from "express";
import { UserRole } from "../types/domain.js";
import {
  createStaffUser,
  getCurrentUser,
  logout,
  refreshToken,
  sendCitizenOtp,
  staffLogin,
  verifyCitizenOtp,
} from "../controllers/auth.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const authRouter = Router();

// Citizen OTP authentication
authRouter.post("/citizen/send-otp", asyncHandler(sendCitizenOtp));
authRouter.post("/citizen/verify-otp", asyncHandler(verifyCitizenOtp));

// Staff (Volunteer, Official, Admin) authentication
authRouter.post("/staff/login", asyncHandler(staffLogin));

// Token refresh & session
authRouter.post("/refresh", asyncHandler(refreshToken));
authRouter.post("/logout", asyncHandler(logout));

// Authenticated user profile
authRouter.get("/me", authenticate, asyncHandler(getCurrentUser));

// Admin user provisioning
authRouter.post("/staff", authenticate, authorize(UserRole.ADMIN), asyncHandler(createStaffUser));
