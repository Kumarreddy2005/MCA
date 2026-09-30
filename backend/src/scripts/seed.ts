import dotenv from "dotenv";
import mongoose from "mongoose";
import { UserRole } from "../types/domain.js";
import { connectDatabase } from "../config/database.js";
import { config } from "../config/env.js";
import { User } from "../models/user.model.js";
import { KnowledgeDocument } from "../models/knowledge-document.model.js";
import { Department } from "../models/department.model.js";
import { logger } from "../utils/logger.js";

dotenv.config();

export async function seedInitialUsers(): Promise<void> {
  await connectDatabase();

  const adminEmail = process.env.ADMIN_SEED_EMAIL || "admin@vcgis.gov.in";
  const adminPassword = process.env.ADMIN_SEED_PASSWORD || "Admin@12345";

  // 1. Ensure Super Admin exists
  const existingAdmin = await User.findOne({ email: adminEmail });
  if (!existingAdmin) {
    await User.create({
      name: "System Administrator",
      email: adminEmail,
      phone: "9999999999",
      password: adminPassword,
      role: UserRole.ADMIN,
      isActive: true,
      isVerified: true,
      adminProfile: {
        superAdmin: true,
        permissions: ["ALL"],
      },
    });
    logger.info(`[SEED] Created default system admin: ${adminEmail}`);
  } else {
    logger.info(`[SEED] Admin account already exists: ${adminEmail}`);
  }

  // 2. In development mode, provision demo volunteer & official accounts if missing
  if (config.isDev) {
    const volunteerEmail = "volunteer@vcgis.gov.in";
    const existingVolunteer = await User.findOne({ email: volunteerEmail });
    const volunteerData = {
      name: "Ramesh Kumar (Volunteer)",
      email: volunteerEmail,
      phone: "9876543210",
      password: process.env.VOLUNTEER_SEED_PASSWORD || "Volunteer@12345",
      role: UserRole.VOLUNTEER,
      isActive: true,
      isVerified: true,
      volunteerProfile: {
        volunteerId: "VOL-MYS-001",
        assignedVillage: "Rampura",
        assignedWard: "Ward 4",
        assignedPanchayat: "Rampura Grama Panchayat",
        district: "Mysuru",
      },
    };
    if (!existingVolunteer) {
      await User.create(volunteerData);
      logger.info(`[SEED] Created demo volunteer: ${volunteerEmail}`);
    } else {
      await User.updateOne({ email: volunteerEmail }, { $set: { name: volunteerData.name, volunteerProfile: volunteerData.volunteerProfile } });
      logger.info(`[SEED] Updated demo volunteer to Karnataka profile: ${volunteerEmail}`);
    }

    const officialEmail = "official@vcgis.gov.in";
    const existingOfficial = await User.findOne({ email: officialEmail });
    const officialData = {
      name: "Smt. Priya Sharma (EE RDPR)",
      email: officialEmail,
      phone: "9876543211",
      password: process.env.OFFICIAL_SEED_PASSWORD || "Official@12345",
      role: UserRole.OFFICIAL,
      isActive: true,
      isVerified: true,
      officialProfile: {
        department: "Roads & Transport",
        departmentCode: "ROAD",
        designation: "Executive Engineer",
        jurisdictionDistrict: "Mysuru",
        jurisdictionTaluk: "Mysuru Taluk",
      },
    };
    if (!existingOfficial) {
      await User.create(officialData);
      logger.info(`[SEED] Created demo official: ${officialEmail}`);
    } else {
      await User.updateOne({ email: officialEmail }, { $set: { name: officialData.name, officialProfile: officialData.officialProfile } });
      logger.info(`[SEED] Updated demo official to Karnataka profile: ${officialEmail}`);
    }

    const staffSeeds = [
      { email: "road.staff@vcgis.gov.in", name: "Road Department Staff", phone: "9876543213", departmentCode: "ROAD" },
      { email: "electricity.staff@vcgis.gov.in", name: "Electricity Department Staff", phone: "9876543214", departmentCode: "ELECTRICITY" },
      { email: "water.staff@vcgis.gov.in", name: "Water Department Staff", phone: "9876543215", departmentCode: "WATER" },
    ] as const;
    for (const staff of staffSeeds) {
      const account = (await User.findOne({ email: staff.email })) || new User({ email: staff.email });
      account.name = staff.name;
      account.phone = staff.phone;
      account.role = UserRole.DEPARTMENT_STAFF;
      account.isActive = true;
      account.isVerified = true;
      account.password = process.env.DEPARTMENT_STAFF_SEED_PASSWORD || "Staff@12345";
      account.departmentStaffProfile = { departmentCode: staff.departmentCode };
      await account.save();
    }
    logger.info(`[SEED] Provisioned ${staffSeeds.length} Department Staff demo accounts.`);

    const citizenPhone = "9876543212";
    const existingCitizen = await User.findOne({ phone: citizenPhone });
    const citizenData = {
      name: "Basavaraj Gowda",
      phone: citizenPhone,
      role: UserRole.CITIZEN,
      isActive: true,
      isVerified: true,
      citizenProfile: {
        village: "Rampura",
        ward: "Ward 4",
        district: "Mysuru",
        pincode: "570001",
        address: "House 3-45, Main Road, Rampura",
      },
    };
    if (!existingCitizen) {
      await User.create(citizenData);
      logger.info(`[SEED] Created demo citizen: ${citizenPhone}`);
    } else {
      await User.updateOne({ phone: citizenPhone }, { $set: { name: citizenData.name, citizenProfile: citizenData.citizenProfile } });
    }

    // Seed Authoritative Karnataka Knowledge Documents (Phase 9 RAG)
    const seedDocs = [
      {
        documentNumber: "KRN-ACT-SAKALA-2011-01",
        title: "The Karnataka Sakala Services Act, 2011 & Citizen Service Charter",
        department: "Roads & Transport",
        departmentCode: "ROAD",
        category: "Citizen Services & Statutory SLA",
        version: "2.0",
        effectiveDate: new Date("2012-04-02"),
        source: "Karnataka Gazette Extra-Ordinary No. 412",
        approvalState: "APPROVED",
        documentStatus: "ACTIVE",
        content:
          "Under the Karnataka Guarantee of Services to Citizens Act (Sakala), drinking water grievances must be redressed within 15 calendar days maximum. Emergency electrical hazards must be attended within 24 hours. Defaulting officers are subject to a statutory compensation penalty of Rs. 20 per day of delay up to Rs. 500.",
        tags: ["sakala", "timeline", "compensation", "penalty", "appeal", "delay", "tahsildar"],
      },
      {
        documentNumber: "KRN-GO-RDPR-2024-41",
        title: "Jal Jeevan Mission & Rural Drinking Water Scheme Operational Guidelines",
        department: "Rural Drinking Water & Sanitation",
        category: "Drinking Water Infrastructure",
        version: "1.2",
        effectiveDate: new Date("2024-01-15"),
        source: "RDPR Department Circular RDPR/78/RWS/2024",
        approvalState: "APPROVED",
        documentStatus: "ACTIVE",
        content:
          "When a community borewell motor or pump fails, Gram Panchayat is authorized to execute repairs within 48 hours using Untied Maintenance Funds up to Rs. 45,000 directly without district tender. Tankers must be dispatched within 12 hours if repairs take longer.",
        tags: ["borewell", "motor", "drinking water", "water tanker", "fluoride", "pump replacement", "panchayat"],
      },
      {
        documentNumber: "KRN-KERC-BESCOM-2023-12",
        title: "BESCOM Standard of Performance & Electricity Distribution Consumer Rights Code",
        department: "Energy Department",
        category: "Power Distribution & Public Safety",
        version: "3.1",
        effectiveDate: new Date("2023-08-01"),
        source: "Karnataka Electricity Regulatory Commission (KERC) Notification",
        approvalState: "APPROVED",
        documentStatus: "ACTIVE",
        content:
          "Distribution transformer failure replacement SLA is 24 hours in rural areas and 12 hours in urban areas. Snapped overhead live conductors must be attended within 1 hour. Scheduled load shedding requires 24 hours advance notification.",
        tags: ["transformer", "bescom", "power outage", "live conductor", "electricity", "feeder", "kerc"],
      },
      {
        documentNumber: "KRN-UDD-SWM-2022-09",
        title: "Karnataka Municipal Solid Waste Management Bye-Laws & Sanctions",
        department: "Sanitation & Solid Waste",
        category: "Urban Solid Waste Management",
        version: "1.0",
        effectiveDate: new Date("2022-11-01"),
        source: "Urban Development Department Gazette Notification",
        approvalState: "APPROVED",
        documentStatus: "ACTIVE",
        content:
          "Daily 100% door-to-door waste collection between 6:30 AM and 11:00 AM. Illegal garbage dump black spots must be cleared within 24 hours. Spot fines of Rs. 1,000 for first offence and Rs. 5,000 for recurring violations.",
        tags: ["garbage", "waste", "black spot", "dumping", "fine", "penalty", "pourakarmika", "sanitation"],
      },
    ];

    for (const doc of seedDocs) {
      await KnowledgeDocument.findOneAndUpdate(
        { documentNumber: doc.documentNumber },
        { ...doc, chunks: [{ chunkId: `${doc.documentNumber}_c0`, chunkIndex: 0, content: doc.content }] },
        { upsert: true, new: true }
      );
    }
    logger.info(`[SEED] Seeded ${seedDocs.length} Karnataka knowledge documents for RAG.`);

    // 3. Seed the three operational VCGIS departments. Legacy records are retained but deactivated.
    await Department.updateMany({}, { $set: { isActive: false } });
    const departmentsSeed = [
      { name: "Roads & Transport", code: "ROAD", description: "Roads, potholes, bridges, footpaths and transport infrastructure grievances.", isActive: true, categories: [{ name: "Road Maintenance", subcategories: ["Pothole", "Road Damage", "Road Collapse", "Waterlogged Road", "Footpath Damage", "Damaged Speed Breaker", "Damaged Manhole", "Roadside Damage", "Bridge/Culvert Damage", "Other Road Issue"] }], slaConfig: { criticalHours: 24, highHours: 48, mediumHours: 120, lowHours: 240 } },
      { name: "Electricity & Power", code: "ELECTRICITY", description: "Power supply, street electrical infrastructure and public electrical safety grievances.", isActive: true, categories: [{ name: "Electrical Services", subcategories: ["Power Outage", "Streetlight Failure", "Transformer Problem", "Electrical Pole Damage", "Broken/Low-Hanging Wire", "Exposed Electrical Cable", "Sparking", "Voltage Fluctuation", "Electrical Safety Hazard", "Other Electricity Issue"] }], slaConfig: { criticalHours: 24, highHours: 48, mediumHours: 120, lowHours: 240 } },
      { name: "Water Supply", code: "WATER", description: "Drinking water supply, pipelines, borewells, pumps and water quality grievances.", isActive: true, categories: [{ name: "Water Services", subcategories: ["No Water Supply", "Low Water Pressure", "Pipeline Leakage", "Pipeline Burst", "Borewell Failure", "Pump Failure", "Water Tank Problem", "Water Contamination", "Irregular Water Supply", "Other Water Issue"] }], slaConfig: { criticalHours: 24, highHours: 48, mediumHours: 120, lowHours: 240 } },
    ];

    for (const dept of departmentsSeed) {
      await Department.findOneAndUpdate(
        { $or: [{ code: dept.code }, { name: dept.name }] },
        { ...dept },
        { upsert: true, new: true }
      );
    }
    logger.info(`[SEED] Seeded ${departmentsSeed.length} Karnataka Government departments with SLA configs.`);
  }

  logger.info("[SEED] Seeding completed successfully.");
}

// Run standalone if executed directly
if (process.argv[1]?.endsWith("seed.ts") || process.argv[1]?.endsWith("seed.js")) {
  seedInitialUsers()
    .then(async () => {
      await mongoose.disconnect();
      process.exit(0);
    })
    .catch(async (err) => {
      logger.error("Seeding failed:", err);
      await mongoose.disconnect();
      process.exit(1);
    });
}
