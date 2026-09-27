import crypto from "crypto";
import type { Request, Response } from "express";
import { z } from "zod";
import { UserRole } from "../types/domain.js";
import { Otp } from "../models/otp.model.js";
import { RefreshToken } from "../models/refreshToken.model.js";
import { User } from "../models/user.model.js";
import { buildError, buildSuccess } from "../utils/apiResponse.js";
import { logger } from "../utils/logger.js";
import { generateTokens } from "../utils/token.js";

// ─── Input Validation Schemas ────────────────────────────────
export const sendOtpSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Please enter a valid 10-digit Indian mobile number"),
  purpose: z.enum(["LOGIN", "SIGNUP"]).default("LOGIN"),
});

export const verifyOtpSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Please enter a valid 10-digit mobile number"),
  otp: z.string().trim().length(6, "OTP must be exactly 6 digits"),
  name: z.string().trim().min(2).max(100).optional(),
  village: z.string().trim().optional(),
  ward: z.string().trim().optional(),
  district: z.string().trim().optional(),
  pincode: z.string().trim().optional(),
});

export const staffLoginSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const createStaffSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().email("Invalid email address"),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Valid 10-digit phone required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum([UserRole.VOLUNTEER, UserRole.OFFICIAL, UserRole.DEPARTMENT_STAFF, UserRole.ADMIN]),
  volunteerProfile: z
    .object({
      volunteerId: z.string(),
      assignedVillage: z.string(),
      assignedWard: z.string(),
      assignedPanchayat: z.string().optional(),
      district: z.string(),
    })
    .optional(),
  officialProfile: z
    .object({
      department: z.string(),
      departmentCode: z.enum(["ROAD", "ELECTRICITY", "WATER"]).optional(),
      designation: z.string(),
      jurisdictionDistrict: z.string(),
      jurisdictionTaluk: z.string().optional(),
    })
    .optional(),
  adminProfile: z
    .object({
      superAdmin: z.boolean().default(false),
      permissions: z.array(z.string()).default([]),
    })
    .optional(),
});

// ─── Citizen OTP Flow ────────────────────────────────────────

/**
 * Send 6-digit OTP to Citizen mobile
 */
export async function sendCitizenOtp(req: Request, res: Response): Promise<void> {
  const parseResult = sendOtpSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json(buildError("VALIDATION_ERROR", "Invalid input", parseResult.error.flatten().fieldErrors));
    return;
  }

  const { phone, purpose } = parseResult.data;

  // Invalidate any previous unused OTPs for this phone
  await Otp.deleteMany({ phone, verified: false });

  // Generate 6-digit numeric OTP
  const otpCode = crypto.randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  await Otp.create({
    phone,
    otp: otpCode,
    purpose,
    expiresAt,
    attempts: 0,
    verified: false,
  });

  logger.info(`[AUTH] OTP generated for ${phone}: ${otpCode} (Expires in 5m)`);

  // In production, integrate with SMS gateway (e.g. CDAC / Fast2SMS / Twilio)
  // For developer ease in local/dev environments, return preview OTP
  const isDev = process.env.NODE_ENV !== "production";

  res.status(200).json(
    buildSuccess(
      {
        phone,
        expiresIn: 300,
        ...(isDev && { devOtpPreview: otpCode }),
      },
      "OTP sent successfully to your mobile number"
    )
  );
}

/**
 * Verify Citizen OTP and issue JWT access & refresh tokens
 */
export async function verifyCitizenOtp(req: Request, res: Response): Promise<void> {
  const parseResult = verifyOtpSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json(buildError("VALIDATION_ERROR", "Invalid input", parseResult.error.flatten().fieldErrors));
    return;
  }

  const { phone, otp, name, village, ward, district, pincode } = parseResult.data;

  const otpRecord = await Otp.findOne({
    phone,
    verified: false,
  }).sort({ createdAt: -1 });

  if (!otpRecord) {
    res.status(400).json(buildError("OTP_NOT_FOUND", "No active OTP request found. Please request a new OTP."));
    return;
  }

  if (new Date() > otpRecord.expiresAt) {
    await Otp.deleteOne({ _id: otpRecord._id });
    res.status(400).json(buildError("OTP_EXPIRED", "OTP has expired. Please request a new one."));
    return;
  }

  if (otpRecord.attempts >= 5) {
    await Otp.deleteOne({ _id: otpRecord._id });
    res.status(429).json(buildError("OTP_MAX_ATTEMPTS", "Maximum verification attempts exceeded. Request a new OTP."));
    return;
  }

  if (otpRecord.otp !== otp) {
    otpRecord.attempts += 1;
    await otpRecord.save();
    res.status(400).json(buildError("INVALID_OTP", "Invalid OTP entered. Please try again."));
    return;
  }

  // OTP verified
  otpRecord.verified = true;
  await otpRecord.save();

  // Find or create citizen user
  let user = await User.findOne({ phone });

  if (!user) {
    user = await User.create({
      name: name || `Citizen ${phone.slice(-4)}`,
      phone,
      role: UserRole.CITIZEN,
      isActive: true,
      isVerified: true,
      citizenProfile: {
        village,
        ward,
        district,
        pincode,
      },
    });
    logger.info(`[AUTH] New citizen registered via OTP: ${phone} (${user._id})`);
  } else {
    // Update verification status and optional profile details if provided
    user.isVerified = true;
    if (name && !user.name) user.name = name;
    if (village || ward || district || pincode) {
      user.citizenProfile = {
        ...user.citizenProfile,
        ...(village && { village }),
        ...(ward && { ward }),
        ...(district && { district }),
        ...(pincode && { pincode }),
      };
    }
    await user.save();
  }

  const tokens = await generateTokens(user);

  res.status(200).json(
    buildSuccess(
      {
        user: user.toJSON(),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
      "Authentication successful"
    )
  );
}

