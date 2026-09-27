# VCGIS Formal Test Case Catalog & Specification

**System Name:** Village Volunteer-Assisted Citizen Grievance Intelligence System (VCGIS)  
**Governance Authority:** Government of Karnataka  
**Document Revision:** 1.0 (Detailed Test Case Specifications)  
**Audit Date:** September 2026  

---

## 1. Test Case Specification Standard

Every test case in this catalog is documented with its formal preconditions, test inputs, execution steps, expected outcomes, and verifiable execution status. 

### Status Distinctions:
- **`EXECUTED — PASSED`**: Test was executed via automated test scripts against active services and verified passing with zero assertions failed.
- **`EXECUTED — FAILED`**: Test was executed and failed an assertion.
- **`DESIGNED — READY FOR STAGING`**: Formal test designed for manual staging, user acceptance testing (UAT), or telecom integration.

---

## 2. Master Test Case Inventory

### 2.1 Authentication & Role-Based Access Control (AUTH / RBAC)

#### TC-AUTH-001: Citizen Mobile OTP Generation & TTL Expiration
- **Module:** Authentication
- **Feature:** Citizen Passwordless Login
- **Scenario:** Citizen requests an OTP for a valid 10-digit Indian mobile number.
- **Preconditions:** Backend server running, MongoDB connected.
- **Test Data:** `phone: "9876543210"`
- **Steps:**
  1. Send `POST /api/auth/citizen/send-otp` with JSON body `{"phone": "9876543210"}`.
  2. Inspect HTTP status and response payload.
  3. Query MongoDB `otps` collection for document with `phone: "9876543210"`.
- **Expected Result:** HTTP 200 returned; `devOtpPreview` returned in development; MongoDB record created with 300-second TTL index.
- **Actual Result:** Verified HTTP 200, OTP `493933` generated with `expiresInSeconds: 300`.
- **Execution Status:** **`EXECUTED — PASSED`** (Script: `verify-auth.ts`, Test 1)
- **Priority:** P0

---

#### TC-AUTH-002: Citizen OTP Verification & Token Issuance
- **Module:** Authentication
- **Feature:** Citizen Login Verification
- **Scenario:** Citizen submits valid 6-digit OTP to receive session tokens.
- **Preconditions:** TC-AUTH-001 passed; OTP exists in DB.
- **Test Data:** `phone: "9876543210"`, `otp: "493933"`, `name: "Ramesh Gowda"`, `village: "Rampura"`
- **Steps:**
  1. Send `POST /api/auth/citizen/verify-otp` with phone and OTP.
  2. Inspect response for `accessToken`, `refreshToken`, and user profile.
- **Expected Result:** HTTP 200; `accessToken` is valid JWT with `role: "CITIZEN"`; `refreshToken` is saved to DB.
- **Actual Result:** HTTP 200; tokens issued; citizen profile initialized.
- **Execution Status:** **`EXECUTED — PASSED`** (Script: `verify-auth.ts`, Test 2)
- **Priority:** P0

---

#### TC-AUTH-003: Staff Password Login with Role Redirection
- **Module:** Authentication
- **Feature:** Staff Login
- **Scenario:** Official logs in using email and salted bcrypt password.
- **Preconditions:** Default seed accounts initialized in DB.
- **Test Data:** `email: "official@vcgis.gov.in"`, `password: "Official@12345"`
- **Steps:**
  1. Send `POST /api/auth/staff/login` with staff credentials.
  2. Verify returned role and official profile.
- **Expected Result:** HTTP 200; `role: "OFFICIAL"`; `officialProfile.department` contains assigned department.
- **Actual Result:** HTTP 200; official logged in successfully.
- **Execution Status:** **`EXECUTED — PASSED`** (Script: `verify-auth.ts`, Test 3)
- **Priority:** P0

---

