import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import mongoose from "mongoose";
import { createApp } from "../src/app.js";
import { connectDatabase } from "../src/config/database.js";

const app = createApp();
import { User } from "../src/models/user.model.js";
import { Complaint } from "../src/models/complaint.model.js";
import { ComplaintStatus, Priority, UserRole } from "../src/types/domain.js";

describe("VCGIS Security & Data Integrity Audit Tests (Phase 4)", () => {
  let citizenToken = "";
  let volunteerToken = "";
  let waterStaffToken = "";
  let roadStaffToken = "";
  let waterOfficialToken = "";
  let roadOfficialToken = "";
  let adminToken = "";
  let waterComplaintId = "";
  let roadComplaintId = "";

  before(async () => {
    await connectDatabase();

    // 1. Volunteer Login
    const volRes = await request(app)
      .post("/api/auth/staff/login")
      .send({ email: "volunteer@vcgis.gov.in", password: "Volunteer@12345" });
    volunteerToken = volRes.body.data?.accessToken || "";

    // 2. Water Staff Login
    const waterStaffRes = await request(app)
      .post("/api/auth/staff/login")
      .send({ email: "water.staff@vcgis.gov.in", password: "Staff@12345" });
    waterStaffToken = waterStaffRes.body.data?.accessToken || "";

    // 3. Road Staff Login
    const roadStaffRes = await request(app)
      .post("/api/auth/staff/login")
      .send({ email: "road.staff@vcgis.gov.in", password: "Staff@12345" });
    roadStaffToken = roadStaffRes.body.data?.accessToken || "";

    // 4. Water Official Login
    const waterOffRes = await request(app)
      .post("/api/auth/staff/login")
      .send({ email: "official@vcgis.gov.in", password: "Official@12345" });
    waterOfficialToken = waterOffRes.body.data?.accessToken || "";

    // 5. Road Official (ensure account exists)
    let roadOfficial = await User.findOne({ email: "road.official@vcgis.gov.in" });
    if (!roadOfficial) {
      roadOfficial = await User.create({
        name: "Sri. Suresh Gowda (EE PWD)",
        email: "road.official@vcgis.gov.in",
        phone: "9876543299",
        password: "Official@12345",
        role: UserRole.OFFICIAL,
        isActive: true,
        isVerified: true,
        officialProfile: {
          department: "Roads & Transport",
          departmentCode: "ROAD",
          designation: "Executive Engineer",
          jurisdictionDistrict: "Mysuru",
        },
      });
    }
    const roadOffRes = await request(app)
      .post("/api/auth/staff/login")
      .send({ email: "road.official@vcgis.gov.in", password: "Official@12345" });
    roadOfficialToken = roadOffRes.body.data?.accessToken || "";

    // 6. Admin Login
    const adminRes = await request(app)
      .post("/api/auth/staff/login")
      .send({ email: "admin@vcgis.gov.in", password: "Admin@12345" });
    adminToken = adminRes.body.data?.accessToken || "";

    // 7. Citizen Auth
    const citPhone = "9876543202";
    const sendOtpRes = await request(app)
      .post("/api/auth/citizen/send-otp")
      .send({ phone: citPhone });
    const otpCode = sendOtpRes.body.data?.devOtpPreview;
    const citRes = await request(app)
      .post("/api/auth/citizen/verify-otp")
      .send({ phone: citPhone, otp: otpCode, name: "Basavaraj Gowda" });
    citizenToken = citRes.body.data?.accessToken || "";

    // Setup: Create a Water complaint and a Road complaint
    const wRes = await request(app)
      .post("/api/complaints")
      .set("Authorization", `Bearer ${citizenToken}`)
      .send({
        title: "Security Test - Main water pipe burst",
        description: "Severely leaking main pipeline flooding road in Rampura.",
        category: "Water Supply & Distribution",
        department: "Water Supply",
        village: "Rampura",
        district: "Mysuru",
        priority: "HIGH",
      });
    waterComplaintId = wRes.body.data._id || wRes.body.data.id;

    const rRes = await request(app)
      .post("/api/complaints")
      .set("Authorization", `Bearer ${citizenToken}`)
      .send({
        title: "Security Test - Pothole damage on NH275",
        description: "Dangerous pothole crater causing accidents in Rampura.",
        category: "Pothole & Road Damage",
        department: "Roads & Transport",
        village: "Rampura",
        district: "Mysuru",
        priority: "HIGH",
      });
    roadComplaintId = rRes.body.data._id || rRes.body.data.id;
  });

  after(async () => {
    await mongoose.disconnect();
  });

  it("1. Unauthenticated request to protected endpoints is rejected with 401", async () => {
    const res = await request(app).get("/api/complaints");
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  it("2. Citizen role is blocked from viewing global complaints list with 403", async () => {
    const res = await request(app)
      .get("/api/complaints")
      .set("Authorization", `Bearer ${citizenToken}`);
    assert.equal(res.status, 403);
  });

  it("3. Citizen cannot view another citizen's complaint details", async () => {
    // Create complaint for a different citizen
    const randomSuffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const otherCitizen = await User.create({
      name: "Different Citizen",
      phone: `98765${Math.floor(10000 + Math.random() * 90000)}`,
      role: UserRole.CITIZEN,
      isActive: true,
      isVerified: true,
    });
    const otherComplaint = await Complaint.create({
      complaintNumber: `CMP-TEST-${randomSuffix}`,
      citizenId: otherCitizen._id,
      citizenName: otherCitizen.name,
      citizenPhone: otherCitizen.phone,
      title: "Private grievance",
      description: "Private grievance details",
      category: "Water Supply & Distribution",
      department: "Water Supply",
      departmentCode: "WATER",
      priority: Priority.LOW,
      status: ComplaintStatus.SUBMITTED,
      location: { district: "Mysuru", village: "Rampura" },
      sla: { targetResolutionDate: new Date(), hoursRemaining: 24, status: "ON_TRACK" },
    });

    const res = await request(app)
      .get(`/api/complaints/${otherComplaint._id}`)
      .set("Authorization", `Bearer ${citizenToken}`);
    assert.equal(res.status, 403);
  });

  it("4. Cross-department isolation: Road official cannot view or modify Water complaints", async () => {
    // Road official viewing Water complaint
    const getRes = await request(app)
      .get(`/api/complaints/${waterComplaintId}`)
      .set("Authorization", `Bearer ${roadOfficialToken}`);
    assert.equal(getRes.status, 403);

    // Road official trying to transition Water complaint
    const patchRes = await request(app)
      .patch(`/api/complaints/${waterComplaintId}/status`)
      .set("Authorization", `Bearer ${roadOfficialToken}`)
      .send({
        status: ComplaintStatus.UNDER_REVIEW,
        remarks: "Cross-department attempt by Road official",
      });
    assert.equal(patchRes.status, 403);
  });

  it("5. Cross-department isolation: Water staff cannot view Road staff queue", async () => {
    const staffQueueRes = await request(app)
      .get("/api/department-staff/queue")
      .set("Authorization", `Bearer ${waterStaffToken}`);
    assert.equal(staffQueueRes.status, 200);
    const complaints = staffQueueRes.body.data.complaints;
    // None should belong to ROAD
    for (const c of complaints) {
      assert.notEqual(c.departmentCode, "ROAD");
    }
  });

  it("6. File upload security: rejects dangerous file extensions like .exe, .sh, .html", async () => {
    const maliciousBuffer = Buffer.from("echo 'malicious payload'");
    const res = await request(app)
      .post("/api/complaints")
      .set("Authorization", `Bearer ${citizenToken}`)
      .field("title", "File upload test")
      .field("description", "File upload test with dangerous executable script")
      .field("category", "Water Supply & Distribution")
      .field("department", "Water Supply")
      .field("village", "Rampura")
      .field("district", "Mysuru")
      .attach("files", maliciousBuffer, "malicious_script.sh");

    // Multer error or express error handler returns 500/400 for fileFilter rejection
    assert.ok(res.status >= 400);
  });

  it("7. GIS analytics endpoint does not leak raw Citizen PII (phone number, full address)", async () => {
    const geoRes = await request(app)
      .get("/api/analytics/geo")
      .set("Authorization", `Bearer ${waterOfficialToken}`);
    assert.equal(geoRes.status, 200);
    const points = geoRes.body.data.points;
    assert.ok(Array.isArray(points));

    for (const pt of points) {
      assert.equal(pt.citizenPhone, undefined, "GIS points must never expose citizen phone");
      assert.equal(pt.citizenName, undefined, "GIS points must not expose raw citizen name");
      assert.equal(pt.citizenAddress, undefined, "GIS points must not expose personal street address");
    }
  });

  it("8. Admin retains universal oversight across all departments", async () => {
    const waterViewRes = await request(app)
      .get(`/api/complaints/${waterComplaintId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    assert.equal(waterViewRes.status, 200);

    const roadViewRes = await request(app)
      .get(`/api/complaints/${roadComplaintId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    assert.equal(roadViewRes.status, 200);
  });
});
