import http from "http";
import mongoose from "mongoose";
import { createApp } from "../app.js";
import { connectDatabase } from "../config/database.js";
import { logger } from "../utils/logger.js";

async function runAuthVerification() {
  await connectDatabase();
  const app = createApp();

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 5001;
  const baseUrl = `http://127.0.0.1:${port}/api/auth`;

  logger.info(`Verification server running on port ${port}`);

  try {
    // Test 1: Send OTP to citizen
    logger.info("Test 1: Citizen OTP Generation");
    const otpRes = await fetch(`${baseUrl}/citizen/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "9876543212", purpose: "LOGIN" }),
    });
    const otpData = (await otpRes.json()) as { success: boolean; data?: { devOtpPreview?: string } };
    if (!otpData.success || !otpData.data?.devOtpPreview) {
      throw new Error(`Failed Test 1: ${JSON.stringify(otpData)}`);
    }
    const receivedOtp = otpData.data.devOtpPreview;
    logger.info(`✅ Test 1 Passed: OTP received = ${receivedOtp}`);

    // Test 2: Verify OTP
    logger.info("Test 2: Citizen OTP Verification");
    const verifyRes = await fetch(`${baseUrl}/citizen/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: "9876543212",
        otp: receivedOtp,
        name: "Venkat Rao",
        village: "Rampura",
      }),
    });
    const verifyData = (await verifyRes.json()) as {
      success: boolean;
      data?: { accessToken: string; refreshToken: string; user: { role: string; phone: string } };
    };
    if (!verifyData.success || !verifyData.data?.accessToken) {
      throw new Error(`Failed Test 2: ${JSON.stringify(verifyData)}`);
    }
    const citizenToken = verifyData.data.accessToken;
    const citizenRefreshToken = verifyData.data.refreshToken;
    logger.info(`✅ Test 2 Passed: Citizen authenticated (${verifyData.data.user.role})`);

    // Test 3: Staff login (Admin)
    logger.info("Test 3: Admin Staff Login");
    const adminRes = await fetch(`${baseUrl}/staff/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@vcgis.gov.in",
        password: process.env.ADMIN_SEED_PASSWORD || "Admin@12345",
      }),
    });
    const adminData = (await adminRes.json()) as {
      success: boolean;
      data?: { accessToken: string; user: { role: string; email: string } };
    };
    if (!adminData.success || !adminData.data?.accessToken) {
      throw new Error(`Failed Test 3: ${JSON.stringify(adminData)}`);
    }
    const adminToken = adminData.data.accessToken;
    logger.info(`✅ Test 3 Passed: Admin logged in (${adminData.data.user.role})`);

    // Test 4: Staff login with invalid password
    logger.info("Test 4: Invalid Password Rejection");
    const badLoginRes = await fetch(`${baseUrl}/staff/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@vcgis.gov.in", password: "wrong-password" }),
    });
    if (badLoginRes.status !== 401) {
      throw new Error(`Failed Test 4: Expected 401, got ${badLoginRes.status}`);
    }
    logger.info("✅ Test 4 Passed: 401 returned for bad password");

    // Test 5: Authenticated route /me
    logger.info("Test 5: /me Profile Fetch");
    const meRes = await fetch(`${baseUrl}/me`, {
      headers: { Authorization: `Bearer ${citizenToken}` },
    });
    const meData = (await meRes.json()) as { success: boolean; data?: { user: { phone: string } } };
    if (!meData.success || meData.data?.user.phone !== "9876543212") {
      throw new Error(`Failed Test 5: ${JSON.stringify(meData)}`);
    }
    logger.info("✅ Test 5 Passed: /me successfully returned citizen profile");

    // Test 6: RBAC protection (Citizen cannot call Admin-only route)
    logger.info("Test 6: RBAC Role Check (Citizen -> Admin endpoint)");
    const rbacRes = await fetch(`${baseUrl}/staff`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${citizenToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Test Staff",
        email: "test@vcgis.gov.in",
        phone: "9111111111",
        password: "Password@123",
        role: "VOLUNTEER",
      }),
    });
    if (rbacRes.status !== 403) {
      throw new Error(`Failed Test 6: Expected 403 Forbidden, got ${rbacRes.status}`);
    }
    logger.info("✅ Test 6 Passed: 403 Forbidden returned for unauthorized role");

    // Test 7: Admin CAN call Admin-only route
    logger.info("Test 7: Admin Provisioning Route");
    const createStaffRes = await fetch(`${baseUrl}/staff`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "New Field Volunteer",
        email: `volunteer_${Date.now()}@vcgis.gov.in`,
        phone: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
        password: "Volunteer@12345",
        role: "VOLUNTEER",
        volunteerProfile: {
          volunteerId: "VOL-002",
          assignedVillage: "Govindpur",
          assignedWard: "Ward 1",
          district: "Mysuru",
        },
      }),
    });
    const createStaffData = (await createStaffRes.json()) as { success: boolean };
    if (!createStaffData.success) {
      throw new Error(`Failed Test 7: ${JSON.stringify(createStaffData)}`);
    }
    logger.info("✅ Test 7 Passed: Admin successfully provisioned new staff user");

    // Test 8: Refresh Token Rotation
    logger.info("Test 8: Refresh Token Rotation");
    const refreshRes = await fetch(`${baseUrl}/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: citizenRefreshToken }),
    });
    const refreshData = (await refreshRes.json()) as {
      success: boolean;
      data?: { accessToken: string; refreshToken: string };
    };
    if (!refreshData.success || !refreshData.data?.accessToken) {
      throw new Error(`Failed Test 8: ${JSON.stringify(refreshData)}`);
    }
    logger.info("✅ Test 8 Passed: Token refreshed successfully");

    // Test 9: Logout
    logger.info("Test 9: Logout & Token Revocation");
    const logoutRes = await fetch(`${baseUrl}/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: refreshData.data.refreshToken }),
    });
    const logoutData = (await logoutRes.json()) as { success: boolean };
    if (!logoutData.success) {
      throw new Error(`Failed Test 9: ${JSON.stringify(logoutData)}`);
    }
    logger.info("✅ Test 9 Passed: Successfully logged out");

    logger.info("\n🎉 ALL 9 BACKEND AUTH INTEGRATION TESTS PASSED CLEANLY!");
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

runAuthVerification().catch((err) => {
  logger.error("Verification failed:", err);
  process.exit(1);
});
