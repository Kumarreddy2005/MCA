import http from "http";
import mongoose from "mongoose";
import { createApp } from "../app.js";
import { connectDatabase } from "../config/database.js";
import { ComplaintStatus } from "../types/domain.js";
import { logger } from "../utils/logger.js";

async function runComplaintVerification() {
  await connectDatabase();
  const app = createApp();

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 5001;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  logger.info(`Verification server running on port ${port}`);

  try {
    // 1. Authenticate Citizen
    logger.info("Step 1: Authenticate Citizen via OTP");
    const otpRes = await fetch(`${baseUrl}/auth/citizen/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "9876543212" }),
    });
    const otpData = (await otpRes.json()) as { success: boolean; data?: { devOtpPreview?: string } };
    const otp = otpData.data?.devOtpPreview;
    if (!otp) throw new Error("No dev OTP preview");

    const verifyRes = await fetch(`${baseUrl}/auth/citizen/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "9876543212", otp }),
    });
    const verifyData = (await verifyRes.json()) as { success: boolean; data?: { accessToken: string } };
    const citizenToken = verifyData.data?.accessToken;
    if (!citizenToken) throw new Error("No citizen token");
    logger.info("✅ Citizen authenticated successfully");

    // 2. Fetch Department Categories
    logger.info("Step 2: Fetch Categories");
    const catRes = await fetch(`${baseUrl}/complaints/categories`);
    const catData = (await catRes.json()) as { success: boolean; data?: { departments: string[] } };
    if (!catData.success || !catData.data?.departments.length) {
      throw new Error(`Failed to fetch categories: ${JSON.stringify(catData)}`);
    }
    logger.info(`✅ Categories fetched: ${catData.data.departments.length} departments available`);

    // 3. Submit Complaint via Multipart
    logger.info("Step 3: Citizen Submits Grievance with Evidence");
    const boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW";
    const bodyParts = [
      `--${boundary}\r\nContent-Disposition: form-data; name="title"\r\n\r\nOverflowing drain near village water tank\r\n`,
      `--${boundary}\r\nContent-Disposition: form-data; name="description"\r\n\r\nThe main village drain has been overflowing for the past 4 days near the public water tank causing water logging and foul smell.\r\n`,
      `--${boundary}\r\nContent-Disposition: form-data; name="category"\r\n\r\nDrainage & Sewerage\r\n`,
      `--${boundary}\r\nContent-Disposition: form-data; name="department"\r\n\r\nSanitation & Solid Waste\r\n`,
      `--${boundary}\r\nContent-Disposition: form-data; name="village"\r\n\r\nRampura\r\n`,
      `--${boundary}\r\nContent-Disposition: form-data; name="ward"\r\n\r\nWard 4\r\n`,
      `--${boundary}\r\nContent-Disposition: form-data; name="district"\r\n\r\nMysuru\r\n`,
      `--${boundary}\r\nContent-Disposition: form-data; name="pincode"\r\n\r\n570001\r\n`,
      `--${boundary}\r\nContent-Disposition: form-data; name="priority"\r\n\r\nHIGH\r\n`,
      `--${boundary}\r\nContent-Disposition: form-data; name="files"; filename="drain_issue.jpg"\r\nContent-Type: image/jpeg\r\n\r\nfake-image-binary-data\r\n`,
      `--${boundary}--\r\n`,
    ];
    const multipartBody = bodyParts.join("");

    const submitRes = await fetch(`${baseUrl}/complaints`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${citizenToken}`,
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      },
      body: multipartBody,
    });
    const submitData = (await submitRes.json()) as {
      success: boolean;
      data?: { id: string; complaintNumber: string; evidence: unknown[]; timeline: unknown[] };
    };
    if (!submitData.success || !submitData.data?.complaintNumber) {
      throw new Error(`Failed to submit complaint: ${JSON.stringify(submitData)}`);
    }
    const complaintId = submitData.data.id;
    const complaintNumber = submitData.data.complaintNumber;
    logger.info(`✅ Grievance created: ${complaintNumber} with ${submitData.data.evidence.length} evidence attachment(s)`);

    // 4. Fetch My Complaints List
    logger.info("Step 4: Fetch My Complaints");
    const myRes = await fetch(`${baseUrl}/complaints/my`, {
      headers: { Authorization: `Bearer ${citizenToken}` },
    });
    const myData = (await myRes.json()) as {
      success: boolean;
      data?: { complaints: { id: string; complaintNumber: string }[]; stats: { total: number } };
    };
    if (!myData.success || myData.data?.stats.total === 0) {
      throw new Error(`Failed to list complaints: ${JSON.stringify(myData)}`);
    }
    logger.info(`✅ Citizen grievances listed: total = ${myData.data?.stats.total}`);

    // 5. Fetch Complaint Detail & Timeline
    logger.info("Step 5: Fetch Complaint Detail View");
    const detailRes = await fetch(`${baseUrl}/complaints/${complaintId}`, {
      headers: { Authorization: `Bearer ${citizenToken}` },
    });
    const detailData = (await detailRes.json()) as {
      success: boolean;
      data?: { complaintNumber: string; timeline: { status: string; message: string }[] };
    };
    if (!detailData.success || !detailData.data?.timeline.length) {
      throw new Error(`Failed to fetch complaint detail: ${JSON.stringify(detailData)}`);
    }
    logger.info(`✅ Detail verified: initial event = '${detailData.data.timeline[0]?.status}'`);

    // 6. Test Security Ownership (Second citizen cannot see this grievance)
    logger.info("Step 6: Security Isolation (Different citizen gets 403)");
    const otherCitizenRes = await fetch(`${baseUrl}/auth/citizen/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "9876543299" }),
    });
    const otherOtp = ((await otherCitizenRes.json()) as { data?: { devOtpPreview?: string } }).data?.devOtpPreview;
    const otherVerify = await fetch(`${baseUrl}/auth/citizen/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "9876543299", otp: otherOtp }),
    });
    const otherToken = ((await otherVerify.json()) as { data?: { accessToken: string } }).data?.accessToken;

    const accessRes = await fetch(`${baseUrl}/complaints/${complaintId}`, {
      headers: { Authorization: `Bearer ${otherToken}` },
    });
    if (accessRes.status !== 403) {
      throw new Error(`Expected 403 Forbidden, got ${accessRes.status}`);
    }
    logger.info("✅ Security check passed: Unauthorized citizen received 403 Forbidden");

    // 7. Test Feedback Submission (simulate resolved state)
    logger.info("Step 7: Citizen Satisfaction Feedback");
    // Manually mark as resolved in DB to test feedback and reopen
    const { Complaint } = await import("../models/complaint.model.js");
    await Complaint.findByIdAndUpdate(complaintId, { status: ComplaintStatus.RESOLVED });

    const feedbackRes = await fetch(`${baseUrl}/complaints/${complaintId}/feedback`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${citizenToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        rating: 5,
        comment: "Drain cleared quickly by sanitation team. Good service!",
      }),
    });
    const feedbackData = (await feedbackRes.json()) as { success: boolean };
    if (!feedbackData.success) {
      throw new Error(`Failed to submit feedback: ${JSON.stringify(feedbackData)}`);
    }
    logger.info("✅ Feedback recorded with satisfaction rating");

    // 8. Test Reopening Grievance
    logger.info("Step 8: Reopen Grievance");
    const reopenRes = await fetch(`${baseUrl}/complaints/${complaintId}/reopen`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${citizenToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reason: "Drain started overflowing again after the evening rain.",
      }),
    });
    const reopenData = (await reopenRes.json()) as {
      success: boolean;
      data?: { status: string; timeline: unknown[] };
    };
    if (!reopenData.success || reopenData.data?.status !== ComplaintStatus.REOPENED) {
      throw new Error(`Failed to reopen complaint: ${JSON.stringify(reopenData)}`);
    }
    logger.info(`✅ Reopen verified: Status transitioned to '${reopenData.data.status}'`);

    logger.info("\n🎉 ALL 8 BACKEND COMPLAINT & CITIZEN PORTAL INTEGRATION TESTS PASSED!");
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

runComplaintVerification().catch((err) => {
  logger.error("Verification failed:", err);
  process.exit(1);
});
