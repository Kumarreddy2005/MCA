# VCGIS Public & Administrative User Manual

**System Name:** Village Volunteer-Assisted Citizen Grievance Intelligence System (VCGIS)  
**Governance Authority:** Government of Karnataka (Department of Rural Development & Panchayat Raj)  
**Document Version:** 1.0 (End-User Operational Guide)  
**Target Audience:** Citizens of Karnataka, Village Volunteers, Department Officials, and State Administrators  

---

## 1. Introduction to VCGIS

Welcome to the **Village Volunteer-Assisted Citizen Grievance Intelligence System (VCGIS)**. VCGIS is an initiative by the Government of Karnataka designed to ensure that every public grievance—from broken drinking water borewells to hazardous electric wires—is swiftly registered, transparently tracked, and resolved within statutory deadlines established under the **Karnataka Guarantee of Services to Citizens Act (Sakala Act, 2011)**.

VCGIS provides dedicated, role-specific portals tailored to four key user groups:
1. **Citizens:** Direct submission, real-time tracking, and satisfaction rating.
2. **Village Volunteers:** Grassroots support for rural citizens, ground verification, and petition structuring.
3. **Department Officials:** Department-isolated work queues, field action logging, and resolution photo proof submission.
4. **Administrators:** Staff user lifecycle, department SLA configuration, and cross-system audit trail monitoring.

---

## 2. Citizen User Guide

### 2.1 Logging In (Passwordless Mobile OTP)
Citizens do not need to memorize passwords. All authentication is secured through your 10-digit mobile phone number:
1. Open your web browser and navigate to `http://localhost:5173/login` (or the state portal address).
2. Ensure the **"Citizen Login (OTP)"** tab is active.
3. Enter your **10-digit Mobile Number** (e.g. `9876543212`).
4. Click **"Send OTP"**.
5. In local development or test mode, an amber notification will display: `Dev Mode OTP: XXXXXX [AUTO-FILLED]`. The 6-digit verification code will automatically appear in the input boxes. (In production, an SMS text message will arrive on your phone).
6. *(First-time users only)* Enter your **Full Name**, **Village / Ward**, and **District**.
7. Click **"Verify & Sign In"**. You will be redirected to your personal **Citizen Dashboard**.

---

### 2.2 Lodging a New Grievance
To submit a public complaint or infrastructure grievance:
1. On your Citizen Dashboard, click the green **"+ File New Grievance"** button in the top right.
2. The **"File Public Grievance"** window will appear.
3. **Category & Department:** Select the relevant department from the dropdown (e.g., *Rural Water Supply*, *Electricity & Power / BESCOM*, *Sanitation & Solid Waste*).
4. **Grievance Title:** Provide a concise title describing the issue (e.g., *"Drinking water borewell motor burnt in Ward 4"*).
5. **Detailed Description:** Describe what happened, how many households are affected, and the exact location.
6. **Ground Geotagging (GPS):** Click **"Detect My Location"**. When prompted by your browser, select **"Allow"** to attach your exact latitude and longitude coordinates. This helps field repair teams locate the exact pole or pipeline.
7. **Evidence Upload:** Click **"Attach Evidence"** to upload up to 5 photos, scans, or PDF documents (max 10MB each) showing the damaged infrastructure or written petition.
8. Click **"Submit Grievance"**.
9. The system will immediately generate an official Karnataka Grievance Tracking Number (e.g. `CMP-2026-00042`) and display your statutory Sakala resolution deadline.

---

### 2.3 Using the Citizen AI Assistant
If you need help drafting your petition in formal Kannada or English:
1. In the top navigation bar, click **"AI Citizen Assistant"**.
2. Type a brief description of your problem in plain language (e.g., *"Our village transformer sparked and power has been out for 3 days"*).
3. The AI Assistant will:
   - Formulate a clear, structured title and professional petition statement.
   - Recommend the correct Karnataka government department (e.g. *Energy Department / BESCOM*).
   - Indicate whether your complaint falls under an emergency safety hazard.
   - Explain your statutory rights and Sakala deadline in simple words.
4. Click **"Apply to Complaint Form"** to transfer the text directly into your submission window.

---

### 2.4 Tracking Progress & Giving Feedback
1. On your **Citizen Dashboard**, locate your complaint in the grievance list.
2. Each complaint card displays:
   - Current Lifecycle Status (e.g., `SUBMITTED`, `ASSIGNED`, `ACTION_IN_PROGRESS`, `RESOLVED`).
   - Assigned Department and Jurisdictional Officer.
   - Color-coded SLA Deadline Badge (Green = On Track, Amber = Approaching Deadline, Red = Overdue).
3. Click on the complaint card to open the **Grievance Dossier**:
   - View the chronological **Audit Timeline** detailing every action taken by officials.
   - View uploaded evidence photos and official resolution proofs.
