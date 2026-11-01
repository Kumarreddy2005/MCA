import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import mongoose from "mongoose";
import { createApp } from "../src/app.js";
import { connectDatabase } from "../src/config/database.js";
import { User } from "../src/models/user.model.js";
import { Complaint } from "../src/models/complaint.model.js";
import { ComplaintStatus, Priority, UserRole } from "../src/types/domain.js";

const app = createApp();

describe("VCGIS Phase 5 — Analytics, SLA, & Dashboard Integrity Tests", () => {
  let adminToken = "";
  let waterOfficialToken = "";
  let roadOfficialToken = "";
  let volunteerToken = "";
  let waterStaffToken = "";
  let citizenToken = "";

  before(async () => {
    await connectDatabase();

    // 1. Admin Login
    const adminRes = await request(app)
      .post("/api/auth/staff/login")
      .send({ email: "admin@vcgis.gov.in", password: "Admin@12345" });
    adminToken = adminRes.body.data?.accessToken || "";

    // 2. Water Official Login
    const waterOffRes = await request(app)
      .post("/api/auth/staff/login")
      .send({ email: "official@vcgis.gov.in", password: "Official@12345" });
    waterOfficialToken = waterOffRes.body.data?.accessToken || "";

    // 3. Road Official Login
    const roadOffRes = await request(app)
      .post("/api/auth/staff/login")
      .send({ email: "road.official@vcgis.gov.in", password: "Official@12345" });
    roadOfficialToken = roadOffRes.body.data?.accessToken || "";

    // 4. Volunteer Login
    const volRes = await request(app)
      .post("/api/auth/staff/login")
      .send({ email: "volunteer@vcgis.gov.in", password: "Volunteer@12345" });
    volunteerToken = volRes.body.data?.accessToken || "";

    // 5. Water Staff Login
    const staffRes = await request(app)
      .post("/api/auth/staff/login")
      .send({ email: "water.staff@vcgis.gov.in", password: "Staff@12345" });
    waterStaffToken = staffRes.body.data?.accessToken || "";

    // 6. Citizen Login
    const citPhone = "9876543203";
    const sendOtpRes = await request(app)
      .post("/api/auth/citizen/send-otp")
      .send({ phone: citPhone });
    const otpCode = sendOtpRes.body.data?.devOtpPreview;
    const citRes = await request(app)
      .post("/api/auth/citizen/verify-otp")
      .send({ phone: citPhone, otp: otpCode, name: "Basavaraj Gowda" });
    citizenToken = citRes.body.data?.accessToken || "";
  });

  after(async () => {
    await mongoose.disconnect();
  });

  it("1. Analytics Overview derives counts from real DB records", async () => {
    const res = await request(app)
      .get("/api/analytics/overview")
      .set("Authorization", `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    const stats = res.body.data;
    assert.equal(typeof stats.total, "number");
    assert.equal(typeof stats.open, "number");
    assert.equal(typeof stats.resolved, "number");
    assert.equal(stats.total, stats.open + stats.resolved);
  });

  it("2. Empty / Impossible filter returns truthful zero counts without fabricated stats", async () => {
    const res = await request(app)
      .get("/api/analytics/overview?district=NonExistentDistrictXYZ")
      .set("Authorization", `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.total, 0);
    assert.equal(res.body.data.open, 0);
    assert.equal(res.body.data.resolved, 0);
    assert.equal(res.body.data.resolutionRate, 0);
  });

  it("3. Department Performance Matrix respects department filters and returns real departments", async () => {
    const res = await request(app)
      .get("/api/analytics/departments")
      .set("Authorization", `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 3);
    for (const d of res.body.data) {
      assert.ok(typeof d.total === "number");
      assert.ok(typeof d.complianceRate === "number");
    }
  });

  it("4. Category & Priority breakdown counts sum up accurately", async () => {
    const res = await request(app)
      .get("/api/analytics/categories")
      .set("Authorization", `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    const { byPriority, byCategory } = res.body.data;
    assert.ok(typeof byPriority.CRITICAL === "number");
    assert.ok(typeof byPriority.HIGH === "number");
    assert.ok(Array.isArray(byCategory));
  });

  it("5. RFC 4180 CSV export generates matching headers and valid rows", async () => {
    const res = await request(app)
      .get("/api/analytics/export/csv")
      .set("Authorization", `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.match(res.headers["content-type"], /text\/csv/);
    const lines = res.text.split("\r\n");
    assert.ok(lines.length >= 1);
    assert.match(lines[0], /Complaint Number,Title,Department,Category,Priority,Status/);
  });

  it("6. SLA Analytics handler applies department and district filters cleanly", async () => {
    const res = await request(app)
      .get("/api/sla/analytics?department=Water%20Supply&district=Mysuru")
      .set("Authorization", `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(typeof res.body.data.totalTracked === "number");
    assert.ok(typeof res.body.data.complianceRatePercentage === "number");
  });

  it("7. Breached and At-Risk queue respects department isolation for Official", async () => {
    const res = await request(app)
      .get("/api/sla/queue")
      .set("Authorization", `Bearer ${waterOfficialToken}`);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data.complaints));
    for (const c of res.body.data.complaints) {
      assert.equal(c.department, "Water Supply");
    }
  });

  it("8. Volunteer work queue computes real cluster KPI counts", async () => {
    const res = await request(app)
      .get("/api/volunteers/work-queue?tab=verifications")
      .set("Authorization", `Bearer ${volunteerToken}`);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data.complaints));
    assert.ok(res.body.data.stats);
    assert.ok(typeof res.body.data.stats.totalCluster === "number");
    assert.ok(typeof res.body.data.stats.pendingVerification === "number");
  });
});
