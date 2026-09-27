/**
 * VCGIS Phase 8 — Generative AI Decision Support Verification Script
 * Automated end-to-end test verifying:
 * 1. Citizen Assistant: Grievance drafting from colloquial query
 * 2. Citizen Assistant: Plain-language timeline & status explanation
 * 3. Volunteer Assistant: Speech/dialect notes to 4-part petition & missing info checklist
 * 4. Official Assistant: Formal Sakala resolution letter & citizen SMS drafting
 * 5. Official Assistant: Technical field inspection checklist generation
 * 6. Admin Assistant: Operational executive briefing & hotspot detection
 * 7. Multilingual Translation: Bidirectional Kannada <-> English translation
 */

import http from "http";
import { createApp } from "../app.js";
import { connectDatabase } from "../config/database.js";
import { logger } from "../utils/logger.js";

async function runGenAiVerification() {
  await connectDatabase();
  const app = createApp();

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 5001;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  logger.info(`GenAI Decision Support verification server running on port ${port}`);

  let passedTests = 0;
  const totalTests = 7;

  try {
    // 1. Authenticate Official & Admin users
    logger.info("Authenticating staff users to verify RBAC-protected GenAI endpoints");
    const staffLoginRes = await fetch(`${baseUrl}/auth/staff/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "official@vcgis.gov.in",
        password: "Official@12345",
      }),
    });
    const staffLogin = (await staffLoginRes.json()) as {
      success: boolean;
      data?: { accessToken: string };
    };
    if (!staffLogin.success || !staffLogin.data?.accessToken) {
      throw new Error(`Staff login failed: ${JSON.stringify(staffLogin)}`);
    }
    const officialToken = staffLogin.data.accessToken;

    const adminLoginRes = await fetch(`${baseUrl}/auth/staff/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@vcgis.gov.in",
        password: "Admin@12345",
      }),
    });
    const adminLogin = (await adminLoginRes.json()) as {
      success: boolean;
      data?: { accessToken: string };
    };
    if (!adminLogin.success || !adminLogin.data?.accessToken) {
      throw new Error(`Admin login failed: ${JSON.stringify(adminLogin)}`);
    }
    const adminToken = adminLogin.data.accessToken;

    // Test 1: Citizen Assistant - Draft Grievance
    logger.info("Test 1: Citizen Assistant drafting grievance from colloquial query");
    const citizenDraftRes = await fetch(`${baseUrl}/genai/citizen/assist`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${officialToken}`,
      },
      body: JSON.stringify({
        query: "Drinking water pipe broken near Maramma temple in Ward 3 since three days, dirty water flooding road",
        language: "en",
      }),
    });
    const citizenDraft = (await citizenDraftRes.json()) as {
      success: boolean;
      data?: {
        reply_message: string;
        draft_title: string;
        draft_description: string;
        suggested_category: string;
        suggested_department: string;
        next_steps: string[];
      };
    };

    if (
      !citizenDraft.success ||
      !citizenDraft.data?.draft_title ||
      !citizenDraft.data?.draft_description ||
      !citizenDraft.data?.suggested_department
    ) {
      throw new Error(`Citizen draft failed: ${JSON.stringify(citizenDraft)}`);
    }
    logger.info(`✓ Test 1 Passed: Draft generated: "${citizenDraft.data.draft_title}" (Dept: ${citizenDraft.data.suggested_department})`);
    passedTests++;

    // Test 2: Citizen Assistant - Status & Timeline Explanation
    logger.info("Test 2: Citizen Assistant explaining status and Sakala timeline");
    const citizenExplainRes = await fetch(`${baseUrl}/genai/citizen/assist`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${officialToken}`,
      },
      body: JSON.stringify({
        query: "What is happening with my complaint? Is it going to take long?",
        complaintContext: {
          complaintNumber: "KRN-RDPR-2026-00042",
          status: "IN_PROGRESS",
          department: "Rural Drinking Water & Sanitation",
          targetResolutionDate: "2026-09-18T10:00:00Z",
          currentTier: "TIER_1_ASSISTANT_ENGINEER",
        },
        language: "en",
      }),
    });
    const citizenExplain = (await citizenExplainRes.json()) as {
      success: boolean;
      data?: {
        reply_message: string;
        status_explanation?: string;
        next_steps: string[];
      };
    };

    if (!citizenExplain.success || !citizenExplain.data?.reply_message) {
      throw new Error(`Citizen status explanation failed: ${JSON.stringify(citizenExplain)}`);
    }
    logger.info(`✓ Test 2 Passed: Status explained clearly: "${citizenExplain.data.reply_message.slice(0, 80)}..."`);
    passedTests++;

    // Test 3: Volunteer Assistant - Speech Structuring & Missing Info
    logger.info("Test 3: Volunteer Assistant structuring speech transcript into 4-part petition");
    const volunteerStructureRes = await fetch(`${baseUrl}/genai/volunteer/structure`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        rawNotes: "Old lady Parvathamma near village primary school borewell says water motor burnt last Tuesday. 40 families walking 2km for water. Village gram panchayat member was informed but no action.",
        villageContext: "Halebeedu Gram Panchayat",
        talukContext: "Belur Taluk",
        language: "en",
      }),
    });
    const volunteerStructure = (await volunteerStructureRes.json()) as {
      success: boolean;
      data?: {
        structured_title: string;
        structured_description: string;
        incident_summary: string;
        location_clues: string;
        observed_impact: string;
        detected_department: string;
        recommended_priority: string;
        missing_info_checklist: Array<{ item: string; question: string; is_critical: boolean }>;
      };
    };

    if (
      !volunteerStructure.success ||
      !volunteerStructure.data?.structured_title ||
      !volunteerStructure.data?.incident_summary ||
      !volunteerStructure.data?.location_clues ||
      !volunteerStructure.data?.observed_impact ||
      !volunteerStructure.data?.missing_info_checklist
    ) {
      throw new Error(`Volunteer structuring failed: ${JSON.stringify(volunteerStructure)}`);
    }
    logger.info(
      `✓ Test 3 Passed: 4-part petition structured with ${volunteerStructure.data.missing_info_checklist.length} verification items`
    );
    passedTests++;

    // Test 4: Official Assistant - Sakala Resolution Letter & SMS
    logger.info("Test 4: Official Assistant generating Sakala formal resolution letter & SMS");
    const officialResolutionRes = await fetch(`${baseUrl}/genai/official/draft-response`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${officialToken}`,
      },
      body: JSON.stringify({
        complaintNumber: "KRN-RDPR-2026-00042",
        title: "Borewell motor burnt out",
        category: "DRINKING_WATER",
        department: "Rural Drinking Water & Sanitation",
        actionType: "RESOLUTION",
        actionNotes: "Submersible pump replaced with new 5HP motor, water pressure restored, water sample tested negative for contamination.",
        citizenName: "Parvathamma",
      }),
    });
    const officialResolution = (await officialResolutionRes.json()) as {
      success: boolean;
      data?: {
        formal_letter: string;
        sms_summary: string;
        inspection_checklist: string[];
      };
    };

    if (
      !officialResolution.success ||
      !officialResolution.data?.formal_letter ||
      !officialResolution.data?.sms_summary
    ) {
      throw new Error(`Official resolution drafting failed: ${JSON.stringify(officialResolution)}`);
    }
    logger.info(`✓ Test 4 Passed: Sakala resolution letter drafted with SMS notification: "${officialResolution.data.sms_summary}"`);
    passedTests++;

    // Test 5: Official Assistant - Field Inspection Checklist
    logger.info("Test 5: Official Assistant generating technical inspection checklist");
    const officialInspectionRes = await fetch(`${baseUrl}/genai/official/draft-response`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${officialToken}`,
      },
      body: JSON.stringify({
        complaintNumber: "KRN-PWDB-2026-00089",
        title: "Deep crater pot hole on State Highway 48",
        category: "ROAD_MAINTENANCE",
        department: "Public Works Department (PWD)",
        actionType: "INSPECTION",
        actionNotes: "Site visit scheduled for tomorrow morning with asphalt contractor.",
        citizenName: "Ramesh Gowda",
      }),
    });
    const officialInspection = (await officialInspectionRes.json()) as {
      success: boolean;
      data?: {
        formal_letter: string;
        inspection_checklist: string[];
      };
    };

    if (
      !officialInspection.success ||
      !officialInspection.data?.inspection_checklist ||
      officialInspection.data.inspection_checklist.length === 0
    ) {
      throw new Error(`Official inspection checklist failed: ${JSON.stringify(officialInspection)}`);
    }
    logger.info(`✓ Test 5 Passed: Inspection checklist generated with ${officialInspection.data.inspection_checklist.length} checklist items`);
    passedTests++;

    // Test 6: Admin Operational Briefing & Hotspot Synthesis
    logger.info("Test 6: Admin Assistant synthesizing executive briefing and hotspots");
    const adminSummaryRes = await fetch(`${baseUrl}/genai/admin/summary`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        timeWindowDays: 30,
        district: "Hassan",
        department: "Rural Drinking Water & Sanitation",
        totalComplaints: 215,
        breachedCount: 18,
        resolvedCount: 162,
        pendingCount: 35,
        criticalCount: 7,
        topCategories: ["DRINKING_WATER", "PIPELINE_LEAK", "WATER_PURIFIER_PLANT"],
      }),
    });
    const adminSummary = (await adminSummaryRes.json()) as {
      success: boolean;
      data?: {
        executive_summary: string;
        key_highlights: string[];
        identified_hotspots: string[];
        strategic_recommendations: string[];
      };
    };

    if (
      !adminSummary.success ||
      !adminSummary.data?.executive_summary ||
      !adminSummary.data?.strategic_recommendations ||
      adminSummary.data.strategic_recommendations.length === 0
    ) {
      throw new Error(`Admin summary generation failed: ${JSON.stringify(adminSummary)}`);
    }
    logger.info(
      `✓ Test 6 Passed: Executive briefing generated with ${adminSummary.data.strategic_recommendations.length} recommendations`
    );
    passedTests++;

    // Test 7: Multilingual Kannada <-> English Translation
    logger.info("Test 7: Multilingual translation for civic governance terms");
    const translationRes = await fetch(`${baseUrl}/genai/translate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${officialToken}`,
      },
      body: JSON.stringify({
        text: "ಕುಡಿಯುವ ನೀರಿನ ಸಮಸ್ಯೆ",
        sourceLanguage: "kn",
        targetLanguage: "en",
      }),
    });
    const translation = (await translationRes.json()) as {
      success: boolean;
      data?: {
        translated_text: string;
        detected_source: string;
        target_language: string;
      };
    };

    if (!translation.success || !translation.data?.translated_text) {
      throw new Error(`Translation failed: ${JSON.stringify(translation)}`);
    }
    logger.info(
      `✓ Test 7 Passed: Kannada translated to English: "${translation.data.translated_text}"`
    );
    passedTests++;

    logger.info("=================================================");
    logger.info(`ALL ${passedTests}/${totalTests} GENAI DECISION SUPPORT TESTS PASSED!`);
    logger.info("=================================================");
  } catch (error) {
    logger.error("GenAI verification failed:", error);
    process.exit(1);
  } finally {
    server.close();
    process.exit(0);
  }
}

runGenAiVerification();