// ─── Staff Login (Volunteer, Official, Admin) ───────────────

/**
 * Login for staff members using email + password
 */
export async function staffLogin(req: Request, res: Response): Promise<void> {
  const parseResult = staffLoginSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json(buildError("VALIDATION_ERROR", "Invalid input", parseResult.error.flatten().fieldErrors));
    return;
  }

  const { email, password } = parseResult.data;

  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    res.status(401).json(buildError("INVALID_CREDENTIALS", "Invalid email or password"));
    return;
  }

  if (user.role === UserRole.CITIZEN) {
    res.status(403).json(buildError("ROLE_MISMATCH", "Citizens must log in using mobile OTP authentication"));
    return;
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    res.status(401).json(buildError("INVALID_CREDENTIALS", "Invalid email or password"));
    return;
  }

  if (!user.isActive) {
    res.status(403).json(buildError("ACCOUNT_INACTIVE", "Your account has been deactivated. Contact an administrator."));
    return;
  }

  const tokens = await generateTokens(user);

  logger.info(`[AUTH] Staff login successful: ${user.email} (${user.role})`);

  res.status(200).json(
    buildSuccess(
      {
        user: user.toJSON(),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
      "Login successful"
    )
  );
}

// ─── Token Refresh & Session Management ─────────────────────

/**
 * Refresh access token using active refresh token
 */
export async function refreshToken(req: Request, res: Response): Promise<void> {
  const tokenString = req.body.refreshToken || req.cookies?.refreshToken;

  if (!tokenString) {
    res.status(400).json(buildError("TOKEN_REQUIRED", "Refresh token is required"));
    return;
  }

  const tokenRecord = await RefreshToken.findOne({
    token: tokenString,
    revokedAt: null,
  });

  if (!tokenRecord || new Date() > tokenRecord.expiresAt) {
    res.status(401).json(buildError("INVALID_REFRESH_TOKEN", "Refresh token is invalid or expired"));
    return;
  }

  const user = await User.findById(tokenRecord.userId);
  if (!user || !user.isActive) {
    res.status(401).json(buildError("USER_UNAVAILABLE", "User account is unavailable or inactive"));
    return;
  }

  // Revoke old refresh token
  tokenRecord.revokedAt = new Date();
  await tokenRecord.save();

  // Generate new token pair
  const tokens = await generateTokens(user);

  res.status(200).json(
    buildSuccess(
      {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
      "Token refreshed successfully"
    )
  );
}

/**
 * Log out and revoke active refresh token
 */
export async function logout(req: Request, res: Response): Promise<void> {
  const tokenString = req.body.refreshToken || req.cookies?.refreshToken;

  if (tokenString) {
    await RefreshToken.updateOne({ token: tokenString }, { revokedAt: new Date() });
  }

  res.clearCookie("refreshToken");
  res.status(200).json(buildSuccess(null, "Logged out successfully"));
}

/**
 * Get current authenticated user profile
 */
export async function getCurrentUser(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json(buildError("UNAUTHORIZED", "Not authenticated"));
    return;
  }

  res.status(200).json(buildSuccess({ user: req.user.toJSON() }));
}

// ─── Staff Provisioning (Admin only) ─────────────────────────

/**
 * Admin creates a new staff account (Volunteer, Official, Admin)
 */
export async function createStaffUser(req: Request, res: Response): Promise<void> {
  const parseResult = createStaffSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json(buildError("VALIDATION_ERROR", "Validation failed", parseResult.error.flatten().fieldErrors));
    return;
  }

  const data = parseResult.data;

  // Check email and phone uniqueness
  const existingEmail = await User.findOne({ email: data.email });
  if (existingEmail) {
    res.status(409).json(buildError("EMAIL_EXISTS", "A user with this email already exists"));
    return;
  }

  const existingPhone = await User.findOne({ phone: data.phone });
  if (existingPhone) {
    res.status(409).json(buildError("PHONE_EXISTS", "A user with this phone number already exists"));
    return;
  }

  const newUser = await User.create({
    name: data.name,
    email: data.email,
    phone: data.phone,
    password: data.password,
    role: data.role,
    isActive: true,
    isVerified: true,
    volunteerProfile: data.volunteerProfile,
    officialProfile: data.officialProfile,
    adminProfile: data.adminProfile,
  });

  logger.info(`[ADMIN] Provisioned new staff user: ${newUser.email} (${newUser.role})`);

  res.status(201).json(buildSuccess({ user: newUser.toJSON() }, "Staff account created successfully"));
}
