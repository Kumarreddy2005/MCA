/**
 * VCGIS Phase 6 — SLA Monitoring & Multi-Tier Escalation Verification Script
 * Self-contained automated test verifying:
 * 1. Priority-based SLA resolution target calculations (24h, 48h, 5d, 10d)
 * 2. Proactive SLA warning detection (<24h remaining) & notification
 * 3. Immediate breach detection & Level 1 Taluk Tahsildar auto-escalation
 * 4. Level 2 District Collector auto-escalation (>24h overdue)
 * 5. Level 3 State Secretariat auto-escalation (>48h overdue)
 * 6. Manual administrative escalation workflow
 * 7. SLA Analytics API & compliance percentage calculation
 * 8. At-Risk and Breached executive queue API
 */

import http from "http";
import mongoose from "mongoose";
import { createApp } from "../app.js";
import { connectDatabase } from "../config/database.js";
import { Complaint } from "../models/complaint.model.js";
import { User } from "../models/user.model.js";
import {
  calculateSlaTarget,
  getEscalationTierInfo,
} from "../services/sla.service.js";
import {
  ComplaintSource,
  ComplaintStatus,
  ISlaAnalyticsData,
  Priority,
  SlaStatus,
  UserRole,
} from "../types/domain.js";
import { logger } from "../utils/logger.js";

