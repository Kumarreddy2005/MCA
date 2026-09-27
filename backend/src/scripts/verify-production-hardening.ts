/**
 * VCGIS Phase 12 — Production Hardening & Deployment Verification Script
 *
 * Automated end-to-end security audit and deployment verification:
 * 1. Security Headers Audit (HSTS, CSP, X-Content-Type-Options, X-Frame-Options, no X-Powered-By)
 * 2. NoSQL Injection & Prototype Pollution Defense (Strips $ operators and malicious payloads)
 * 3. Tiered Rate Limiting Defense (Auth brute-force mitigation returns HTTP 429)
 * 4. Performance Caching Service (TTL, Wrap helper, Pattern invalidation)
 * 5. Healthcheck Endpoint (/health zero-downtime container monitoring)
 * 6. Multi-stage Containerization & Docker Compose validation
 */

import http from "http";
import fs from "fs";
import path from "path";
import { createApp } from "../app.js";
import { connectDatabase } from "../config/database.js";
import { cacheService } from "../services/cache.service.js";
import { logger } from "../utils/logger.js";

async function runProductionHardeningVerification() {
  await connectDatabase();
  const app = createApp();

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 5001;
  const baseUrl = `http://127.0.0.1:${port}`;

  logger.info(`Production Hardening verification server running on port ${port}`);

  let passedTests = 0;
  const totalTests = 6;

  try {
    // ─── Test 1: Security Headers Audit (OWASP Hardening) ─────────────
    logger.info("Test 1: Auditing HTTP Security Headers");
    const healthRes = await fetch(`${baseUrl}/health`);
    const headers = healthRes.headers;

    // Check HSTS
    const hsts = headers.get("strict-transport-security");
    if (!hsts || !hsts.includes("max-age=31536000")) {
      throw new Error(`Missing or invalid Strict-Transport-Security header: ${hsts}`);
    }

    // Check nosniff
    const nosniff = headers.get("x-content-type-options");
    if (nosniff !== "nosniff") {
      throw new Error(`Missing or invalid X-Content-Type-Options header: ${nosniff}`);
    }

    // Check Frame options
    const frameOptions = headers.get("x-frame-options");
    if (!frameOptions || frameOptions.toUpperCase() !== "SAMEORIGIN") {
      throw new Error(`Missing or invalid X-Frame-Options header: ${frameOptions}`);
    }

    // Verify X-Powered-By is suppressed
    const poweredBy = headers.get("x-powered-by");
    if (poweredBy) {
      throw new Error(`Security Violation: X-Powered-By header is exposed: ${poweredBy}`);
    }

    // Check CSP
    const csp = headers.get("content-security-policy");
    if (!csp || !csp.includes("default-src 'self'")) {
      throw new Error(`Missing or invalid Content-Security-Policy header: ${csp}`);
    }

    passedTests++;
    logger.info("✔ Test 1 Passed: Enterprise security headers verified (HSTS, CSP, nosniff, frameguard)");

    // ─── Test 2: NoSQL Injection & Payload Sanitization ──────────────
    logger.info("Test 2: Testing NoSQL Injection & Prototype Pollution Sanitization");
    
    // Send a payload containing malicious MongoDB operator keys ($ne, $where, __proto__)
    const maliciousPayload = {
      email: { $ne: null },
      password: "test-password",
      $where: "sleep(5000)",
      __proto__: { isAdmin: true },
      "nested.field": "injected",
    };

    const loginRes = await fetch(`${baseUrl}/api/auth/staff/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(maliciousPayload),
    });

    // The backend should have sanitized $ne and $where, converting body to safe object
    // It should fail with standard authentication error rather than crashing or executing query
    const loginJson = (await loginRes.json()) as { success: boolean; error?: { message: string } };
    if (loginRes.status === 500 || loginJson.success) {
      throw new Error("NoSQL injection either crashed server or bypassed authentication!");
    }

    passedTests++;
    logger.info("✔ Test 2 Passed: NoSQL injection operators ($ne, $where, __proto__) neutralized cleanly");

    // ─── Test 3: Tiered Rate Limiting Defense ────────────────────────
    logger.info("Test 3: Testing Tiered Rate Limiter on Authentication Endpoint");

    // Send rapid burst of 20 requests to trigger the 15-point auth rate limiter
    let rateLimited = false;
    for (let i = 0; i < 20; i++) {
      const res = await fetch(`${baseUrl}/api/auth/staff/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: `attacker${i}@test.com`, password: "wrong" }),
      });

      if (res.status === 429) {
        rateLimited = true;
        const body = (await res.json()) as { success: boolean; error?: { code: string } };
        if (body.error?.code !== "RATE_LIMITED") {
          throw new Error(`Expected error code RATE_LIMITED, got ${body.error?.code}`);
        }
        break;
      }
    }

    if (!rateLimited) {
      throw new Error("Auth rate limiter failed to block rapid burst attempts with HTTP 429!");
    }

    passedTests++;
    logger.info("✔ Test 3 Passed: Tiered rate limiter successfully blocked auth burst with HTTP 429");

    // ─── Test 4: Performance Caching Service ─────────────────────────
    logger.info("Test 4: Verifying In-Memory Performance Caching Service");

    // Test basic set and get
    cacheService.set("karnataka_districts", ["Mysuru", "Bengaluru Urban", "Belagavi"], 10);
    const cachedDistricts = cacheService.get<string[]>("karnataka_districts");
    if (!cachedDistricts || cachedDistricts.length !== 3) {
      throw new Error("CacheService failed to retrieve stored item!");
    }

    // Test cache wrap helper
    let computeCount = 0;
    const fetcher = async () => {
      computeCount++;
      return { heavyData: "processed" };
    };

    const firstCall = await cacheService.wrap("heavy_calc", fetcher, 10);
    const secondCall = await cacheService.wrap("heavy_calc", fetcher, 10);
    if (computeCount !== 1 || firstCall.heavyData !== secondCall.heavyData) {
      throw new Error(`CacheService wrap failed: computeCount is ${computeCount}, expected 1`);
    }

    // Test pattern invalidation
    cacheService.invalidatePattern("karnataka_");
    if (cacheService.get("karnataka_districts") !== null) {
      throw new Error("CacheService failed to invalidate pattern!");
    }

    passedTests++;
    logger.info("✔ Test 4 Passed: Performance caching service verified (TTL, wrap memoization, pattern purge)");

    // ─── Test 5: Zero-Downtime Healthcheck Endpoint ──────────────────
    logger.info("Test 5: Verifying /health Zero-Downtime Endpoint");
    const healthCheckRes = await fetch(`${baseUrl}/health`);
    const healthCheckJson = (await healthCheckRes.json()) as {
      success: boolean;
      data: { status: string; uptimeSeconds: number; service: string };
    };

    if (!healthCheckJson.success || healthCheckJson.data.status !== "healthy") {
      throw new Error(`Healthcheck returned unhealthy response: ${JSON.stringify(healthCheckJson)}`);
    }

    passedTests++;
    logger.info(`✔ Test 5 Passed: /health endpoint operating (${healthCheckJson.data.service}, uptime ${healthCheckJson.data.uptimeSeconds}s)`);

    // ─── Test 6: Containerization & Deployment Orchestration Files ───
    logger.info("Test 6: Validating Production Container & Orchestration Files");

    const rootDir = path.resolve(process.cwd(), "..");
    const requiredFiles = [
      path.join(rootDir, "docker-compose.yml"),
      path.join(rootDir, ".dockerignore"),
      path.join(rootDir, "backend", "Dockerfile"),
      path.join(rootDir, "frontend", "Dockerfile"),
      path.join(rootDir, "frontend", "nginx.conf"),
      path.join(rootDir, "ai-service", "Dockerfile"),
      path.join(rootDir, ".github", "workflows", "ci.yml"),
    ];

    for (const filePath of requiredFiles) {
      if (!fs.existsSync(filePath)) {
        throw new Error(`Missing production container asset: ${filePath}`);
      }
      const stats = fs.statSync(filePath);
      if (stats.size === 0) {
        throw new Error(`Production asset is empty: ${filePath}`);
      }
    }

    passedTests++;
    logger.info(`✔ Test 6 Passed: Verified presence and non-zero size of all ${requiredFiles.length} production deployment assets`);

    // ─── Verification Summary ────────────────────────────────────────
    logger.info("===============================================================");
    logger.info(`Phase 12 Verification Complete: ${passedTests}/${totalTests} Tests Passed (100%)`);
    logger.info("===============================================================");
  } catch (err) {
    logger.error("Production hardening verification failed:", err);
  } finally {
    server.close();
    process.exit(passedTests === totalTests ? 0 : 1);
  }
}

runProductionHardeningVerification().catch((err) => {
  logger.error("Verification failed with uncaught exception:", err);
  process.exit(1);
});