4. **Rating Satisfaction:** When your grievance is marked `RESOLVED`, a feedback section will appear. Select a **1 to 5 star rating** and leave optional feedback remarks.
5. **Reopening Unresolved Work:** If the problem was marked resolved but the ground reality has not been fixed, click **"Reopen Grievance"** within 7 days. You will be prompted to explain why the resolution was incomplete, and the complaint will be escalated back to senior officials.

---

## 3. Village Volunteer User Guide

### 3.1 Logging In as a Volunteer
Village Volunteers are issued government credentials assigned to a specific Gram Panchayat:
1. Navigate to the login page and click the **"Staff Login"** tab.
2. Enter your volunteer email (e.g. `volunteer@vcgis.gov.in`) and password.
3. Click **"Sign In as Staff"**.
4. You will arrive at the **Village Volunteer Field Portal**. Your badge number (e.g. `VOL-MYS-001`) and assigned village cluster will be displayed in the header.

---

### 3.2 Onboarding a Citizen (Assisted Registration)
When assisting a rural resident who does not possess a smartphone or digital access:
1. Click **"Register Rural Citizen"**.
2. Enter the citizen's **Full Name**, **10-digit Mobile Number**, **Village**, **Ward Number**, and **Gram Panchayat**.
3. Click **"Register & Create Citizen Profile"**. The citizen is now in the system and can receive automated SMS alerts regarding their grievances.

---

### 3.3 Lodging a Complaint on Behalf of a Citizen
1. Click **"File Assisted Grievance"**.
2. **Citizen Lookup:** Enter the citizen's mobile phone number to find their profile.
3. Fill out the grievance details (Department, Title, Description) based on the villager's verbal statements.
4. If the citizen provided handwritten petition paper, take a photo and upload it under **Evidence Files**.
5. Enable device GPS to record the incident coordinates.
6. Click **"Submit on Citizen's Behalf"**. The grievance will be permanently linked to both the citizen and your volunteer badge for auditability.

---

### 3.4 Conducting a 4-Point Ground Verification
When the system or department flags a complaint requiring physical field inspection:
1. Locate the complaint in your **"Assigned for Field Verification"** work queue.
2. Click **"Perform Field Verification"**.
3. Travel to the site and complete the mandatory **4-Point Ground Checklist**:
   - [x] **Citizen Identity Confirmed:** Citizen was physically met and verified.
   - [x] **Incident Ground Reality Confirmed:** Damage or failure was observed on-site.
   - [x] **Evidence Matches Ground Reality:** Submitted photos correspond to the actual site.
   - [x] **Severity Level Verified:** Public hazard level verified.
4. **On-Site Photos:** Capture and upload up to 5 clear on-site inspection photographs.
5. **Volunteer Ground Remarks:** Enter detailed observations (e.g., *"Inspected transformer at 11:30 AM; oil leakage confirmed from bottom radiator fin; immediate replacement required"*).
6. Select the verification determination: **`VERIFIED`**, **`REQUIRES_INFO`**, or **`REJECTED`** (if claim is false or fabricated).
7. Click **"Submit Official Verification"**. The complaint will immediately advance to `VERIFIED` and route to the executive engineer.

---

### 3.5 Volunteer Structuring Assistant (AI Copilot)
To convert fast verbal notes taken during village rounds into formal petitions:
1. Click **"AI Structuring Assistant"**.
2. Paste your raw, informal notes (e.g., *"Rampura village main borewell near temple motor failed last week villagers carrying water from 2km"*).
3. Click **"Structure Petition"**.
4. The copilot will organize the notes into four formal sections:
   - **Incident Summary**
   - **Location Specifics**
   - **Observed Public Impact**
   - **Formal Petition Text**
5. It will also flag any missing critical data (e.g. *Warning: Ward number or pump horsepower not specified*).
6. Click **"Insert into Form"** to populate your assisted complaint window.

---

## 4. Department Official User Guide

### 4.1 Departmental Isolation & Queue Management
Department officials only have access to grievances assigned to their authorized department:
1. Log in via the **"Staff Login"** tab using your department credentials (e.g. `official@vcgis.gov.in`).
2. Your dashboard displays the **7 Key Operational Metrics**:
   - Total Department Complaints
   - New Intakes (Last 48 Hours)
   - Pending Action
   - High & Critical Life Hazards
   - Approaching SLA Breach (<24 Hours)
   - Resolved Cases
   - Reopened Petitions
3. **Filtering Your Work Queue:** Filter cases by:
   - *Status:* `SUBMITTED`, `ASSIGNED`, `UNDER_REVIEW`, `ACTION_IN_PROGRESS`
   - *Priority:* `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`
   - *Taluk / Jurisdiction Scope:* Filter by specific villages or wards
   - *SLA Status:* Show only cases at immediate risk of statutory breach

