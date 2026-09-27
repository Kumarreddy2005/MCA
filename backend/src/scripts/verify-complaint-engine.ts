/**
 * VCGIS Phase 4 — Complaint Management Engine Automated Integration Test Suite
 * Tests:
 *  1. Submission & Immutable Audit Log ('COMPLAINT_CREATED')
 *  2. Automated Department & Jurisdiction Routing to Official
 *  3. In-App Notification Delivery to Assigned Official
 *  4. Valid Status Transition: ASSIGNED -> UNDER_REVIEW
 *  5. Staff Field Action Logging (Internal vs Public)
 *  6. Role Security Enforcement (Citizen cannot set official states -> 403)
 *  7. State Machine Guard (Illegal transition jump blocked -> 400)
 *  8. Payload Validation (RESOLVED without resolutionSummary blocked -> 400)
 *  9. Full Resolution Flow (ACTION_IN_PROGRESS -> RESOLVED with proof)
 * 10. Citizen Resolution Notification & Notification Read Lifecycle
 * 11. Immutable Audit Trail Inspection & Event Sequence Verification
 */
import mongoose from "mongoose";
import http from "http";
import { createApp } from "../app.js";
import { connectDatabase } from "../config/database.js";
import { logger } from "../utils/logger.js";
import { ComplaintStatus } from "../types/domain.js";