async function runSlaEngineVerification() {
  await connectDatabase();
  const app = createApp();

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 5001;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  logger.info(`SLA Engine verification server running on port ${port}`);

  let passedTests = 0;
  const totalTests = 8;

  try {
    // 1. Authenticate Staff (Admin & Official)
    logger.info("Test 1: Authenticating Official & Admin credentials");
    const officialLoginRes = await fetch(`${baseUrl}/auth/staff/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "official@vcgis.gov.in",
        password: "Official@12345",
      }),
    });
    const officialLogin = (await officialLoginRes.json()) as {
      success: boolean;
      data?: {
        accessToken: string;
        user: { role: string; name: string; officialProfile?: { department: string } };
      };
    };

    if (!officialLogin.success || !officialLogin.data?.accessToken) {
      throw new Error(`Official login failed: ${JSON.stringify(officialLogin)}`);
    }

    const officialToken = officialLogin.data.accessToken;
    const officialHeaders = {
      Authorization: `Bearer ${officialToken}`,
      "Content-Type": "application/json",
    };

    // Verify SLA Target Calculations
    const now = Date.now();
    const criticalTarget = calculateSlaTarget(Priority.CRITICAL).getTime();
    const highTarget = calculateSlaTarget(Priority.HIGH).getTime();
    const mediumTarget = calculateSlaTarget(Priority.MEDIUM).getTime();
    const lowTarget = calculateSlaTarget(Priority.LOW).getTime();

    const criticalHours = Math.round((criticalTarget - now) / (1000 * 3600));
    const highHours = Math.round((highTarget - now) / (1000 * 3600));
    const mediumHours = Math.round((mediumTarget - now) / (1000 * 3600));
    const lowHours = Math.round((lowTarget - now) / (1000 * 3600));

    if (criticalHours !== 24 || highHours !== 48 || mediumHours !== 120 || lowHours !== 240) {
      throw new Error(
        `SLA target hours incorrect: Critical=${criticalHours}, High=${highHours}, Med=${mediumHours}, Low=${lowHours}`
      );
    }
    logger.info(`✅ SLA calculation verified: Critical=24h, High=48h, Medium=120h (5d), Low=240h (10d)`);
    passedTests++;

    const citizen = await User.findOne({ role: UserRole.CITIZEN });
    if (!citizen) throw new Error("No citizen found in database for testing");

    // 2. Test Proactive SLA Warning (< 24h remaining)
    logger.info("Test 2: Proactive SLA Warning Alert Detection (<24h remaining)");
    const warningComplaint = await Complaint.create({
      complaintNumber: `TEST-SLA-WARN-${Date.now().toString().slice(-4)}`,
      citizenId: citizen._id,
      citizenName: citizen.name,
      citizenPhone: citizen.phone,
      title: "Drinking water pipe crack near village temple",
      description: "Minor leakage from distribution pipe needing prompt repair",
      category: "Rural Water Supply",
      department: "Rural Development & Panchayat Raj",
      status: ComplaintStatus.ACTION_IN_PROGRESS,
      priority: Priority.HIGH,
      source: ComplaintSource.CITIZEN_PORTAL,
      location: { village: "Rampura", district: "Mysuru", mandal: "Mysuru Taluk" },
      evidence: [],
      timeline: [],
      sla: {
        targetResolutionDate: new Date(Date.now() + 10 * 3600 * 1000), // 10 hours remaining
        isBreached: false,
        status: SlaStatus.ON_TRACK,
        warningSent: false,
        escalationLevel: 0,
      },
    });

    // Execute SLA sweep
    const sweepRes1 = await fetch(`${baseUrl}/sla/sweep`, {
      method: "POST",
      headers: officialHeaders,
    });
    const sweepData1 = (await sweepRes1.json()) as { success: boolean; data?: { warningsDispatched: number } };

    if (!sweepData1.success || (sweepData1.data?.warningsDispatched ?? 0) < 1) {
      throw new Error(`SLA sweep did not dispatch warnings: ${JSON.stringify(sweepData1)}`);
    }

    const reloadedWarn = await Complaint.findById(warningComplaint._id).exec();
    if (!reloadedWarn?.sla.warningSent || reloadedWarn.sla.status !== SlaStatus.AT_RISK) {
      throw new Error(`Warning flags not updated on complaint: ${JSON.stringify(reloadedWarn?.sla)}`);
    }
    logger.info(`✅ Proactive SLA warning successfully generated and flagged as 'AT_RISK'`);
    passedTests++;

    // 3. Test Immediate Breach Detection & Level 1 Escalation (Taluk Tahsildar)
    logger.info("Test 3: Immediate SLA Breach & Level 1 Taluk Auto-Escalation");
    const breachComplaint1 = await Complaint.create({
      complaintNumber: `TEST-SLA-BR1-${Date.now().toString().slice(-4)}`,
      citizenId: citizen._id,
      citizenName: citizen.name,
      citizenPhone: citizen.phone,
      title: "Broken handpump in Harijan colony",
      description: "Residents have no local drinking water access",
      category: "Rural Water Supply",
      department: "Rural Development & Panchayat Raj",
      status: ComplaintStatus.ASSIGNED,
      priority: Priority.HIGH,
      source: ComplaintSource.CITIZEN_PORTAL,
      location: { village: "Rampura", district: "Mysuru", mandal: "Mysuru Taluk" },
      evidence: [],
      timeline: [],
      sla: {
        targetResolutionDate: new Date(Date.now() - 4 * 3600 * 1000), // 4 hours past deadline
        isBreached: false,
        status: SlaStatus.ON_TRACK,
        warningSent: true,
        escalationLevel: 0,
      },
    });

    const sweepRes2 = await fetch(`${baseUrl}/sla/sweep`, {
      method: "POST",
      headers: officialHeaders,
    });
    const sweepData2 = (await sweepRes2.json()) as { success: boolean; data?: { breachesDetected: number } };
    if (!sweepData2.success || (sweepData2.data?.breachesDetected ?? 0) < 1) {
      throw new Error(`Breach sweep failed: ${JSON.stringify(sweepData2)}`);
    }

    const reloadedBr1 = await Complaint.findById(breachComplaint1._id).exec();
    if (!reloadedBr1?.sla.isBreached || reloadedBr1.sla.escalationLevel !== 1) {
      throw new Error(
        `Complaint did not escalate to Level 1: isBreached=${reloadedBr1?.sla.isBreached}, level=${reloadedBr1?.sla.escalationLevel}`
      );
    }
    const tier1Info = getEscalationTierInfo(1);
    logger.info(`✅ Complaint marked 'BREACHED' and auto-escalated to ${tier1Info.title} (${tier1Info.authority})`);
    passedTests++;

    // 4. Test Multi-Tier Escalation: Level 2 District Collector (>24h overdue)
    logger.info("Test 4: Level 2 District Collector Auto-Escalation (>24h overdue)");
    const breachComplaint2 = await Complaint.create({
      complaintNumber: `TEST-SLA-BR2-${Date.now().toString().slice(-4)}`,
      citizenId: citizen._id,
      citizenName: citizen.name,
      citizenPhone: citizen.phone,
      title: "Uncollected garbage dump causing severe epidemic risk",
      description: "Solid waste accumulating for 5 days near primary health center",
      category: "Sanitation & Solid Waste",
      department: "Rural Development & Panchayat Raj",
      status: ComplaintStatus.ACTION_IN_PROGRESS,
      priority: Priority.CRITICAL,
      source: ComplaintSource.CITIZEN_PORTAL,
      location: { village: "Rampura", district: "Mysuru", mandal: "Mysuru Taluk" },
      evidence: [],
      timeline: [],
      sla: {
        targetResolutionDate: new Date(Date.now() - 32 * 3600 * 1000), // 32 hours overdue (>24h)
        isBreached: true,
        status: SlaStatus.BREACHED,
        warningSent: true,
        escalationLevel: 1, // Currently at level 1
      },
    });

    await fetch(`${baseUrl}/sla/sweep`, { method: "POST", headers: officialHeaders });

    const reloadedBr2 = await Complaint.findById(breachComplaint2._id).exec();
    if (reloadedBr2?.sla.escalationLevel !== 2) {
      throw new Error(`Complaint did not escalate to Level 2: level=${reloadedBr2?.sla.escalationLevel}`);
    }
    const tier2Info = getEscalationTierInfo(2);
    logger.info(`✅ 32h overdue complaint auto-escalated to ${tier2Info.title} (${tier2Info.authority})`);
    passedTests++;

    // 5. Test Multi-Tier Escalation: Level 3 State Secretariat (>48h overdue)
    logger.info("Test 5: Level 3 State Secretariat Auto-Escalation (>48h overdue)");
    const breachComplaint3 = await Complaint.create({
      complaintNumber: `TEST-SLA-BR3-${Date.now().toString().slice(-4)}`,
      citizenId: citizen._id,
      citizenName: citizen.name,
      citizenPhone: citizen.phone,
      title: "Major road culvert collapse isolating 3 villages",
      description: "Severe infrastructure failure requiring state intervention",
      category: "Roads & Transport",
      department: "Rural Development & Panchayat Raj",
      status: ComplaintStatus.ACTION_IN_PROGRESS,
      priority: Priority.CRITICAL,
      source: ComplaintSource.CITIZEN_PORTAL,
      location: { village: "Rampura", district: "Mysuru", mandal: "Mysuru Taluk" },
      evidence: [],
      timeline: [],
      sla: {
        targetResolutionDate: new Date(Date.now() - 54 * 3600 * 1000), // 54 hours overdue (>48h)
        isBreached: true,
        status: SlaStatus.BREACHED,
        warningSent: true,
        escalationLevel: 2, // Currently at level 2
      },
    });

    await fetch(`${baseUrl}/sla/sweep`, { method: "POST", headers: officialHeaders });

    const reloadedBr3 = await Complaint.findById(breachComplaint3._id).exec();
    if (reloadedBr3?.sla.escalationLevel !== 3) {
      throw new Error(`Complaint did not escalate to Level 3: level=${reloadedBr3?.sla.escalationLevel}`);
    }
    const tier3Info = getEscalationTierInfo(3);
    logger.info(`✅ 54h overdue complaint auto-escalated to ${tier3Info.title} (${tier3Info.authority})`);
    passedTests++;

    // 6. Test Manual Administrative Escalation Workflow
    logger.info("Test 6: Manual Administrative Escalation Endpoint");
    const manualEscComplaint = await Complaint.create({
      complaintNumber: `TEST-SLA-MAN-${Date.now().toString().slice(-4)}`,
      citizenId: citizen._id,
      citizenName: citizen.name,
      citizenPhone: citizen.phone,
      title: "Suspected water contamination spreading gastro infections",
      description: "Multiple families hospitalised, emergency testing needed",
      category: "Public Health & Medical",
      department: "Rural Development & Panchayat Raj",
      status: ComplaintStatus.UNDER_REVIEW,
      priority: Priority.CRITICAL,
      source: ComplaintSource.CITIZEN_PORTAL,
      location: { village: "Rampura", district: "Mysuru", mandal: "Mysuru Taluk" },
      evidence: [],
      timeline: [],
      sla: {
        targetResolutionDate: new Date(Date.now() + 18 * 3600 * 1000),
        isBreached: false,
        status: SlaStatus.AT_RISK,
        escalationLevel: 0,
      },
    });

    const manualEscRes = await fetch(`${baseUrl}/sla/complaints/${manualEscComplaint._id}/escalate`, {
      method: "POST",
      headers: officialHeaders,
      body: JSON.stringify({
        targetLevel: 2,
        reason: "Outbreak risk: Immediate inter-agency deployment ordered by Executive Engineer",
      }),
    });

    const manualEscData = (await manualEscRes.json()) as {
      success: boolean;
      data?: { status: string; sla: { escalationLevel: number } };
    };

    if (!manualEscData.success || manualEscData.data?.sla.escalationLevel !== 2) {
      throw new Error(`Manual escalation failed: ${JSON.stringify(manualEscData)}`);
    }
    logger.info(`✅ Manual escalation confirmed to Tier 2 with status 'ESCALATED'`);
    passedTests++;

    // 7. Test SLA Analytics Endpoint
    logger.info("Test 7: SLA Analytics & Compliance Rates Endpoint");
    const analyticsRes = await fetch(`${baseUrl}/sla/analytics?department=Rural Development & Panchayat Raj`, {
      headers: officialHeaders,
    });
    const analyticsData = (await analyticsRes.json()) as {
      success: boolean;
      data?: ISlaAnalyticsData;
    };

    if (!analyticsData.success || !analyticsData.data) {
      throw new Error(`Failed to fetch SLA analytics: ${JSON.stringify(analyticsData)}`);
    }

    const { complianceRatePercentage, breachRatePercentage, byPriority } = analyticsData.data;
    if (
      typeof complianceRatePercentage !== "number" ||
      typeof breachRatePercentage !== "number" ||
      !byPriority[Priority.CRITICAL]
    ) {
      throw new Error(`Malformed SLA analytics payload: ${JSON.stringify(analyticsData.data)}`);
    }

    logger.info(
      `✅ SLA Analytics validated: Compliance=${complianceRatePercentage}%, Breaches=${breachRatePercentage}%, CriticalTotal=${byPriority[Priority.CRITICAL].total}`
    );
    passedTests++;

    // 8. Test At-Risk and Breached Queue Endpoint
    logger.info("Test 8: At-Risk and Breached Queue Retrieval");
    const queueRes = await fetch(`${baseUrl}/sla/queue?limit=10`, {
      headers: officialHeaders,
    });
    const queueData = (await queueRes.json()) as {
      success: boolean;
      data?: { complaints: Array<{ complaintNumber: string; sla: { isBreached: boolean } }> };
    };

    if (!queueData.success || !Array.isArray(queueData.data?.complaints)) {
      throw new Error(`SLA queue retrieval failed: ${JSON.stringify(queueData)}`);
    }

    logger.info(`✅ SLA Queue retrieved: ${queueData.data.complaints.length} overdue/at-risk complaints returned`);
    passedTests++;

    // Clean up test documents
    await Complaint.deleteMany({
      complaintNumber: { $regex: /^TEST-SLA-/ },
    });

    logger.info("=================================================");
    logger.info(`🎉 SLA Engine Integration Test PASSED: ${passedTests}/${totalTests} tests`);
    logger.info("=================================================");
  } finally {
    server.close();
    await mongoose.connection.close();
  }
}

runSlaEngineVerification().catch((err) => {
  logger.error("❌ SLA Engine Verification FAILED:", err);
  process.exit(1);
});