---

### 4.2 Reviewing Grievances & AI Insights
1. Click on any grievance row to open the **Official Review Drawer**.
2. **Live SLA Countdown Timer:** Observe the color-coded timer counting down statutory hours remaining before automatic escalation to the Tahsildar or District Collector.
3. **AI Intelligence Dossier:** Review automated extraction results:
   - *Model Department Confidence:* Percentage match for your department.
   - *Extracted Administrative Entities:* Districts, taluks, Gram Panchayats detected in text.
   - *Duplicate Risk Badge:* Shows if identical grievances were lodged nearby within a 2km radius.
   - *Urgency Assessment:* Life-safety hazard indicators flagged by the system.
4. **Recording Interim Field Actions:** Click **"Record Action / Field Remark"** to log progress updates (e.g. `CONTRACTOR_DISPATCHED`, `INSPECTION_UNDERTAKEN`, `INTERNAL_NOTE`). Mark notes as internal if they contain inter-departmental technical deliberations not meant for public display.

---

### 4.3 Resolving a Complaint (Mandatory Photo Proof Protocol)
Under Karnataka Sakala rules, a grievance cannot be marked resolved through verbal assurances:
1. In the Review Drawer, click **"Resolve Grievance"**.
2. **Resolution Summary:** Enter a detailed report of the work completed (e.g., *"Replaced 25kVA burnt transformer with new 63kVA unit; test energization completed; voltage steady at 230V"*).
3. **Contractor / Team Details:** Enter the names of the lineman, technician, or contractor who executed the physical repair.
4. **Mandatory Photographic Proof:** Upload at least one clear photograph showing the completed repair work on-site. *(The system will block resolution if evidence photos are omitted).*
5. Click **"Confirm & Mark Resolved"**.
6. The citizen will immediately receive an automated resolution alert, and the SLA timer will stop.

---

### 4.4 Formal Statutory Rejection Protocol
If a petition is legally or administratively ineligible:
1. Click **"Reject Grievance"**.
2. Select or type the statutory grounds for rejection (e.g., *"Private civil land dispute currently sub judice in Civil Court; outside Gram Panchayat administrative jurisdiction under Section 14 of Karnataka Gram Swaraj Act"*).
3. Click **"Submit Statutory Rejection"**. The decision is permanently logged in the audit trail and conveyed to the citizen.

---

## 5. Administrator User Guide

### 5.1 User Lifecycle Management
SuperAdministrators manage the statewide user roster:
1. Navigate to the **Administrator Console** (`/admin`) and select the **"User Management"** tab.
2. View all registered users across Citizen, Volunteer, Official, and Admin roles.
3. **Provisioning Staff:** Click **"+ Create Staff User"**. Enter their name, email, phone, role, and jurisdiction.
4. **Status Toggles:** Click the toggle switch to deactivate any staff user who has transferred or resigned.

---

### 5.2 Department SLA Configuration
State administrators can dynamically tune statutory resolution deadlines:
1. Select the **"Department & SLA Tuning"** tab.
2. Select any of the 11 Karnataka departments (e.g., *Rural Water Supply*).
3. View and adjust statutory SLA resolution hours across priority tiers:
   - Critical Priority SLA (Default: 24 Hours)
   - High Priority SLA (Default: 48 Hours)
   - Medium Priority SLA (Default: 120 Hours / 5 Days)
   - Low Priority SLA (Default: 240 Hours / 10 Days)
4. Click **"Save SLA Thresholds"**. Changes take effect immediately for all new incoming grievances.

---

### 5.3 Cross-System Audit Explorer
For transparency and anti-corruption oversight:
1. Select the **"Audit Log Explorer"** tab.
2. Search across millions of system events by:
   - Actor Role (`CITIZEN`, `VOLUNTEER`, `OFFICIAL`, `ADMIN`)
   - Action Type (`STATUS_CHANGE`, `ASSIGNED`, `RESOLVED`, `SLA_ESCALATED`, `USER_CREATED`)
   - Complaint Number (e.g. `CMP-2026-00042`)
   - Date Range
3. Inspect complete JSON state deltas showing exact fields modified, old values, new values, timestamp, and actor IP address.

---

## 6. Accessing Knowledge & Policy Orders (RAG Assistant)

All users can access Karnataka Government circulars, statutory rules, and scheme guidelines:
1. In the top navigation bar, click **"Schemes & GOs"**.
2. Enter your inquiry (e.g., *"What is the Sakala timeline for repairing rural street lights?"* or *"Who is responsible for borewell motor repairs under Jal Jeevan Mission?"*).
3. The RAG assistant will retrieve authoritative text extracts, providing:
   - Direct, factual answers to your query.
   - Exact Government Order (GO) numbers and publication dates.
   - Authoritative department citations.
   - Formal disclaimers if no approved state policy covers the subject.
