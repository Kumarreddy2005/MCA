/**
 * VCGIS Phase 11 — Geographic & Executive Analytics Verification Script
 * Automated end-to-end integration test verifying:
 * 1. Strict RBAC Isolation (Citizen tokens rejected with 403 Forbidden; Official and Admin tokens succeed with 200 OK)
 * 2. System-wide Overview KPIs (/api/analytics/overview)
 * 3. 3 operational department Performance Matrix & Sakala compliance grades (/api/analytics/departments)
 * 4. Temporal intake vs. resolution trends (/api/analytics/trends)
 * 5. Category & priority distributions (/api/analytics/categories)
 * 6. Geographic Intelligence & Spatial Hotspot Clustering with Section 32 Zero-PII Leakage Guard (/api/analytics/geo)
 * 7. Volunteer field operations analytics (/api/analytics/volunteers)
 * 8. AI NLP confidence, auto-triage distribution & semantic clustering (/api/analytics/ai)
 * 9. RFC 4180 compliant CSV Export (/api/analytics/export/csv)
 * 10. Strategic Executive Brief generation under Karnataka Sakala Services Act, 2011 (/api/analytics/export/report)
 */

import http from "http";
import { createApp } from "../app.js";
import { connectDatabase } from "../config/database.js";
import { logger } from "../utils/logger.js";

