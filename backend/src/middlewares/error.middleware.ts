import type { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger.js";
import { buildError } from "../utils/apiResponse.js";

/** Handles requests to routes that don't exist */
export function notFoundHandler(_req: Request, res: Response, _next: NextFunction): void {
  res.status(404).json(buildError("NOT_FOUND", "The requested resource was not found"));
}

/** Global error handler — must be last middleware */
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  logger.error("Unhandled error", {
    message: err.message,
    stack: process.env["NODE_ENV"] !== "production" ? err.stack : undefined,
  });

  // Never expose stack traces or internal details in production
  const statusCode = (err as { statusCode?: number }).statusCode || 500;
  const message = statusCode === 500 ? "Internal server error" : err.message;

  res.status(statusCode).json(buildError("INTERNAL_ERROR", message));
}
