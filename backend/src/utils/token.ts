import crypto from "crypto";
import jwt from "jsonwebtoken";
import { config } from "../config/env.js";
import { IUserDocument } from "../models/user.model.js";
import { RefreshToken } from "../models/refreshToken.model.js";

export interface JwtPayload {
  sub: string;
  name: string;
  role: string;
  phone: string;
  email?: string;
  iat?: number;
  exp?: number;
}

/**
 * Generate access and refresh token pair for a user
 */
export async function generateTokens(user: IUserDocument): Promise<{
  accessToken: string;
  refreshToken: string;
}> {
  const payload: JwtPayload = {
    sub: user._id.toString(),
    name: user.name,
    role: user.role,
    phone: user.phone,
    email: user.email,
  };

  const accessToken = jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });

  // Generate cryptographically secure refresh token
  const refreshTokenString = crypto.randomBytes(40).toString("hex");

  // Calculate expiration date
  const refreshExpiry = new Date();
  refreshExpiry.setDate(refreshExpiry.getDate() + 7); // 7 days

  // Store in database
  await RefreshToken.create({
    userId: user._id,
    token: refreshTokenString,
    expiresAt: refreshExpiry,
  });

  return {
    accessToken,
    refreshToken: refreshTokenString,
  };
}

/**
 * Verify JWT access token
 */
export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, config.JWT_SECRET) as JwtPayload;
}