#### TC-AUTH-004: Strict RBAC Route Rejection (Negative Security Case)
- **Module:** Authorization / RBAC
- **Feature:** Role Guard Middleware
- **Scenario:** Citizen token attempts to access administrative user management endpoint.
- **Preconditions:** Citizen authenticated; valid citizen JWT obtained.
- **Test Data:** `Authorization: Bearer <citizen_jwt>`, endpoint: `GET /api/admin/users`
- **Steps:**
  1. Send `GET /api/admin/users` with citizen token.
  2. Inspect HTTP status code and error message.
- **Expected Result:** HTTP 403 Forbidden; error code `FORBIDDEN` returned.
- **Actual Result:** HTTP 403 returned with structured error message.
- **Execution Status:** **`EXECUTED — PASSED`** (Script: `verify-auth.ts`, Test 8)
- **Priority:** P0

---

### 2.2 Citizen Portal & Grievance Lodging (CITIZEN / COMPLAINT)

#### TC-CIT-001: Multipart Grievance Lodging with GPS Geotagging
- **Module:** Citizen Portal
- **Feature:** Grievance Submission
- **Scenario:** Citizen lodges a rural water grievance with GPS coordinates and evidence files.
- **Preconditions:** Citizen authenticated.
- **Test Data:** Department: "Rural Water Supply", Title: "Borewell pump motor failure in Ward 3", Coordinates: `{ lat: 12.2958, lng: 76.6394 }`, Attachments: 2 sample photos.
- **Steps:**
  1. Submit multipart POST to `/api/complaints`.
  2. Verify auto-generated `complaintNumber` and calculated SLA deadline.
- **Expected Result:** HTTP 201; complaint created in `SUBMITTED` state; priority SLA target set.
- **Actual Result:** HTTP 201; generated tracking number `CMP-2026-XXXXX`; priority set to `HIGH`.
- **Execution Status:** **`EXECUTED — PASSED`** (Script: `verify-complaints.ts`, Test 1)
- **Priority:** P0

---

#### TC-CIT-002: Citizen Grievance Satisfaction Feedback & 7-Day Reopen
- **Module:** Citizen Portal
- **Feature:** Feedback & Reopening
- **Scenario:** Citizen submits 5-star rating on resolved case, then tests reopen flow.
- **Preconditions:** Complaint in `RESOLVED` state.
- **Test Data:** Rating: 5, Remarks: "Great work", Reopen Reason: "Water stopped again".
- **Steps:**
  1. Send `POST /api/complaints/:id/feedback` with rating.
  2. Send `POST /api/complaints/:id/reopen` with reopen reason.
- **Expected Result:** Feedback recorded; status transitions to `REOPENED` with escalation event logged.
- **Actual Result:** HTTP 200 on feedback; HTTP 200 on reopen; state changed to `REOPENED`.
- **Execution Status:** **`EXECUTED — PASSED`** (Script: `verify-complaints.ts`, Tests 6 & 7)
- **Priority:** P1

---

### 2.3 Village Volunteer Portal & Ground Verification (VOLUNTEER)

#### TC-VOL-001: Assisted Rural Citizen Onboarding
- **Module:** Volunteer Portal
- **Feature:** Assisted Registration
- **Scenario:** Volunteer onboards a non-tech-literate rural resident.
- **Preconditions:** Volunteer authenticated.
- **Test Data:** Name: "Ningappa Gowda", Phone: "9845012345", Village: "Rampura", GP: "Rampura GP".
- **Steps:**
  1. Send `POST /api/volunteers/citizens` with resident details.
  2. Verify citizen user created in database with `isVerified: false`.
- **Expected Result:** HTTP 201; citizen profile created and associated with volunteer cluster.
- **Actual Result:** HTTP 201; citizen created and discoverable via search.
- **Execution Status:** **`EXECUTED — PASSED`** (Script: `verify-volunteer.ts`, Test 1)
- **Priority:** P1

---

