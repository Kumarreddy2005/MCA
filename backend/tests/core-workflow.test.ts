import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import mongoose from "mongoose";
import { createApp } from "../src/app.js";
import { connectDatabase } from "../src/config/database.js";
import { User } from "../src/models/user.model.js";
import { Complaint } from "../src/models/complaint.model.js";
import { UserRole, ComplaintStatus, FieldVerificationResult } from "../src/types/domain.js";

const app = createApp();

describe("VCGIS Core Flow & Role Isolation API Tests", () => {
  let citizenToken = "";
  let volunteerToken = "";
  let waterStaffToken = "";
  let roadStaffToken = "";
  let officialToken = "";
  let adminToken = "";
  let createdComplaintId = "";

  before(async () => {
    await connectDatabase();

    // 1. Staff Login for Volunteer (Volunteer@12345)
    const volRes = await request(app)
      .post("/api/auth/staff/login")
      .send({ email: "volunteer@vcgis.gov.in", password: "Volunteer@12345" });
    volunteerToken = volRes.body.data?.accessToken || "";

    // 2. Staff Login for Water Staff (Staff@12345)
    const waterRes = await request(app)
      .post("/api/auth/staff/login")
      .send({ email: "water.staff@vcgis.gov.in", password: "Staff@12345" });
    waterStaffToken = waterRes.body.data?.accessToken || "";

    // 3. Staff Login for Road Staff (Staff@12345)
    const roadRes = await request(app)
      .post("/api/auth/staff/login")
      .send({ email: "road.staff@vcgis.gov.in", password: "Staff@12345" });
    roadStaffToken = roadRes.body.data?.accessToken || "";

    // 4. Staff Login for Official (Official@12345)
    const offRes = await request(app)
      .post("/api/auth/staff/login")
      .send({ email: "official@vcgis.gov.in", password: "Official@12345" });
    officialToken = offRes.body.data?.accessToken || "";

    // 5. Staff Login for Admin (Admin@12345)
    const adminRes = await request(app)
      .post("/api/auth/staff/login")
      .send({ email: "admin@vcgis.gov.in", password: "Admin@12345" });
    adminToken = adminRes.body.data?.accessToken || "";

    // 6. Citizen Auth via OTP verification (using unique phone to isolate test suites)
    const citPhone = "9876543201";
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

  it("1. Health check returns 200 and healthy status", async () => {
    const res = await request(app).get("/health");
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.service, "vcgis-backend");
  });

  it("2. Citizen can submit a complaint and status is strictly SUBMITTED", async () => {
    assert.ok(citizenToken, "Citizen must be authenticated");

    const res = await request(app)
      .post("/api/complaints")
      .set("Authorization", `Bearer ${citizenToken}`)
      .send({
        title: "Pipeline broken and water leaking onto main road",
        description: "Severely leaking main pipeline causing water waste in Rampura.",
        category: "Water Supply & Distribution",
        department: "Water Supply",
        village: "Rampura",
        district: "Mysuru",
        priority: "HIGH",
        latitude: 12.3051,
        longitude: 76.6551,
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    const complaint = res.body.data;
    createdComplaintId = complaint._id || complaint.id;
    assert.equal(complaint.status, ComplaintStatus.SUBMITTED);
    assert.match(complaint.complaintNumber, /^CMP-/);
  });

  it("3. Unverified complaint must NOT appear in Department Staff queue", async () => {
    assert.ok(waterStaffToken, "Water staff must be authenticated");

    const res = await request(app)
      .get("/api/department-staff/queue")
      .set("Authorization", `Bearer ${waterStaffToken}`);

    assert.equal(res.status, 200);
    const queue = res.body.data.complaints || [];
    const unverifiedInQueue = queue.filter(
      (c: any) => c.status === ComplaintStatus.SUBMITTED || c.status === ComplaintStatus.DRAFT
    );
    assert.equal(unverifiedInQueue.length, 0);

    const foundNew = queue.some((c: any) => (c._id || c.id) === createdComplaintId);
    assert.equal(foundNew, false, "Unverified complaint must not appear in department staff queue");
  });

  it("4. Direct routing by unauthenticated or citizen is blocked", async () => {
    assert.ok(createdComplaintId);

    const res = await request(app)
      .post(`/api/volunteers/complaints/${createdComplaintId}/verify`)
      .set("Authorization", `Bearer ${citizenToken}`)
      .send({
        result: FieldVerificationResult.VERIFIED,
        notes: "Attempting direct citizen bypass",
      });

    assert.equal(res.status, 403);
  });

  it("5. Volunteer verification transitions complaint and triggers routing to Department Staff", async () => {
    assert.ok(volunteerToken, "Volunteer must be authenticated");
    assert.ok(createdComplaintId);

    const res = await request(app)
      .post(`/api/volunteers/complaints/${createdComplaintId}/verify`)
      .set("Authorization", `Bearer ${volunteerToken}`)
      .send({
        result: FieldVerificationResult.VERIFIED,
        notes: "Inspected at site. Severe pipeline burst verified in Rampura.",
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const verified = await Complaint.findById(createdComplaintId);
    assert.ok(
      verified?.status === ComplaintStatus.ASSIGNED ||
      verified?.status === ComplaintStatus.VERIFIED
    );
  });

  it("6. Department Staff isolation: Water staff sees Water complaints, Road staff does NOT", async () => {
    assert.ok(waterStaffToken && roadStaffToken);

    // Water staff queue should contain the verified water complaint
    const waterRes = await request(app)
      .get("/api/department-staff/queue")
      .set("Authorization", `Bearer ${waterStaffToken}`);
    const waterIds = (waterRes.body.data.complaints || []).map((c: any) => (c._id || c.id).toString());
    assert.ok(waterIds.includes(createdComplaintId.toString()), "Water staff queue must contain the verified water complaint");

    // Road staff queue must NOT contain the water complaint
    const roadRes = await request(app)
      .get("/api/department-staff/queue")
      .set("Authorization", `Bearer ${roadStaffToken}`);
    const roadIds = (roadRes.body.data.complaints || []).map((c: any) => (c._id || c.id).toString());
    assert.ok(!roadIds.includes(createdComplaintId.toString()), "Road staff queue must NOT contain the water complaint");
  });

  it("7. Department Staff updates status: ASSIGNED -> ACTION_IN_PROGRESS -> RESOLVED", async () => {
    assert.ok(waterStaffToken);
    assert.ok(createdComplaintId);

    // Transition to ACTION_IN_PROGRESS
    const inProgRes = await request(app)
      .patch(`/api/department-staff/complaints/${createdComplaintId}/status`)
      .set("Authorization", `Bearer ${waterStaffToken}`)
      .send({
        status: ComplaintStatus.ACTION_IN_PROGRESS,
        remarks: "Dispatched repair vehicle to Rampura junction.",
      });
    assert.equal(inProgRes.status, 200);

    // Transition to RESOLVED
    const resolveRes = await request(app)
      .patch(`/api/department-staff/complaints/${createdComplaintId}/status`)
      .set("Authorization", `Bearer ${waterStaffToken}`)
      .send({
        status: ComplaintStatus.RESOLVED,
        remarks: "Pipeline repaired and water pressure restored.",
      });
    assert.equal(resolveRes.status, 200);

    const dbComplaint = await Complaint.findById(createdComplaintId);
    assert.equal(dbComplaint?.status, ComplaintStatus.RESOLVED);
  });

  it("8. Citizen can submit feedback on RESOLVED complaint", async () => {
    assert.ok(citizenToken);
    assert.ok(createdComplaintId);

    const res = await request(app)
      .post(`/api/complaints/${createdComplaintId}/feedback`)
      .set("Authorization", `Bearer ${citizenToken}`)
      .send({
        rating: 5,
        comment: "Prompt action and clear communication. Very satisfied.",
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });

  it("9. Rejected case: Volunteer can reject spam/bogus grievance with justification", async () => {
    // Citizen submits a bogus complaint
    const createRes = await request(app)
      .post("/api/complaints")
      .set("Authorization", `Bearer ${citizenToken}`)
      .send({
        title: "Bogus test issue submitted by accident",
        description: "Nothing is wrong here, just testing the system buttons.",
        category: "Road Damage & Potholes",
        department: "Roads & Transport",
        village: "Rampura",
        district: "Mysuru",
        priority: "LOW",
      });

    assert.equal(createRes.status, 201);
    const bogusId = createRes.body.data._id || createRes.body.data.id;

    // Volunteer field verification rejects the complaint
    const rejRes = await request(app)
      .post(`/api/volunteers/complaints/${bogusId}/verify`)
      .set("Authorization", `Bearer ${volunteerToken}`)
      .send({
        result: FieldVerificationResult.REJECTED,
        notes: "Inspected area. No road damage found; citizen confirmed submission was mistaken.",
        incidentConfirmed: false,
      });

    assert.equal(rejRes.status, 200);
    assert.equal(rejRes.body.success, true);

    const dbBogus = await Complaint.findById(bogusId);
    assert.equal(dbBogus?.status, ComplaintStatus.REJECTED);
    assert.equal(dbBogus?.rejection?.reason, "Inspected area. No road damage found; citizen confirmed submission was mistaken.");
  });

  it("10. Low-confidence / Ambiguous complaint enters pre-verification review", async () => {
    const ambigRes = await request(app)
      .post("/api/complaints")
      .set("Authorization", `Bearer ${citizenToken}`)
      .send({
        title: "Unknown difficulty in village",
        description: "Something is happening near the corner, please check it out immediately.",
        category: "General Citizen Grievance",
        department: "Roads & Transport",
        village: "Rampura",
        district: "Mysuru",
        priority: "MEDIUM",
      });

    assert.equal(ambigRes.status, 201);
    const ambigComplaint = ambigRes.body.data;
    // Status must remain in a pre-verification state (SUBMITTED or VERIFICATION_REQUIRED)
    assert.ok(
      ambigComplaint.status === ComplaintStatus.SUBMITTED ||
      ambigComplaint.status === ComplaintStatus.VERIFICATION_REQUIRED
    );

    // Unverified ambiguous complaint must NOT be auto-routed to road staff
    const roadRes = await request(app)
      .get("/api/department-staff/queue")
      .set("Authorization", `Bearer ${roadStaffToken}`);
    const roadIds = (roadRes.body.data.complaints || []).map((c: any) => (c._id || c.id).toString());
    assert.ok(!roadIds.includes((ambigComplaint._id || ambigComplaint.id).toString()));
  });

  it("11. Duplicate complaint case: Official can mark grievance as duplicate of primary complaint", async () => {
    // Create a duplicate grievance
    const dupRes = await request(app)
      .post("/api/complaints")
      .set("Authorization", `Bearer ${citizenToken}`)
      .send({
        title: "Another report of water leak on main road",
        description: "Water pipe leaking in Rampura village, identical location.",
        category: "Water Supply & Distribution",
        department: "Water Supply",
        village: "Rampura",
        district: "Mysuru",
        priority: "HIGH",
      });
    const dupId = dupRes.body.data._id || dupRes.body.data.id;

    // Transition to DUPLICATE with reference to primary complaint
    const primaryComplaint = await Complaint.findById(createdComplaintId);
    assert.ok(primaryComplaint);

    const patchRes = await request(app)
      .patch(`/api/complaints/${dupId}/status`)
      .set("Authorization", `Bearer ${officialToken}`)
      .send({
        status: ComplaintStatus.DUPLICATE,
        duplicateOfComplaintNumber: primaryComplaint.complaintNumber,
        remarks: "Duplicate of existing pipeline leak complaint.",
      });

    assert.equal(patchRes.status, 200);
    const dbDup = await Complaint.findById(dupId);
    assert.equal(dbDup?.status, ComplaintStatus.DUPLICATE);
    assert.equal(dbDup?.duplicateOfComplaintNumber, primaryComplaint.complaintNumber);
  });

  it("12. Invalid status transition is strictly rejected with 400", async () => {
    // Attempting invalid jump: SUBMITTED directly to RESOLVED without verification or assignment
    const freshComplaintRes = await request(app)
      .post("/api/complaints")
      .set("Authorization", `Bearer ${citizenToken}`)
      .send({
        title: "Street light flickering repeatedly at night",
        description: "Street light pole 12 flickering on the cross road in Rampura.",
        category: "Power Outage & Street Lighting",
        department: "Electricity & Power",
        village: "Rampura",
        district: "Mysuru",
        priority: "LOW",
      });
    const freshId = freshComplaintRes.body.data._id || freshComplaintRes.body.data.id;

    const invalidRes = await request(app)
      .patch(`/api/complaints/${freshId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        status: ComplaintStatus.RESOLVED,
        resolutionSummary: "Attempting illegal direct resolution jump",
        remarks: "Illegal transition",
      });

    assert.equal(invalidRes.status, 400);
    assert.equal(invalidRes.body.success, false);
    assert.equal(invalidRes.body.error.code, "INVALID_TRANSITION");
  });
});