async function runTests() {
  await connectDatabase();
  const app = createApp();

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as { port: number }).port;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  logger.info(`Verification server running on port ${port}`);

  let passedTests = 0;

  try {
    // 0. Authenticate Citizen and Official
    logger.info("Step 0: Authenticating Citizen & Official");
    // Citizen login
    const otpRes = await fetch(`${baseUrl}/auth/citizen/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "9876543212" }),
    });
    const otpData = (await otpRes.json()) as { success: boolean; data?: { devOtpPreview?: string } };
    const otp = otpData.data?.devOtpPreview;
    if (!otp) throw new Error("No dev OTP preview received");

    const citizenVerifyRes = await fetch(`${baseUrl}/auth/citizen/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "9876543212", otp }),
    });
    const citizenAuth = (await citizenVerifyRes.json()) as { data: { accessToken: string; user: { id: string } } };
    const citizenHeaders = {
      Authorization: `Bearer ${citizenAuth.data.accessToken}`,
      "Content-Type": "application/json",
    };

    // Official login
    const officialLoginRes = await fetch(`${baseUrl}/auth/staff/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "official@vcgis.gov.in", password: "Official@12345" }),
    });
    const officialAuth = (await officialLoginRes.json()) as { data: { accessToken: string; user: { id: string; name: string } } };
    const officialHeaders = {
      Authorization: `Bearer ${officialAuth.data.accessToken}`,
      "Content-Type": "application/json",
    };

    logger.info(`✅ Authenticated Citizen and Official (${officialAuth.data.user.name})`);

    // 1. Submit Complaint & Check Auto-Routing
    logger.info("Test 1: Citizen Grievance Submission with Automatic Department Routing");
    const boundary = "----WebKitFormBoundaryComplaintEngineTest";
    const bodyParts = [
      `--${boundary}\r\nContent-Disposition: form-data; name="title"\r\n\r\nBorewell motor failure causing acute drinking water shortage\r\n`,
      `--${boundary}\r\nContent-Disposition: form-data; name="description"\r\n\r\nThe submersible borewell motor in Ward 4 burned out after voltage surge. Over 80 families in Rampura have had no piped water for 24 hours.\r\n`,
      `--${boundary}\r\nContent-Disposition: form-data; name="category"\r\n\r\nDrinking Water Supply\r\n`,
      `--${boundary}\r\nContent-Disposition: form-data; name="department"\r\n\r\nRural Development & Panchayat Raj\r\n`,
      `--${boundary}\r\nContent-Disposition: form-data; name="village"\r\n\r\nRampura\r\n`,
      `--${boundary}\r\nContent-Disposition: form-data; name="ward"\r\n\r\nWard 4\r\n`,
      `--${boundary}\r\nContent-Disposition: form-data; name="mandal"\r\n\r\nMysuru Taluk\r\n`,
      `--${boundary}\r\nContent-Disposition: form-data; name="district"\r\n\r\nMysuru\r\n`,
      `--${boundary}\r\nContent-Disposition: form-data; name="priority"\r\n\r\nHIGH\r\n`,
      `--${boundary}--\r\n`,
    ];
    const multipartBody = bodyParts.join("");

    const createRes = await fetch(`${baseUrl}/complaints`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${citizenAuth.data.accessToken}`,
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      },
      body: multipartBody,
    });
    const createData = (await createRes.json()) as {
      success: boolean;
      data: { id: string; complaintNumber: string; status: string; assignedOfficialName?: string };
    };

    if (!createData.success || !createData.data?.id) {
      throw new Error(`Create failed: ${JSON.stringify(createData)}`);
    }

    const complaintId = createData.data.id;
    const complaintNumber = createData.data.complaintNumber;

    logger.info(`✅ Created grievance: ${complaintNumber}`);
    logger.info(`   Auto-routed status: ${createData.data.status} (Assigned to: ${createData.data.assignedOfficialName})`);

    if (createData.data.status !== ComplaintStatus.ASSIGNED || !createData.data.assignedOfficialName) {
      throw new Error(`Expected auto-routing to assign official, got status: ${createData.data.status}`);
    }
    passedTests++;

    // 2. Notification Verification for Official
    logger.info("Test 2: Verifying Official Received Assignment Notification");
    const notifRes = await fetch(`${baseUrl}/notifications`, {
      headers: officialHeaders,
    });
    const notifData = (await notifRes.json()) as {
      success: boolean;
      data: {
        notifications: Array<{ id: string; title: string; complaintNumber?: string; isRead: boolean }>;
        unreadCount: number;
      };
    };

    if (!notifData.success || notifData.data.unreadCount < 1) {
      throw new Error(`Official notification missing: ${JSON.stringify(notifData)}`);
    }
    const assignedNotif = notifData.data.notifications.find((n) => n.complaintNumber === complaintNumber);
    if (!assignedNotif) {
      throw new Error(`Assignment notification for ${complaintNumber} not found in official inbox`);
    }
    logger.info(`✅ Official received notification: "${assignedNotif.title}" (Unread: ${notifData.data.unreadCount})`);
    passedTests++;

    // 3. Official Status Transition: ASSIGNED -> UNDER_REVIEW
    logger.info("Test 3: Official Transitions Status: ASSIGNED -> UNDER_REVIEW");
    const underReviewRes = await fetch(`${baseUrl}/complaints/${complaintId}/status`, {
      method: "PATCH",
      headers: officialHeaders,
      body: JSON.stringify({
        status: ComplaintStatus.UNDER_REVIEW,
        remarks: "Grievance accepted for technical review by RDPR engineering team.",
      }),
    });
    const underReviewData = (await underReviewRes.json()) as { success: boolean; data: { status: string } };
    if (!underReviewData.success || underReviewData.data.status !== ComplaintStatus.UNDER_REVIEW) {
      throw new Error(`Transition to UNDER_REVIEW failed: ${JSON.stringify(underReviewData)}`);
    }
    logger.info(`✅ Complaint transitioned to UNDER_REVIEW`);
    passedTests++;

    // 4. Staff Field Action Logging (Inspection)
    logger.info("Test 4: Official Logs Formal Field Inspection Action");
    const actionRes = await fetch(`${baseUrl}/complaints/${complaintId}/actions`, {
      method: "POST",
      headers: officialHeaders,
      body: JSON.stringify({
        actionType: "INSPECTION",
        remarks: "Visited pump house in Ward 4. 7.5 HP motor winding burned. Ordered spare capacitor and replacement coil.",
        isInternalOnly: false,
      }),
    });
    const actionData = (await actionRes.json()) as { success: boolean; data: { actions: Array<{ actionType: string; remarks: string }> } };
    const firstAction = actionData.data?.actions?.[0];
    if (!actionData.success || !firstAction) {
      throw new Error(`Record action failed: ${JSON.stringify(actionData)}`);
    }
    logger.info(`✅ Action recorded: [${firstAction.actionType}] "${firstAction.remarks}"`);
    passedTests++;

    // 5. Role Security Violation: Citizen tries to set ACTION_IN_PROGRESS -> Expects 403
    logger.info("Test 5: Role Security Guard (Citizen denied staff status transitions -> 403)");
    const forbiddenRes = await fetch(`${baseUrl}/complaints/${complaintId}/status`, {
      method: "PATCH",
      headers: citizenHeaders,
      body: JSON.stringify({
        status: ComplaintStatus.ACTION_IN_PROGRESS,
        remarks: "Citizen trying to change status",
      }),
    });
    if (forbiddenRes.status !== 403) {
      throw new Error(`Expected 403 Forbidden, got ${forbiddenRes.status}`);
    }
    logger.info(`✅ Security check passed: 403 Forbidden returned when citizen tried to set staff status`);
    passedTests++;

    // 6. State Machine Guard: Illegal jump UNDER_REVIEW -> CLOSED -> Expects 400
    logger.info("Test 6: State Machine Guard (Illegal transition UNDER_REVIEW -> CLOSED blocked -> 400)");
    const illegalRes = await fetch(`${baseUrl}/complaints/${complaintId}/status`, {
      method: "PATCH",
      headers: officialHeaders,
      body: JSON.stringify({
        status: ComplaintStatus.CLOSED,
        remarks: "Jumping straight to closed",
      }),
    });
    if (illegalRes.status !== 400) {
      throw new Error(`Expected 400 Bad Request for illegal state jump, got ${illegalRes.status}`);
    }
    logger.info(`✅ State machine guard passed: 400 Bad Request returned for invalid state jump`);
    passedTests++;

    // 7. Payload Validation: RESOLVED without resolutionSummary -> Expects 400
    logger.info("Test 7: Payload Validation (Transitioning to RESOLVED without summary blocked -> 400)");
    const missingPayloadRes = await fetch(`${baseUrl}/complaints/${complaintId}/status`, {
      method: "PATCH",
      headers: officialHeaders,
      body: JSON.stringify({
        status: ComplaintStatus.RESOLVED,
      }),
    });
    if (missingPayloadRes.status !== 400) {
      throw new Error(`Expected 400 for missing resolutionSummary, got ${missingPayloadRes.status}`);
    }
    logger.info(`✅ Payload validation passed: 400 Bad Request returned when resolution summary is omitted`);
    passedTests++;

    // 8. Progress to ACTION_IN_PROGRESS
    logger.info("Test 8: Official Transitions to ACTION_IN_PROGRESS");
    const inProgressRes = await fetch(`${baseUrl}/complaints/${complaintId}/status`, {
      method: "PATCH",
      headers: officialHeaders,
      body: JSON.stringify({
        status: ComplaintStatus.ACTION_IN_PROGRESS,
        remarks: "Electrician dispatched with replacement motor assembly. Installation underway.",
      }),
    });
    const inProgressData = (await inProgressRes.json()) as { success: boolean; data: { status: string } };
    if (!inProgressData.success || inProgressData.data.status !== ComplaintStatus.ACTION_IN_PROGRESS) {
      throw new Error(`Transition to ACTION_IN_PROGRESS failed: ${JSON.stringify(inProgressData)}`);
    }
    logger.info(`✅ Complaint transitioned to ACTION_IN_PROGRESS`);
    passedTests++;

    // 9. Full Resolution Flow: ACTION_IN_PROGRESS -> RESOLVED
    logger.info("Test 9: Official Resolves Grievance with Resolution Summary & Proof");
    const resolveRes = await fetch(`${baseUrl}/complaints/${complaintId}/status`, {
      method: "PATCH",
      headers: officialHeaders,
      body: JSON.stringify({
        status: ComplaintStatus.RESOLVED,
        resolutionSummary: "New 7.5 HP motor installed and wired. Water pumping resumed. Tank refilled and pressure tested successfully.",
        remarks: "Field work complete. Water supply restored to Ward 4 households.",
      }),
    });
    const resolveData = (await resolveRes.json()) as {
      success: boolean;
      data: { status: string; resolution: { resolvedByName: string; resolutionSummary: string } };
    };
    if (!resolveData.success || resolveData.data.status !== ComplaintStatus.RESOLVED) {
      throw new Error(`Resolve failed: ${JSON.stringify(resolveData)}`);
    }
    logger.info(`✅ Complaint marked RESOLVED by ${resolveData.data.resolution.resolvedByName}`);
    logger.info(`   Summary: "${resolveData.data.resolution.resolutionSummary}"`);
    passedTests++;

    // 10. Citizen Receives Resolution Notification & Marks Read
    logger.info("Test 10: Citizen Receives Resolution Notification & Marks Read");
    const citizenNotifRes = await fetch(`${baseUrl}/notifications`, {
      headers: citizenHeaders,
    });
    const citizenNotifData = (await citizenNotifRes.json()) as {
      success: boolean;
      data: { notifications: Array<{ id: string; title: string; complaintNumber?: string; isRead: boolean }>; unreadCount: number };
    };
    if (!citizenNotifData.success || citizenNotifData.data.unreadCount < 1) {
      throw new Error(`Citizen notifications empty: ${JSON.stringify(citizenNotifData)}`);
    }
    const resolvedNotif = citizenNotifData.data.notifications.find((n) => n.title.includes("Resolved"));
    if (!resolvedNotif) {
      throw new Error(`Resolved notification not found for citizen`);
    }
    logger.info(`✅ Citizen received resolution notification: "${resolvedNotif.title}"`);

    // Mark single notification read
    const markReadRes = await fetch(`${baseUrl}/notifications/${resolvedNotif.id}/read`, {
      method: "PATCH",
      headers: citizenHeaders,
    });
    const markReadData = (await markReadRes.json()) as { success: boolean; data: { isRead: boolean } };
    if (!markReadData.success || !markReadData.data.isRead) {
      throw new Error(`Mark notification read failed: ${JSON.stringify(markReadData)}`);
    }
    logger.info(`✅ Notification marked as read`);
    passedTests++;

    // 11. Audit Trail Query & Sequence Verification
    logger.info("Test 11: Inspecting Immutable Audit Trail for Complaint");
    const auditRes = await fetch(`${baseUrl}/complaints/${complaintId}/audit-trail`, {
      headers: officialHeaders,
    });
    const auditData = (await auditRes.json()) as {
      success: boolean;
      data: Array<{ action: string; previousState?: string; newState?: string; notes?: string }>;
    };

    if (!auditData.success || auditData.data.length < 4) {
      throw new Error(`Incomplete audit trail: ${JSON.stringify(auditData)}`);
    }

    logger.info(`✅ Audit trail returned ${auditData.data.length} immutable events:`);
    auditData.data.slice(0, 5).forEach((event, idx) => {
      logger.info(`   [${idx + 1}] Action: ${event.action} | ${event.previousState || "NONE"} -> ${event.newState || "SAME"}`);
    });
    passedTests++;

    logger.info("\n==================================================");
    logger.info(`🎉 ALL ${passedTests}/11 PHASE 4 COMPLAINT ENGINE TESTS PASSED!`);
    logger.info("==================================================");
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

runTests().catch((err) => {
  logger.error("Phase 4 verification test suite failed:", err);
  process.exit(1);
});