#### TC-VOL-002: 4-Point Field Verification Submission
- **Module:** Volunteer Portal
- **Feature:** Ground Verification Checklist
- **Scenario:** Volunteer visits incident site, completes 4-point checklist, and uploads photos.
- **Preconditions:** Complaint in `VERIFICATION_REQUIRED` state.
- **Test Data:** Checklist: 4x true, Result: `VERIFIED`, Ground Notes: "Transformer leak confirmed on site".
- **Steps:**
  1. Send multipart `POST /api/volunteers/complaints/:id/verify`.
  2. Inspect complaint status and verification subdocument.
- **Expected Result:** HTTP 200; status advances to `VERIFIED`; verification subdocument populated.
- **Actual Result:** HTTP 200; status transitioned cleanly to `VERIFIED`.
- **Execution Status:** **`EXECUTED — PASSED`** (Script: `verify-volunteer.ts`, Test 4)
- **Priority:** P0

---

### 2.4 Department Official Portal & Isolation (DEPARTMENT)

#### TC-OFF-001: Departmental Work Queue Isolation (Negative Case)
- **Module:** Department Portal
- **Feature:** Department Isolation Middleware
- **Scenario:** Official from RDPR attempts to view or act on an Energy Department (BESCOM) complaint.
- **Preconditions:** RDPR official authenticated; complaint belongs to Energy Department.
- **Test Data:** RDPR official token, Energy complaint ID.
- **Steps:**
  1. Send `POST /api/officials/complaints/:id/resolve` using RDPR token on Energy complaint.
  2. Inspect HTTP status and security audit log.
- **Expected Result:** HTTP 403 Forbidden; `CROSS_DEPARTMENT_ACCESS_DENIED` error; security audit record logged.
- **Actual Result:** HTTP 403 returned; access blocked cleanly.
- **Execution Status:** **`EXECUTED — PASSED`** (Script: `verify-official-portal.ts`, Test 1)
- **Priority:** P0

---

#### TC-OFF-002: Mandatory Resolution Photographic Proof Protocol
- **Module:** Department Portal
- **Feature:** Grievance Resolution
- **Scenario:** Official attempts resolution without attaching mandatory completion photo proof.
- **Preconditions:** Official of correct department authenticated; complaint in `UNDER_REVIEW`.
- **Test Data:** Summary provided, but zero photos attached.
- **Steps:**
  1. Send `POST /api/officials/complaints/:id/resolve` without photo attachments.
  2. Inspect response.
  3. Send second request with photo attachment.
- **Expected Result:** First request rejected with HTTP 400 (`MANDATORY_RESOLUTION_PROOF_REQUIRED`); second request succeeds with HTTP 200 and transitions state to `RESOLVED`.
- **Actual Result:** HTTP 400 on missing photo; HTTP 200 on valid photo attachment.
- **Execution Status:** **`EXECUTED — PASSED`** (Script: `verify-official-portal.ts`, Test 5)
- **Priority:** P0

---

### 2.5 SLA Monitoring & Escalation Engine (SLA)

#### TC-SLA-001: Priority SLA Duration & Breach Escalation
- **Module:** SLA Engine
- **Feature:** Statutory Escalation
- **Scenario:** Complaint exceeds statutory resolution hours; automated sweep executes escalation.
- **Preconditions:** Active complaint created with mock past creation date (>24h overdue).
- **Test Data:** Priority: `CRITICAL` (24h window).
- **Steps:**
  1. Trigger automated sweep: `POST /api/sla/sweep`.
  2. Inspect complaint SLA status and escalation level.
- **Expected Result:** SLA marked `BREACHED`; `escalationLevel` incremented from 0 to 1 (Tahsildar); audit event created.
- **Actual Result:** HTTP 200; complaint escalated to Level 1 Tahsildar with breach flag set.
- **Execution Status:** **`EXECUTED — PASSED`** (Script: `verify-sla-engine.ts`, Test 4)
- **Priority:** P0