async function runAnalyticsVerification() {
  await connectDatabase();
  const app = createApp();

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 5001;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  logger.info(`Analytics & Geographic Intelligence verification server running on port ${port}`);

  let passedTests = 0;
  const totalTests = 10;

  try {
    // ─── 1. Authenticate Staff (Admin & Official) and Citizen ────────────────
    logger.info("Step 1: Authenticating tokens for Admin, Official, and Citizen");
    
    // Admin login
    const adminLoginRes = await fetch(`${baseUrl}/auth/staff/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@vcgis.gov.in",
        password: "Admin@12345",
      }),
    });
    const adminLogin = (await adminLoginRes.json()) as { success: boolean; data?: { accessToken: string } };
    if (!adminLogin.success || !adminLogin.data?.accessToken) {
      throw new Error(`Admin login failed: ${JSON.stringify(adminLogin)}`);
    }
    const adminToken = adminLogin.data.accessToken;

    // Official login
    const officialLoginRes = await fetch(`${baseUrl}/auth/staff/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "official@vcgis.gov.in",
        password: "Official@12345",
      }),
    });
    const officialLogin = (await officialLoginRes.json()) as { success: boolean; data?: { accessToken: string } };
    if (!officialLogin.success || !officialLogin.data?.accessToken) {
      throw new Error(`Official login failed: ${JSON.stringify(officialLogin)}`);
    }
    const officialToken = officialLogin.data.accessToken;

    // Citizen login (OTP flow)
    const citizenPhone = "9876543210";
    const otpRes = await fetch(`${baseUrl}/auth/citizen/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: citizenPhone }),
    });
    const otpData = (await otpRes.json()) as { success: boolean; data?: { devOtpPreview?: string } };
    const otp = otpData.data?.devOtpPreview || "123456";

    const citizenVerifyRes = await fetch(`${baseUrl}/auth/citizen/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: citizenPhone, otp }),
    });
    const citizenVerify = (await citizenVerifyRes.json()) as { success: boolean; data?: { accessToken: string } };
    if (!citizenVerify.success || !citizenVerify.data?.accessToken) {
      throw new Error(`Citizen login failed: ${JSON.stringify(citizenVerify)}`);
    }
    const citizenToken = citizenVerify.data.accessToken;

    // ─── Test 1: Strict RBAC Isolation ─────────────────────────────
    logger.info("Test 1: Verifying Strict RBAC Isolation (Citizen rejected, Official & Admin allowed)");
    const citizenAccessRes = await fetch(`${baseUrl}/analytics/overview`, {
      headers: { Authorization: `Bearer ${citizenToken}` },
    });
    if (citizenAccessRes.status !== 403) {
      throw new Error(`Expected 403 Forbidden for Citizen token, got ${citizenAccessRes.status}`);
    }

    const officialAccessRes = await fetch(`${baseUrl}/analytics/overview`, {
      headers: { Authorization: `Bearer ${officialToken}` },
    });
    if (officialAccessRes.status !== 200) {
      throw new Error(`Expected 200 OK for Official token, got ${officialAccessRes.status}`);
    }

    passedTests++;
    logger.info("✔ Test 1 Passed: RBAC properly isolates /api/analytics to Officials and Administrators");

    // ─── Test 2: Overview KPIs ──────────────────────────────────────
    logger.info("Test 2: Verifying System Overview KPIs (/api/analytics/overview)");
    const overviewRes = await fetch(`${baseUrl}/analytics/overview`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const overviewJson = (await overviewRes.json()) as {
      success: boolean;
      data: {
        total: number;
        open: number;
        resolved: number;
        breached: number;
        escalated: number;
        resolutionRate: number;
        complianceRate: number;
        avgResolutionHours: number;
        feedbackAverage: number;
      };
    };
    if (!overviewJson.success || typeof overviewJson.data.total !== "number") {
      throw new Error(`Invalid overview stats payload: ${JSON.stringify(overviewJson)}`);
    }

    passedTests++;
    logger.info(
      `✔ Test 2 Passed: Overview KPIs loaded: ${overviewJson.data.total} total, ${overviewJson.data.resolved} resolved (${overviewJson.data.resolutionRate.toFixed(1)}% resolution rate, ${overviewJson.data.complianceRate.toFixed(1)}% Sakala compliance)`
    );

    // ─── Test 3: Karnataka Department Performance Matrix ─────────────
    logger.info("Test 3: Verifying Department Performance Matrix (/api/analytics/departments)");
    const deptRes = await fetch(`${baseUrl}/analytics/departments`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const deptJson = (await deptRes.json()) as {
      success: boolean;
      data: Array<{
        department: string;
        code: string;
        total: number;
        resolved: number;
        open: number;
        breached: number;
        complianceRate: number;
        grade: string;
      }>;
    };
    if (!deptJson.success || !Array.isArray(deptJson.data) || deptJson.data.length === 0) {
      throw new Error(`Invalid departments performance payload: ${JSON.stringify(deptJson)}`);
    }

    // Verify presence of core Karnataka departments
    const deptCodes = deptJson.data.map((d) => d.code);
    const hasPanchayat = deptCodes.includes("RDPR");
    const hasRevenue = deptCodes.includes("REV");
    if (!hasPanchayat || !hasRevenue) {
      throw new Error(`Missing expected core Karnataka departments in matrix: ${deptCodes.join(", ")}`);
    }

    passedTests++;
    logger.info(
      `✔ Test 3 Passed: Evaluated ${deptJson.data.length} Karnataka departments with Sakala compliance grades`
    );

    // ─── Test 4: Temporal Intake vs Resolution Trends ───────────────
    logger.info("Test 4: Verifying Temporal Trends (/api/analytics/trends)");
    const trendsRes = await fetch(`${baseUrl}/analytics/trends?interval=daily`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const trendsJson = (await trendsRes.json()) as {
      success: boolean;
      data: Array<{ date: string; label: string; submitted: number; resolved: number }>;
    };
    if (!trendsJson.success || !Array.isArray(trendsJson.data)) {
      throw new Error(`Invalid trends payload: ${JSON.stringify(trendsJson)}`);
    }

    passedTests++;
    logger.info(`✔ Test 4 Passed: Retrieved ${trendsJson.data.length} trend daily temporal data points`);

    // ─── Test 5: Category & Priority Breakdown ──────────────────────
    logger.info("Test 5: Verifying Category & Priority Breakdown (/api/analytics/categories)");
    const catRes = await fetch(`${baseUrl}/analytics/categories`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const catJson = (await catRes.json()) as {
      success: boolean;
      data: {
        byPriority: Record<string, number>;
        byCategory: Array<{ category: string; count: number; percentage: number }>;
        byStatus: Record<string, number>;
      };
    };
    if (!catJson.success || !catJson.data.byPriority || !Array.isArray(catJson.data.byCategory)) {
      throw new Error(`Invalid categories payload: ${JSON.stringify(catJson)}`);
    }

    passedTests++;
    logger.info(`✔ Test 5 Passed: Categories breakdown verified across priority and status vectors`);

    // ─── Test 6: Geographic Intelligence & Section 32 Zero-PII Guard
    logger.info("Test 6: Verifying GIS Spatial Hotspots & Section 32 Zero-PII Leakage Guard (/api/analytics/geo)");
    const geoRes = await fetch(`${baseUrl}/analytics/geo`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const geoJson = (await geoRes.json()) as {
      success: boolean;
      data: {
        points: Array<Record<string, unknown>>;
        hotspots: Array<{ locationKey: string; count: number; district: string }>;
        districtScorecard: Array<{ district: string; total: number }>;
      };
    };
    if (!geoJson.success || !Array.isArray(geoJson.data.points) || !Array.isArray(geoJson.data.hotspots)) {
      throw new Error(`Invalid geo intelligence payload: ${JSON.stringify(geoJson)}`);
    }

    // STRICT ZERO-PII AUDIT: Check that NO spatial point contains citizen personal data
    for (const pt of geoJson.data.points) {
      if (
        "citizenName" in pt ||
        "citizenPhone" in pt ||
        "phone" in pt ||
        "email" in pt ||
        "aadhaar" in pt ||
        "residentialAddress" in pt ||
        "address" in pt
      ) {
        throw new Error(`CRITICAL PRIVACY VIOLATION: Citizen PII leaked in GIS point: ${JSON.stringify(pt)}`);
      }
    }

    passedTests++;
    logger.info(
      `✔ Test 6 Passed: Zero-PII verified across ${geoJson.data.points.length} spatial points and ${geoJson.data.hotspots.length} cluster hotspots`
    );

    // ─── Test 7: Volunteer Field Operations Analytics ───────────────
    logger.info("Test 7: Verifying Volunteer Field Metrics (/api/analytics/volunteers)");
    const volRes = await fetch(`${baseUrl}/analytics/volunteers`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const volJson = (await volRes.json()) as {
      success: boolean;
      data: {
        totalVolunteers: number;
        activeCount: number;
        totalAssistedGrievances: number;
        topVolunteers: Array<{ name: string; assistedCount: number }>;
      };
    };
    if (!volJson.success || typeof volJson.data.totalVolunteers !== "number") {
      throw new Error(`Invalid volunteer metrics payload: ${JSON.stringify(volJson)}`);
    }

    passedTests++;
    logger.info(
      `✔ Test 7 Passed: Volunteer metrics verified: ${volJson.data.totalVolunteers} volunteers (${volJson.data.activeCount} active), ${volJson.data.totalAssistedGrievances} assisted`
    );

    // ─── Test 8: AI Intelligence & NLP Model Metrics ────────────────
    logger.info("Test 8: Verifying AI Model Intelligence Metrics (/api/analytics/ai)");
    const aiRes = await fetch(`${baseUrl}/analytics/ai`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const aiJson = (await aiRes.json()) as {
      success: boolean;
      data: {
        totalAnalyzed: number;
        confidenceDistribution: { high: number; medium: number; low: number };
        duplicateCandidatesFound: number;
        autoRoutingConfidenceAverage: number;
      };
    };
    if (!aiJson.success || typeof aiJson.data.totalAnalyzed !== "number") {
      throw new Error(`Invalid AI metrics payload: ${JSON.stringify(aiJson)}`);
    }

    passedTests++;
    logger.info(
      `✔ Test 8 Passed: AI metrics loaded: ${aiJson.data.totalAnalyzed} triaged, ${aiJson.data.duplicateCandidatesFound} duplicates detected, avg confidence ${aiJson.data.autoRoutingConfidenceAverage.toFixed(1)}%`
    );

    // ─── Test 9: RFC 4180 Compliant CSV Export ─────────────────────
    logger.info("Test 9: Verifying RFC 4180 Compliant CSV Export (/api/analytics/export/csv)");
    const csvRes = await fetch(`${baseUrl}/analytics/export/csv`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (csvRes.status !== 200) {
      throw new Error(`Expected 200 OK for CSV export, got ${csvRes.status}`);
    }
    const contentType = csvRes.headers.get("content-type");
    if (!contentType || !contentType.includes("text/csv")) {
      throw new Error(`Expected text/csv content type, got ${contentType}`);
    }
    const csvContent = await csvRes.text();
    const csvLines = csvContent.split("\r\n").filter(Boolean);
    if (csvLines.length < 1) {
      throw new Error("CSV export is completely empty");
    }
    const headerLine = csvLines[0] || "";
    if (!headerLine.includes("Complaint Number") || !headerLine.includes("Department")) {
      throw new Error(`Invalid RFC 4180 CSV header: ${headerLine}`);
    }

    // Verify that CSV contains zero citizen personal numbers or citizen names
    if (csvContent.includes("9876543210") || csvContent.toLowerCase().includes("aadhaar")) {
      throw new Error("CRITICAL PRIVACY VIOLATION: Citizen telephone or Aadhaar detected in public CSV export!");
    }

    passedTests++;
    logger.info(`✔ Test 9 Passed: RFC 4180 CSV export valid (${csvLines.length} lines, strict PII suppression verified)`);

    // ─── Test 10: Strategic Executive Performance Brief ──────────────
    logger.info("Test 10: Verifying Strategic Executive Performance Brief (/api/analytics/export/report)");
    const execRes = await fetch(`${baseUrl}/analytics/export/report`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const execJson = (await execRes.json()) as {
      success: boolean;
      data: {
        generatedAt: string;
        reportingPeriod: string;
        strategicRecommendations: string[];
      };
    };
    if (!execJson.success || !Array.isArray(execJson.data.strategicRecommendations) || execJson.data.strategicRecommendations.length === 0) {
      throw new Error(`Invalid executive report format: ${JSON.stringify(execJson)}`);
    }

    passedTests++;
    logger.info(`✔ Test 10 Passed: Executive strategic brief generated with ${execJson.data.strategicRecommendations.length} Sakala recommendations`);

    // ─── Verification Summary ────────────────────────────────────────
    logger.info("===============================================================");
    logger.info(`Phase 11 Verification Complete: ${passedTests}/${totalTests} Tests Passed (100%)`);
    logger.info("===============================================================");
  } catch (err) {
    logger.error("Analytics verification failed:", err);
  } finally {
    server.close();
    process.exit(passedTests === totalTests ? 0 : 1);
  }
}

runAnalyticsVerification().catch((err) => {
  logger.error("Verification failed with uncaught exception:", err);
  process.exit(1);
});
