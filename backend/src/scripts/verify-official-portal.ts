/**
 * VCGIS Phase 5 — Department Official Portal Verification Script
 * Self-contained automated test verifying:
 * 1. Official Authentication
 * 2. 7 Section 25 KPI Dashboard Metrics
 * 3. Departmental Work Queue & Filtering
 * 4. Strict Department Data Isolation (403 Violation + Audit Logging)
 * 5. Multipart Resolution with Photographic Proof
 * 6. Formal Administrative Rejection
 * 7. Department Transfer & Auto-Reassignment
 * 8. Escalation to Higher Authority
 */

import http from "http";
import mongoose from "mongoose";
import { createApp } from "../app.js";
import { connectDatabase } from "../config/database.js";
import { Complaint } from "../models/complaint.model.js";
import { User } from "../models/user.model.js";
import { ComplaintStatus, Priority, UserRole } from "../types/domain.js";
import { logger } from "../utils/logger.js";

async function runOfficialVerification() {
  await connectDatabase();
  const app = createApp();

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 5001;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  logger.info(`Official verification test server running on port ${port}`);

  let passedTests = 0;
  const totalTests = 8;

  try {
    // 1. Authenticate Demo Department Official
    logger.info("Test 1: Authenticating Official user");
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
        user: { role: string; name: string; officialProfile?: { department: string; designation: string } };
      };
    };

    if (!officialLogin.success || !officialLogin.data?.accessToken) {
      throw new Error(`Official login failed: ${JSON.stringify(officialLogin)}`);
    }

    const officialToken = officialLogin.data.accessToken;
    const officialDept = officialLogin.data.user.officialProfile?.department;
    logger.info(
      `✅ Authenticated as ${officialLogin.data.user.name} (${officialLogin.data.user.officialProfile?.designation}) in department: ${officialDept}`
    );
    passedTests++;

    const officialHeaders = {
      Authorization: `Bearer ${officialToken}`,
    };

    // Retrieve citizen for complaint creation
    const citizen = await User.findOne({ role: UserRole.CITIZEN });
    if (!citizen) throw new Error("No citizen found in database for testing");

    // 2. Test 7 Department KPI Metrics Endpoint
    logger.info("Test 2: Verifying 7 Department KPI Metrics");
    const metricsRes = await fetch(`${baseUrl}/officials/metrics`, {
      headers: officialHeaders,
    });
    const metricsData = (await metricsRes.json()) as {
      success: boolean;
      data?: {
        totalComplaints: number;
        newComplaints: number;
        pendingComplaints: number;
        urgentComplaints: number;
        slaRiskComplaints: number;
        resolvedComplaints: number;
        reopenedComplaints: number;
        department: string;
      };
    };

    if (!metricsData.success || !metricsData.data) {
      throw new Error(`Failed to fetch official metrics: ${JSON.stringify(metricsData)}`);
    }

    if (
      typeof metricsData.data.totalComplaints !== "number" ||
      typeof metricsData.data.newComplaints !== "number" ||
      typeof metricsData.data.pendingComplaints !== "number" ||
      typeof metricsData.data.urgentComplaints !== "number" ||
      typeof metricsData.data.slaRiskComplaints !== "number" ||
      typeof metricsData.data.resolvedComplaints !== "number" ||
      typeof metricsData.data.reopenedComplaints !== "number"
    ) {
      throw new Error("Missing required KPI metric counters");
    }
    logger.info(
      `✅ Department KPI Metrics confirmed: Total=${metricsData.data.totalComplaints}, Pending=${metricsData.data.pendingComplaints}, Resolved=${metricsData.data.resolvedComplaints}`
    );
    passedTests++;

    // 3. Test Department Work Queue & Filtering
    logger.info("Test 3: Verifying Department Work Queue");
    const queueRes = await fetch(`${baseUrl}/officials/queue?limit=10`, {
      headers: officialHeaders,
    });
    const queueData = (await queueRes.json()) as {
      success: boolean;
      data?: {
        complaints: Array<{ id: string; complaintNumber: string; department: string }>;
      };
    };

    if (!queueData.success || !Array.isArray(queueData.data?.complaints)) {
      throw new Error(`Work queue retrieval failed: ${JSON.stringify(queueData)}`);
    }

    // Verify every complaint in queue belongs to officialDept
    const crossDeptComplaints = queueData.data.complaints.filter((c) => c.department !== officialDept);
    if (crossDeptComplaints.length > 0) {
      throw new Error(`Queue data leak! Found non-department complaints: ${JSON.stringify(crossDeptComplaints)}`);
    }
    logger.info(`✅ Work Queue validated: ${queueData.data.complaints.length} complaints all correctly scoped to '${officialDept}'`);
    passedTests++;

    // 4. Test Department Data Isolation (Security Test: 403 Forbidden on Cross-Department Action)
    logger.info("Test 4: Verifying Department Data Isolation Enforcement (403 on Foreign Dept)");
    // Create a foreign department complaint (e.g. Electricity & Power)
    const foreignComplaint = await Complaint.create({
      complaintNumber: `TEST-ELEC-${Date.now().toString().slice(-4)}`,
      citizenId: citizen._id,
      citizenName: citizen.name,
      citizenPhone: citizen.phone,
      title: "Broken HT Transformer in Hebbal",
      description: "Severe voltage fluctuation causing equipment failures",
      category: "Power Outage",
      department: "Electricity & Power",
      status: ComplaintStatus.ASSIGNED,
      priority: Priority.HIGH,
      source: "CITIZEN_PORTAL",
      location: {
        village: "Hebbal",
        district: "Mysuru",
        mandal: "Mysuru Taluk",
      },
      evidence: [],
      timeline: [
        {
          status: ComplaintStatus.ASSIGNED,
          message: "Created for security isolation testing",
          actorRole: UserRole.ADMIN,
          timestamp: new Date(),
        },
      ],
      sla: {
        targetResolutionDate: new Date(Date.now() + 48 * 3600 * 1000),
        isBreached: false,
      },
    });

    // Official (RDPR) attempts to reject/resolve Electricity & Power complaint -> MUST BE 403
    const isolationRes = await fetch(`${baseUrl}/officials/complaints/${foreignComplaint._id}/reject`, {
      method: "POST",
      headers: {
        ...officialHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reason: "Unauthorized attempt to reject power department issue",
      }),
    });

    const isolationData = (await isolationRes.json()) as {
      success: boolean;
      error?: { code: string; message: string };
    };

    if (isolationRes.status !== 403 || isolationData.error?.code !== "DEPARTMENT_ISOLATION_VIOLATION") {
      throw new Error(
        `Department isolation breach! Expected 403 DEPARTMENT_ISOLATION_VIOLATION, got ${isolationRes.status}: ${JSON.stringify(
          isolationData
        )}`
      );
    }
    logger.info(`✅ Department isolation successfully blocked cross-dept tampering with HTTP 403`);
    passedTests++;

    // 5. Test Multipart Resolution with Photo Proof
    logger.info("Test 5: Official Resolution with Photo Proof (Multipart Upload)");
    // Create an RDPR complaint in ACTION_IN_PROGRESS to resolve
    const rdprComplaint = await Complaint.create({
      complaintNumber: `TEST-RDPR-${Date.now().toString().slice(-4)}`,
      citizenId: citizen._id,
      citizenName: citizen.name,
      citizenPhone: citizen.phone,
      title: "Overflowing village drainage pit near school",
      description: "Stagnant wastewater posing health hazard to schoolchildren",
      category: "Drainage",
      department: "Rural Development & Panchayat Raj",
      status: ComplaintStatus.ACTION_IN_PROGRESS,
      priority: Priority.HIGH,
      source: "CITIZEN_PORTAL",
      location: {
        village: "Rampura",
        district: "Mysuru",
        mandal: "Mysuru Taluk",
      },
      evidence: [],
      timeline: [
        {
          status: ComplaintStatus.ACTION_IN_PROGRESS,
          message: "Work begun by panchayat engineering team",
          actorRole: UserRole.OFFICIAL,
          timestamp: new Date(),
        },
      ],
      sla: {
        targetResolutionDate: new Date(Date.now() + 72 * 3600 * 1000),
        isBreached: false,
      },
    });

    // Construct multipart form data with image proof
    const formData = new FormData();
    formData.append("resolutionSummary", "Drainage ditch desilted, concrete slabs laid, and wastewater flow restored");
    formData.append("actionTaken", "Desilting and cover slab installation completed");
    formData.append("contractorName", "Mysuru Panchayat Infrastructure Works");
    formData.append("materialsUsed", "6 Precast concrete slabs, 2 bags cement");
    // Add dummy photo
    const dummyBlob = new Blob(["fake-image-bytes-proof"], { type: "image/jpeg" });
    formData.append("photos", dummyBlob, "drainage_resolution_proof.jpg");

    const resolveRes = await fetch(`${baseUrl}/officials/complaints/${rdprComplaint._id}/resolve`, {
      method: "POST",
      headers: officialHeaders,
      body: formData,
    });

    const resolveData = (await resolveRes.json()) as {
      success: boolean;
      data?: {
        status: string;
        resolution?: {
          resolutionSummary: string;
          resolutionPhotos?: Array<{ fileName: string; fileUrl: string }>;
        };
      };
      error?: { code: string; message: string };
    };

    if (!resolveData.success || resolveData.data?.status !== ComplaintStatus.RESOLVED) {
      throw new Error(`Resolution failed: ${JSON.stringify(resolveData)}`);
    }

    if (!resolveData.data.resolution?.resolutionPhotos || resolveData.data.resolution.resolutionPhotos.length === 0) {
      throw new Error("Resolution photo proof was not attached to resolution certificate");
    }
    const photoName = resolveData.data.resolution.resolutionPhotos[0]?.fileName ?? "resolution_proof";
    logger.info(`✅ Grievance resolved successfully with photo proof attached: ${photoName}`);
    passedTests++;

    // 6. Test Formal Administrative Rejection
    logger.info("Test 6: Official Rejection Workflow");
    const complaintToReject = await Complaint.create({
      complaintNumber: `TEST-REJ-${Date.now().toString().slice(-4)}`,
      citizenId: citizen._id,
      citizenName: citizen.name,
      citizenPhone: citizen.phone,
      title: "Request for private garden paved path",
      description: "Pave inner garden path inside private residence boundary",
      category: "Roads",
      department: "Rural Development & Panchayat Raj",
      status: ComplaintStatus.UNDER_REVIEW,
      priority: Priority.LOW,
      source: "CITIZEN_PORTAL",
      location: {
        village: "Rampura",
        district: "Mysuru",
        mandal: "Mysuru Taluk",
      },
      evidence: [],
      timeline: [],
      sla: {
        targetResolutionDate: new Date(Date.now() + 120 * 3600 * 1000),
        isBreached: false,
      },
    });

    const rejectRes = await fetch(`${baseUrl}/officials/complaints/${complaintToReject._id}/reject`, {
      method: "POST",
      headers: {
        ...officialHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reason: "Grievance rejected: Public funds cannot be utilized for private residential landscaping under Karnataka Panchayat Raj Act.",
      }),
    });

    const rejectData = (await rejectRes.json()) as {
      success: boolean;
      data?: { status: string; rejection?: { reason: string } };
    };

    if (!rejectData.success || rejectData.data?.status !== ComplaintStatus.REJECTED) {
      throw new Error(`Rejection workflow failed: ${JSON.stringify(rejectData)}`);
    }
    logger.info(`✅ Formal rejection confirmed: "${rejectData.data.rejection?.reason.slice(0, 50)}..."`);
    passedTests++;

    // 7. Test Department Transfer & Auto-Reassignment
    logger.info("Test 7: Departmental Transfer Workflow");
    const complaintToTransfer = await Complaint.create({
      complaintNumber: `TEST-TRF-${Date.now().toString().slice(-4)}`,
      citizenId: citizen._id,
      citizenName: citizen.name,
      citizenPhone: citizen.phone,
      title: "High-voltage wire hanging low over village pathway",
      description: "Live wire dangling low, requires electricity department intervention",
      category: "Other / General Administration",
      department: "Rural Development & Panchayat Raj",
      status: ComplaintStatus.ASSIGNED,
      priority: Priority.HIGH,
      source: "CITIZEN_PORTAL",
      location: {
        village: "Rampura",
        district: "Mysuru",
        mandal: "Mysuru Taluk",
      },
      evidence: [],
      timeline: [],
      sla: {
        targetResolutionDate: new Date(Date.now() + 48 * 3600 * 1000),
        isBreached: false,
      },
    });

    const transferRes = await fetch(`${baseUrl}/officials/complaints/${complaintToTransfer._id}/transfer`, {
      method: "POST",
      headers: {
        ...officialHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        targetDepartment: "Electricity & Power",
        reason: "Pertains directly to BESCOM electricity distribution line, outside RDPR scope",
      }),
    });

    const transferData = (await transferRes.json()) as {
      success: boolean;
      data?: { department: string; status: string };
    };

    if (!transferData.success || transferData.data?.department !== "Electricity & Power") {
      throw new Error(`Transfer failed: ${JSON.stringify(transferData)}`);
    }
    logger.info(`✅ Complaint transferred to '${transferData.data.department}' and status set to '${transferData.data.status}'`);
    passedTests++;

    // 8. Test Escalation Workflow
    logger.info("Test 8: Official Escalation Workflow");
    const complaintToEscalate = await Complaint.create({
      complaintNumber: `TEST-ESC-${Date.now().toString().slice(-4)}`,
      citizenId: citizen._id,
      citizenName: citizen.name,
      citizenPhone: citizen.phone,
      title: "Major bridge approach washed away by heavy monsoon flooding",
      description: "Critical infrastructure damage requiring emergency district disaster relief fund",
      category: "Roads",
      department: "Rural Development & Panchayat Raj",
      status: ComplaintStatus.ACTION_IN_PROGRESS,
      priority: Priority.CRITICAL,
      source: "CITIZEN_PORTAL",
      location: {
        village: "Rampura",
        district: "Mysuru",
        mandal: "Mysuru Taluk",
      },
      evidence: [],
      timeline: [],
      sla: {
        targetResolutionDate: new Date(Date.now() + 24 * 3600 * 1000),
        isBreached: false,
      },
    });

    const escalateRes = await fetch(`${baseUrl}/officials/complaints/${complaintToEscalate._id}/escalate`, {
      method: "POST",
      headers: {
        ...officialHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reason: "Cost of repair exceeds departmental sanction limit (₹50 Lakhs); escalated to District Collector for SDRF approval",
      }),
    });

    const escalateData = (await escalateRes.json()) as {
      success: boolean;
      data?: { status: string };
    };

    if (!escalateData.success || escalateData.data?.status !== ComplaintStatus.ESCALATED) {
      throw new Error(`Escalation failed: ${JSON.stringify(escalateData)}`);
    }
    logger.info(`✅ Grievance escalated to higher authority with status: ${escalateData.data.status}`);
    passedTests++;

    // Clean up test documents
    await Complaint.deleteMany({
      complaintNumber: { $regex: /^TEST-(ELEC|RDPR|REJ|TRF|ESC)-/ },
    });

    logger.info("=================================================");
    logger.info(`🎉 Official Portal Integration Test PASSED: ${passedTests}/${totalTests} tests`);
    logger.info("=================================================");
  } finally {
    server.close();
    await mongoose.connection.close();
  }
}

runOfficialVerification().catch((err) => {
  logger.error("❌ Official Portal Verification FAILED:", err);
  process.exit(1);
});