---

### 2.6 AI Intelligence & Decision Support (AI / GENAI / RAG)

#### TC-AI-001: FastText / NLP Multilingual Entity & Urgency Extraction
- **Module:** AI Microservice
- **Feature:** NLP Complaint Analysis
- **Scenario:** Process a complaint describing high-voltage wire snapping near a school.
- **Preconditions:** AI service active on port 8000.
- **Test Data:** Text: "Live electric wire snapped near Rampura primary school, danger to children".
- **Steps:**
  1. Send `POST /api/ai/analyze` with test text.
  2. Inspect extracted entities, recommended department, and urgency score.
- **Expected Result:** Recommended dept: "Energy Department"; urgency score > 0.85 (`CRITICAL`); safety hazard flagged.
- **Actual Result:** Confidence 0.92; Energy Department recommended; priority scored `CRITICAL`.
- **Execution Status:** **`EXECUTED — PASSED`** (Script: `verify-ai-service.ts`, Test 2)
- **Priority:** P1

---

#### TC-AI-002: Grounded Legal RAG Query with Anti-Hallucination Disclaimer
- **Module:** RAG Knowledge Assistant
- **Feature:** Grounded Circular Retrieval
- **Scenario:** Inquire about rural street lighting maintenance timelines under Sakala Act.
- **Preconditions:** Pre-seeded Karnataka knowledge base loaded.
- **Test Data:** Query: "What is the Sakala deadline for rural street light repair?"
- **Steps:**
  1. Send `POST /api/rag/query` with query text.
  2. Inspect grounded answer and citations.
- **Expected Result:** Factual response citing Karnataka Gram Swaraj Act / Sakala Act 2011; exact excerpt and document number included.
- **Actual Result:** Grounded answer returned with document citation `KA-GO-RDPR-2021-042`.
- **Execution Status:** **`EXECUTED — PASSED`** (Script: `verify-rag.ts`, Test 1)
- **Priority:** P1

---

### 2.7 Security Hardening & Penetration Defense (SECURITY)

#### TC-SEC-001: NoSQL Injection & Prototype Pollution Neutralization
- **Module:** Security
- **Feature:** Sanitize Middleware
- **Scenario:** Malicious user sends MongoDB operator injection and prototype pollution payload.
- **Preconditions:** Express server running with `sanitize.middleware.ts` mounted.
- **Test Data:** `body: { "$where": "sleep(5000)", "__proto__": { "polluted": true }, "email": { "$ne": null } }`.
- **Steps:**
  1. Send POST request with payload to `/api/auth/staff/login`.
  2. Verify request is neutralized and MongoDB operator keys are stripped in-place.
- **Expected Result:** Operator keys `$` and `__proto__` stripped before hitting controller; injection attack neutralized without crashing server.
- **Actual Result:** HTTP 400 invalid credentials returned; server unaffected; zero prototype pollution.
- **Execution Status:** **`EXECUTED — PASSED`** (Script: `verify-production-hardening.ts`, Test 2)
- **Priority:** P0

---

#### TC-SEC-002: Tiered Rate Limiting Protection (Brute Force Defense)
- **Module:** Security
- **Feature:** Auth Rate Limiter
- **Scenario:** Attacker executes rapid credential-stuffing burst (>15 requests/min) on auth route.
- **Preconditions:** Server active.
- **Test Data:** 16 consecutive POST requests to `/api/auth/staff/login`.
- **Steps:**
  1. Fire 16 rapid requests.
  2. Inspect HTTP status of 16th request.
- **Expected Result:** 1st to 15th requests return 400/401; 16th request is blocked with HTTP 429 Too Many Requests.
- **Actual Result:** HTTP 429 returned on 16th request with error code `RATE_LIMITED`.
- **Execution Status:** **`EXECUTED — PASSED`** (Script: `verify-production-hardening.ts`, Test 3)
- **Priority:** P0
