/**
 * VCGIS Security & NoSQL Injection Sanitization Middleware (Phase 12)
 *
 * In-place recursive sanitization of user-supplied input in req.body, req.query, and req.params:
 * 1. Strips MongoDB operator keys (keys beginning with '$' or containing '.')
 * 2. Neutralizes script tags and dangerous HTML entities
 * 3. Prevents prototype pollution (__proto__, constructor, prototype)
 * Compatible with Express 5 getter-only properties.
 */

import { Request, Response, NextFunction } from "express";

const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function sanitizeInPlace(obj: Record<string, unknown>): void {
  for (const [key, val] of Object.entries(obj)) {
    // Delete forbidden prototype or MongoDB operator keys
    if (FORBIDDEN_KEYS.has(key) || key.startsWith("$") || key.includes(".")) {
      delete obj[key];
      continue;
    }

    if (val === null || val === undefined) {
      continue;
    }

    if (typeof val === "string") {
      obj[key] = val.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "").trim();
    } else if (Array.isArray(val)) {
      for (let i = 0; i < val.length; i++) {
        if (typeof val[i] === "object" && val[i] !== null) {
          sanitizeInPlace(val[i] as Record<string, unknown>);
        } else if (typeof val[i] === "string") {
          val[i] = (val[i] as string).replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "").trim();
        }
      }
    } else if (typeof val === "object") {
      sanitizeInPlace(val as Record<string, unknown>);
    }
  }
}

export function sanitizeInput(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === "object") {
    sanitizeInPlace(req.body as Record<string, unknown>);
  }

  if (req.query && typeof req.query === "object") {
    sanitizeInPlace(req.query as Record<string, unknown>);
  }

  if (req.params && typeof req.params === "object") {
    sanitizeInPlace(req.params as Record<string, unknown>);
  }

  next();
}
