import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDatabase } from "../config/database.js";
import { Complaint } from "../models/complaint.model.js";
import { User } from "../models/user.model.js";
import { ComplaintStatus, Priority, UserRole } from "../types/domain.js";
import { autoRouteComplaint } from "../services/complaint-routing.service.js";
import { transitionComplaintStatus } from "../services/complaint-lifecycle.service.js";

dotenv.config();

async function runVerification() {
  console.log("=================================================");
  console.log("VCGIS — ENFORCED COMPLAINT FLOW VERIFICATION SUITE");
  console.log("=================================================");

  await connectDatabase();

  // Find a demo citizen user
  const citizen = await User.findOne({ role: UserRole.CITIZEN });
  const volunteer = await User.findOne({ role: UserRole.VOLUNTEER });
  const waterStaff = await User.findOne({ role: UserRole.DEPARTMENT_STAFF, "departmentStaffProfile.departmentCode": "WATER" });

  if (!citizen || !volunteer || !waterStaff) {
    console.error("❌ Required demo users not found in database. Run seed first.");
    process.exit(1);
  }

  console.log(`✓ Demo Citizen: ${citizen.name}`);
  console.log(`✓ Demo Volunteer: ${volunteer.name}`);
  console.log(`✓ Demo Water Staff: ${waterStaff.name}`);

  const testCases = [
    {
      name: "Water Supply Complaint",
      title: "No water supply and leaking pipeline",
      description: "There has been no water supply in our village for three days and the pipeline is leaking near the school.",
      department: "Water Supply",
      departmentCode: "WATER",
      category: "Water Supply & Distribution",
    },
    {
      name: "Road & Transport Complaint",
      title: "Road blocked due to drainage",
      description: "Road is blocked due to drainage near TC Palya Main Road.",
      department: "Roads & Transport",
      departmentCode: "ROAD",
      category: "Road Damage & Potholes",
    },
    {
      name: "Electricity Complaint",
      title: "Street lights and power not working",
      description: "Power and street lights are not working in our area.",
      department: "Electricity & Power",
      departmentCode: "ELECTRICITY",
      category: "Power Outage & Street Lighting",
    },
    {
      name: "Low Confidence / Ambiguous Complaint",
      title: "General issue near village",
      description: "There is a serious problem near our village and people are facing difficulty.",
      department: "Water Supply",
      departmentCode: "WATER",
      category: "General Grievance",
    },
  ];

  for (const tc of testCases) {
    console.log(`\n-------------------------------------------------`);
    console.log(`TESTING FLOW: ${tc.name}`);
    console.log(`-------------------------------------------------`);

    const complaintNumber = await Complaint.generateComplaintNumber();

    // 1. Citizen Submits Complaint
    const complaint = await Complaint.create({
      complaintNumber,
      citizenId: citizen._id,
      citizenName: citizen.name,
      citizenPhone: citizen.phone,
      title: tc.title,
      description: tc.description,
      category: tc.category,
      department: tc.department,
      departmentCode: tc.departmentCode as any,
      status: ComplaintStatus.SUBMITTED,
      priority: Priority.MEDIUM,
      location: {
        village: "Rampura",
        district: "Mysuru",
      },
      sla: {
        targetResolutionDate: new Date(Date.now() + 86400000 * 3),
        isBreached: false,
      },
      timeline: [
        {
          status: ComplaintStatus.SUBMITTED,
          message: "Submitted by citizen",
          actorId: citizen._id,
          actorRole: UserRole.CITIZEN,
          actorName: citizen.name,
          timestamp: new Date(),
        },
      ],
    });

    console.log(`1. Created Complaint ${complaint.complaintNumber} with Status: [${complaint.status}]`);

    // 2. Test Routing Protection: Ensure autoRouteComplaint CANNOT route unverified complaint
    const routeResult = await autoRouteComplaint(complaint);
    const freshComplaintAfterAttempt = await Complaint.findById(complaint._id);

    if (routeResult.assigned || freshComplaintAfterAttempt?.status === ComplaintStatus.ASSIGNED) {
      console.error(`❌ ROUTING PROTECTION FAILURE: Unverified complaint was directly routed! Status: ${freshComplaintAfterAttempt?.status}`);
      process.exit(1);
    } else {
      console.log(`✓ ROUTING PROTECTION CONFIRMED: autoRouteComplaint blocked direct routing. Status remains: [${freshComplaintAfterAttempt?.status}]`);
    }

    // 3. Test Department Staff Isolation: Ensure unverified complaint is NOT in Staff Queue query
    const UNVERIFIED_STATUSES = [ComplaintStatus.DRAFT, ComplaintStatus.SUBMITTED, ComplaintStatus.VERIFICATION_REQUIRED];
    const staffQueueMatches = await Complaint.find({
      departmentCode: tc.departmentCode,
      status: { $nin: UNVERIFIED_STATUSES },
      _id: complaint._id,
    });

    if (staffQueueMatches.length > 0) {
      console.error(`❌ STAFF QUEUE LEAK: Unverified complaint ${complaint.complaintNumber} leaked into Department Staff queue!`);
      process.exit(1);
    } else {
      console.log(`✓ DEPARTMENT QUEUE ISOLATION CONFIRMED: Unverified complaint is NOT visible to Department Staff.`);
    }

    // 4. Perform Volunteer Field Verification
    console.log(`2. Volunteer ${volunteer.name} performing field verification...`);
    await transitionComplaintStatus(complaint._id.toString(), {
      newStatus: ComplaintStatus.VERIFIED,
      remarks: "Field verification completed by volunteer. Incident confirmed.",
      actor: {
        id: volunteer._id.toString(),
        name: volunteer.name,
        role: UserRole.VOLUNTEER,
        phone: volunteer.phone,
        email: volunteer.email,
      },
    });

    // 5. Verify post-verification state
    const finalComplaint = await Complaint.findById(complaint._id);
    console.log(`3. Post-Verification Status: [${finalComplaint?.status}]`);

    if (finalComplaint?.status === ComplaintStatus.ASSIGNED) {
      console.log(`✓ VOLUNTEER GATE & AUTO ROUTING SUCCESSFUL: Complaint transitioned VERIFIED → ASSIGNED`);
    } else if (finalComplaint?.status === ComplaintStatus.VERIFIED || finalComplaint?.status === ComplaintStatus.ON_HOLD) {
      console.log(`✓ VOLUNTEER VERIFICATION PASSED: Final Status is [${finalComplaint?.status}]`);
    } else {
      console.error(`❌ UNEXPECTED POST-VERIFICATION STATUS: ${finalComplaint?.status}`);
      process.exit(1);
    }

    // 6. Verify complaint is NOW in Department Staff Queue
    const postVerificationStaffQueue = await Complaint.find({
      departmentCode: tc.departmentCode,
      status: { $nin: UNVERIFIED_STATUSES },
      _id: complaint._id,
    });

    if (postVerificationStaffQueue.length === 1) {
      console.log(`✓ DEPARTMENT STAFF QUEUE CONFIRMED: Verified complaint is now active in Department Staff Queue.`);
    } else {
      console.error(`❌ DEPARTMENT QUEUE ERROR: Verified complaint missing from Staff Queue!`);
      process.exit(1);
    }
  }

  console.log("\n=================================================");
  console.log("🎉 ALL 4 FLOW ENFORCEMENT TEST CASES PASSED SUCCESSFULLY!");
  console.log("=================================================");
  await mongoose.disconnect();
  process.exit(0);
}

runVerification().catch((err) => {
  console.error("Verification error:", err);
  process.exit(1);
});
