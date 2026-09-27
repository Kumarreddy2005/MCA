import type { NextFunction, Request, Response } from "express";
import { UserRole } from "../types/domain.js";
import { User } from "../models/user.model.js";
import { buildError } from "../utils/apiResponse.js";
import { verifyAccessToken } from "../utils/token.js";

/**
 * Authenticate incoming request using JWT Bearer token
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json(buildError("UNAUTHORIZED", "Authentication token required"));
    return;
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    res.status(401).json(buildError("UNAUTHORIZED", "Authentication token missing"));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub);

    if (!user) {
      res.status(401).json(buildError("USER_NOT_FOUND", "User associated with token does not exist"));
      return;
    }

    if (!user.isActive) {
      res.status(403).json(buildError("ACCOUNT_DEACTIVATED", "User account is inactive"));
      return;
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json(buildError("INVALID_TOKEN", "Session expired or invalid token"));
    return;
  }
}

/**
 * Authorize roles for a route
 */
export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json(buildError("UNAUTHORIZED", "Authentication required"));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json(
        buildError(
          "FORBIDDEN",
          `Access forbidden: requires one of the following roles: [${allowedRoles.join(", ")}]`
        )
      );
      return;
    }

    next();
  };
}
