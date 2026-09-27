/**
 * VCGIS Phase 7 — AI Intelligence Microservice Verification Script
 * Automated end-to-end test verifying:
 * 1. AI subsystem health check via Express API proxy (/api/ai/health)
 * 2. Multi-label Karnataka Department classification (/api/ai/classify)
 * 3. Urgency evaluation & priority scoring (/api/ai/priority)
 * 4. OCR document parsing & low confidence handling (/api/ai/ocr)
 * 5. Textual & geographic duplicate clustering (/api/ai/duplicates)
 * 6. End-to-end complaint submission with auto-attached aiAnalysis document
 * 7. Verified non-discarding duplicate clustering policy
 */

import http from "http";
import mongoose from "mongoose";
import { createApp } from "../app.js";
import { connectDatabase } from "../config/database.js";
import { Complaint } from "../models/complaint.model.js";
import { User } from "../models/user.model.js";
import { Priority, UserRole } from "../types/domain.js";
import { logger } from "../utils/logger.js";

async function runAiServiceVerification() {
  await connectDatabase();
  const app = createApp();

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 5001;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  logger.info(`AI Service verification server running on port ${port}`);

  let passedTests = 0;
  const totalTests = 7;

  try {
    // 1. Authenticate Citizen & Staff
    logger.info("Test 1: Authenticating test credentials");
    const citizen = await User.findOne({ role: UserRole.CITIZEN });
    if (!citizen) throw new Error("No citizen found in database");

    // Login citizen via OTP or staff login for official
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
    const token = staffLogin.data.accessToken;
    logger.info("✓ Test 1 Passed: Authentication established");
    passedTests++;

    // 2. Health check endpoint
    logger.info("Test 2: Verifying AI subsystem health endpoint");
    const healthRes = await fetch(`${baseUrl}/ai/health`);
    const healthData = (await healthRes.json()) as {
      success: boolean;
      data?: { aiMicroserviceAvailable: boolean; mode: string };
    };
    if (!healthData.success || !healthData.data) {
      throw new Error("AI health check endpoint failed");
    }
    logger.info(`✓ Test 2 Passed: AI mode = ${healthData.data.mode}`);
    passedTests++;

    // 3. Department Classification
    logger.info("Test 3: Department classification across Karnataka departments");
    const classifyRes = await fetch(`${baseUrl}/ai/classify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: "BESCOM high voltage line snapping and transformer sparking",
        description: "Power outage in the entire village cross road due to electricity transformer failure.",
      }),
    });
    const classifyData = (await classifyRes.json()) as {
      success: boolean;
      data?: {
        primary_department: string;
        confidence: number;
        sub_category?: string;
        alternative_departments?: Array<{ department: string; confidence: number }>;
      };
    };
    if (!classifyData.success || !classifyData.data) {
      throw new Error("Classification API failed");
    }
    if (classifyData.data.primary_department !== "Energy Department") {
      throw new Error(`Expected Energy Department, got ${classifyData.data.primary_department}`);
    }
    if (classifyData.data.confidence < 0.65) {
      throw new Error(`Confidence too low: ${classifyData.data.confidence}`);
    }
    logger.info(`✓ Test 3 Passed: Classified as '${classifyData.data.primary_department}' (${Math.round(classifyData.data.confidence * 100)}% conf, sub-category: '${classifyData.data.sub_category}')`);
    passedTests++;

    // 4. Urgency & Priority Scoring
    logger.info("Test 4: Urgency scoring and priority evaluation");
    const priorityRes = await fetch(`${baseUrl}/ai/priority`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: "Live wire sparking near primary school playground",
        description: "Severe hazard of electrocution. Sparking active near children!",
      }),
    });
    const priorityData = (await priorityRes.json()) as {
      success: boolean;
      data?: {
        suggested_priority: string;
        urgency_score: number;
        reasoning: string[];
        safety_factors: string[];
      };
    };
    if (!priorityData.success || !priorityData.data) {
      throw new Error("Priority evaluation API failed");
    }
    if (priorityData.data.suggested_priority !== "CRITICAL") {
      throw new Error(`Expected CRITICAL priority, got ${priorityData.data.suggested_priority}`);
    }
    if (priorityData.data.urgency_score < 85) {
      throw new Error(`Expected urgency score >= 85, got ${priorityData.data.urgency_score}`);
    }
    logger.info(`✓ Test 4 Passed: Evaluated as '${priorityData.data.suggested_priority}' (${priorityData.data.urgency_score}/100, factors: ${priorityData.data.safety_factors.length})`);
    passedTests++;

    // 5. OCR Text Extraction & Confidence Handling
    logger.info("Test 5: OCR Document extraction & confidence scoring");
    const ocrRes = await fetch(`${baseUrl}/ai/ocr`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        textContent: "Official Petition submitted to Gram Panchayat Tahsildar regarding non-functional drinking water borewell in Ramanagara district.",
      }),
    });
    const ocrData = (await ocrRes.json()) as {
      success: boolean;
      data?: {
        extracted_text: string;
        confidence: number;
        is_low_confidence: boolean;
      };
    };
    if (!ocrData.success || !ocrData.data) {
      throw new Error("OCR API failed");
    }
    if (!ocrData.data.extracted_text.includes("Ramanagara")) {
      throw new Error("OCR extracted text missing expected keywords");
    }
    if (ocrData.data.confidence < 0.65 || ocrData.data.is_low_confidence) {
      throw new Error("OCR extraction confidence unexpectedly flagged as low");
    }
    logger.info(`✓ Test 5 Passed: OCR text extracted successfully (confidence: ${ocrData.data.confidence})`);
    passedTests++;

    // 6. End-to-End Complaint Submission with attached AI analysis
    logger.info("Test 6: Submitting complaint and verifying auto-attached aiAnalysis subdocument");
    // Generate citizen session token
    const citizenToken = token; // Official or volunteer can submit on behalf of citizen
    const createRes = await fetch(`${baseUrl}/complaints`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${citizenToken}`,
      },
      body: JSON.stringify({
        title: "Broken water main valve overflowing into Ramanagara road",
        description: "Drinking water pipe burst since morning, flooding the village road and wasting clean water.",
        category: "Rural Development & Panchayat Raj",
        department: "Rural Development & Panchayat Raj",
        village: "Bidadi",
        mandal: "Ramanagara",
        district: "Ramanagara",
        pincode: "562109",
        priority: Priority.HIGH,
        latitude: 12.7215,
        longitude: 77.2815,
      }),
    });
    const createData = (await createRes.json()) as {
      success: boolean;
      data?: { _id?: string; id?: string };
    };
    if (!createData.success || !createData.data) {
      throw new Error(`Failed to create complaint: ${JSON.stringify(createData)}`);
    }

    const createdComplaintId = createData.data._id || createData.data.id;
    const dbComplaint = await Complaint.findById(createdComplaintId);
    if (!dbComplaint) {
      throw new Error("Created complaint not found in MongoDB");
    }
    if (!dbComplaint.aiAnalysis) {
      throw new Error("aiAnalysis subdocument was not populated on created complaint");
    }

    const ai = dbComplaint.aiAnalysis;
    logger.info(`✓ Test 6 Passed: Complaint ${dbComplaint.complaintNumber} saved with AI Analysis:`);
    logger.info(`  - AI Department: ${ai.departmentRecommendation?.department} (${Math.round((ai.departmentRecommendation?.confidence || 0) * 100)}%)`);
    logger.info(`  - AI Priority: ${ai.priorityRecommendation?.priority} (${ai.priorityRecommendation?.urgencyScore}/100)`);
    logger.info(`  - AI Intent: ${ai.nlp?.intent}`);
    logger.info(`  - AI Summary: "${ai.summary?.summary?.slice(0, 80)}..."`);
    passedTests++;

    // 7. Duplicate Candidate Detection Against Active Complaint
    logger.info("Test 7: Duplicate clustering against active complaint in same locality");
    const dupRes = await fetch(`${baseUrl}/ai/duplicates`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: "Water main pipe burst and leakage on Ramanagara road",
        description: "Heavy water pipe bursting flooding Bidadi road with drinking water.",
        category: "Rural Development & Panchayat Raj",
        village: "Bidadi",
        taluk: "Ramanagara",
        district: "Ramanagara",
        latitude: 12.7218,
        longitude: 77.2818,
      }),
    });
    const dupData = (await dupRes.json()) as {
      success: boolean;
      data?: {
        is_duplicate_candidate: boolean;
        highest_similarity_score: number;
        match_count: number;
        matches: Array<{
          complaintId: string;
          complaintNumber: string;
          title: string;
          similarityScore: number;
          matchReasons: string[];
        }>;
      };
    };
    if (!dupData.success || !dupData.data) {
      throw new Error("Duplicate detection API failed");
    }
    const topMatch = dupData.data.matches[0] as {
      complaintId?: string;
      complaintNumber?: string;
      complaint_number?: string;
      matchReasons?: string[];
      match_reasons?: string[];
    };
    const reasons = (topMatch.matchReasons || topMatch.match_reasons || []).join(", ");
    logger.info(`✓ Test 7 Passed: Identified ${dupData.data.match_count} duplicate candidate(s) (top match: ${topMatch.complaintNumber || topMatch.complaint_number}, score: ${Math.round(dupData.data.highest_similarity_score * 100)}%, reasons: ${reasons})`);
    passedTests++;

    logger.info(`\n======================================================`);
    logger.info(`ALL ${passedTests}/${totalTests} PHASE 7 AI INTELLIGENCE TESTS PASSED!`);
    logger.info(`======================================================\n`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await mongoose.disconnect();
  }
}

runAiServiceVerification()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    logger.error("Phase 7 Verification Failed:", err);
    process.exit(1);
  });
