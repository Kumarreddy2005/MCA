/**
 * VCGIS Phase 3 — Village Volunteer Portal Verification Script
 * Self-contained automated test using native fetch and ephemeral server
 */

import http from "http";
import mongoose from "mongoose";
import { createApp } from "../app.js";
import { connectDatabase } from "../config/database.js";
import { ComplaintStatus, FieldVerificationResult, UserRole } from "../types/domain.js";
import { logger } from "../utils/logger.js";

async function runVolunteerVerification() {
  await connectDatabase();
  const app = createApp();

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 5001;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  logger.info(`Verification server running on port ${port}`);

  let passedTests = 0;
  const totalTests = 8;

  try {
    // 1. Authenticate Volunteer
    logger.info("Test 1: Authenticating Volunteer user");
    const loginRes = await fetch(`${baseUrl}/auth/staff/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "volunteer@vcgis.gov.in",
        password: "Volunteer@12345",
      }),
    });
    const loginData = (await loginRes.json()) as {
      success: boolean;
      data?: { accessToken: string; user: { role: string; name: string; volunteerProfile?: { volunteerId: string } } };
    };
    if (!loginData.success || !loginData.data?.accessToken || loginData.data.user.role !== UserRole.VOLUNTEER) {
      throw new Error(`Volunteer login failed: ${JSON.stringify(loginData)}`);
    }
    const volunteerToken = loginData.data.accessToken;
    logger.info(`✅ Authenticated as ${loginData.data.user.name} (Badge: ${loginData.data.user.volunteerProfile?.volunteerId})`);
    passedTests++;

    const authHeaders = {
      Authorization: `Bearer ${volunteerToken}`,
      "Content-Type": "application/json",
    };

    // 2. Assisted Citizen Registration
    logger.info("Test 2: Assisted Citizen Registration by Volunteer");
    const uniquePhone = `9848${Math.floor(100000 + Math.random() * 900000)}`;
    const regRes = await fetch(`${baseUrl}/volunteers/citizens`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        name: "Lakshmamma Gouda",
        phone: uniquePhone,
        village: "Rampura",
        ward: "Ward 4",
        mandal: "Mysuru Taluk",
        district: "Mysuru",
        pincode: "570001",
        address: "Door No 3-45, Near Grama Panchayat Office",
      }),
    });
    const regData = (await regRes.json()) as {
      success: boolean;
      data?: { id: string; name: string; role: string; isVerified: boolean };
    };
    if (!regData.success || !regData.data?.id || regData.data.role !== UserRole.CITIZEN) {
      throw new Error(`Citizen registration failed: ${JSON.stringify(regData)}`);
    }
    const registeredCitizenId = regData.data.id;
    logger.info(`✅ Registered citizen '${regData.data.name}' with ID: ${registeredCitizenId}`);
    passedTests++;

    // 3. Search Registered Citizens in Volunteer Cluster
    logger.info("Test 3: Searching Registered Citizens by phone & cluster");
    const searchRes = await fetch(`${baseUrl}/volunteers/citizens?query=${uniquePhone}`, {
      headers: authHeaders,
    });
    const searchData = (await searchRes.json()) as {
      success: boolean;
      data?: Array<{ id: string; name: string; phone: string }>;
    };
    if (!searchData.success || !Array.isArray(searchData.data) || !searchData.data.some((c) => c.phone === uniquePhone)) {
      throw new Error(`Citizen search failed: ${JSON.stringify(searchData)}`);
    }
    logger.info(`✅ Citizen search succeeded. Found in cluster.`);
    passedTests++;

    // 4. File Complaint on Behalf of Citizen
    logger.info("Test 4: Registering Complaint on Behalf of Citizen (VOLUNTEER_ASSISTED)");
    const boundary = "----WebKitFormBoundaryVolTest776";
    const bodyParts = [
      `--${boundary}\r\nContent-Disposition: form-data; name="citizenId"\r\n\r\n${registeredCitizenId}\r\n`,
      `--${boundary}\r\nContent-Disposition: form-data; name="title"\r\n\r\nDrinking water pipeline fracture near water tank\r\n`,
      `--${boundary}\r\nContent-Disposition: form-data; name="description"\r\n\r\nMain drinking water pipeline has ruptured near the overhead water tank in Rampura. Clean water is wasting and 35 households have reduced supply.\r\n`,
      `--${boundary}\r\nContent-Disposition: form-data; name="category"\r\n\r\nDrinking Water Supply\r\n`,
      `--${boundary}\r\nContent-Disposition: form-data; name="department"\r\n\r\nPanchayat Raj & Rural Development\r\n`,
      `--${boundary}\r\nContent-Disposition: form-data; name="village"\r\n\r\nRampura\r\n`,
      `--${boundary}\r\nContent-Disposition: form-data; name="ward"\r\n\r\nWard 4\r\n`,
      `--${boundary}\r\nContent-Disposition: form-data; name="district"\r\n\r\nMysuru\r\n`,
      `--${boundary}\r\nContent-Disposition: form-data; name="priority"\r\n\r\nHIGH\r\n`,
      `--${boundary}\r\nContent-Disposition: form-data; name="evidence"; filename="pipe_leak.jpg"\r\nContent-Type: image/jpeg\r\n\r\nFAKE_JPEG_IMAGE_DATA\r\n`,
      `--${boundary}--\r\n`,
    ];
    const payloadBuffer = Buffer.from(bodyParts.join(""));

    const complaintRes = await fetch(`${baseUrl}/volunteers/complaints`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${volunteerToken}`,
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      },
      body: payloadBuffer,
    });
    const complaintData = (await complaintRes.json()) as {
      success: boolean;
      data?: { id: string; complaintNumber: string; source: string; status: string };
    };
    if (!complaintData.success || !complaintData.data?.complaintNumber || complaintData.data.source !== "VOLUNTEER_ASSISTED") {
      throw new Error(`Assisted complaint filing failed: ${JSON.stringify(complaintData)}`);
    }
    const createdComplaintId = complaintData.data.id;
    const createdComplaintNumber = complaintData.data.complaintNumber;
    logger.info(`✅ Assisted complaint created: ${createdComplaintNumber} (Source: ${complaintData.data.source})`);
    passedTests++;

    // 5. Fetch Volunteer Work Queue and Cluster Stats
    logger.info("Test 5: Fetching Volunteer Cluster Work Queue & KPI metrics");
    const queueRes = await fetch(`${baseUrl}/volunteers/work-queue`, {
      headers: authHeaders,
    });
    const queueData = (await queueRes.json()) as {
      success: boolean;
      data?: {
        complaints: Array<{ id: string }>;
        stats: { totalCluster: number; pendingVerification: number; registeredCitizens: number; urgentCount: number };
      };
    };
    if (!queueData.success || !queueData.data?.stats || !Array.isArray(queueData.data.complaints)) {
      throw new Error(`Work queue retrieval failed: ${JSON.stringify(queueData)}`);
    }
    logger.info(`✅ Work queue retrieved. Cluster complaints: ${queueData.data.stats.totalCluster}, Pending verifications: ${queueData.data.stats.pendingVerification}`);
    passedTests++;

    // 6. Submit On-Site Field Verification
    logger.info("Test 6: Submitting Field Verification for Complaint");
    const verifyBoundary = "----WebKitFormBoundaryVerify883";
    const verifyParts = [
      `--${verifyBoundary}\r\nContent-Disposition: form-data; name="result"\r\n\r\nVERIFIED\r\n`,
      `--${verifyBoundary}\r\nContent-Disposition: form-data; name="notes"\r\n\r\nInspected in person. Pipeline fracture confirmed. Clean water leak requires replacement of 2-inch PVC elbow.\r\n`,
      `--${verifyBoundary}\r\nContent-Disposition: form-data; name="citizenIdentified"\r\n\r\ntrue\r\n`,
      `--${verifyBoundary}\r\nContent-Disposition: form-data; name="incidentConfirmed"\r\n\r\ntrue\r\n`,
      `--${verifyBoundary}\r\nContent-Disposition: form-data; name="evidenceValid"\r\n\r\ntrue\r\n`,
      `--${verifyBoundary}\r\nContent-Disposition: form-data; name="severityMatches"\r\n\r\ntrue\r\n`,
      `--${verifyBoundary}\r\nContent-Disposition: form-data; name="latitude"\r\n\r\n15.8282\r\n`,
      `--${verifyBoundary}\r\nContent-Disposition: form-data; name="longitude"\r\n\r\n78.0374\r\n`,
      `--${verifyBoundary}\r\nContent-Disposition: form-data; name="photos"; filename="site_inspection.jpg"\r\nContent-Type: image/jpeg\r\n\r\nINSPECTION_PHOTO_DATA\r\n`,
      `--${verifyBoundary}--\r\n`,
    ];
    const verifyBuffer = Buffer.from(verifyParts.join(""));

    const verifyRes = await fetch(`${baseUrl}/volunteers/complaints/${createdComplaintId}/verify`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${volunteerToken}`,
        "Content-Type": `multipart/form-data; boundary=${verifyBoundary}`,
      },
      body: verifyBuffer,
    });
    const verifyData = (await verifyRes.json()) as {
      success: boolean;
      data?: { id: string; status: string; verification?: { result: string; verifiedByName: string } };
    };
    if (!verifyData.success || verifyData.data?.status !== ComplaintStatus.VERIFIED || verifyData.data?.verification?.result !== FieldVerificationResult.VERIFIED) {
      throw new Error(`Field verification submission failed: ${JSON.stringify(verifyData)}`);
    }
    logger.info(`✅ Field verification recorded. Status updated to: ${verifyData.data.status} by ${verifyData.data.verification?.verifiedByName}`);
    passedTests++;

    // 7. Verify Audit Timeline Transition
    logger.info("Test 7: Inspecting Complaint Audit Timeline");
    const detailRes = await fetch(`${baseUrl}/complaints/${createdComplaintId}`, {
      headers: authHeaders,
    });
    const detailData = (await detailRes.json()) as {
      success: boolean;
      data?: { timeline: Array<{ status: string; actorRole: string; message: string }> };
    };
    if (!detailData.success || !Array.isArray(detailData.data?.timeline)) {
      throw new Error(`Failed to fetch complaint detail: ${JSON.stringify(detailData)}`);
    }
    const verificationEvent = detailData.data.timeline.find(
      (t) => t.status === ComplaintStatus.VERIFIED && t.actorRole === UserRole.VOLUNTEER
    );
    if (!verificationEvent) {
      throw new Error(`Verification event missing from timeline: ${JSON.stringify(detailData.data.timeline)}`);
    }
    logger.info(`✅ Audit timeline event confirmed: "${verificationEvent.message}"`);
    passedTests++;

    // 8. Volunteer AI Assistant Helper
    logger.info("Test 8: Testing Volunteer AI Assistant Helper");
    const assistRes = await fetch(`${baseUrl}/volunteers/assistant`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        citizenStatement: "The transformer near the temple burst with loud sound and sparks. Live wires are hanging on the school road and whole street is dark.",
        village: "Rampura",
      }),
    });
    const assistData = (await assistRes.json()) as {
      success: boolean;
      data?: { title: string; suggestedCategory: string; suggestedDepartment: string; missingInformation: string[] };
    };
    if (!assistData.success || !assistData.data?.title || !assistData.data?.suggestedCategory || !assistData.data?.missingInformation.length) {
      throw new Error(`Assistant helper failed: ${JSON.stringify(assistData)}`);
    }
    logger.info(`✅ Volunteer AI Assistant generated structured grievance:`);
    logger.info(`   Title: "${assistData.data.title}"`);
    logger.info(`   Category: ${assistData.data.suggestedCategory} | Dept: ${assistData.data.suggestedDepartment}`);
    logger.info(`   Missing info checklist items: ${assistData.data.missingInformation.length}`);
    passedTests++;

    logger.info("\n==================================================");
    logger.info(`🎉 ALL ${passedTests}/${totalTests} PHASE 3 VOLUNTEER TESTS PASSED!`);
    logger.info("==================================================");
  } catch (error) {
    logger.error("Verification failed:", error);
    process.exitCode = 1;
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

runVolunteerVerification();
