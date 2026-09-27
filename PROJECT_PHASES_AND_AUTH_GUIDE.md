# VCGIS — Project Roadmap & Authentication Developer Guide

**Project Name:** Volunteer-CGIS  
**Full Name:** Village Volunteer-Assisted Citizen Grievance Intelligence System  
**Government Body:** Government of Karnataka  
**Last Updated:** 2026-09-12  

---

## 1. Development Roadmap (13 Phases Total)

The complete end-to-end development of VCGIS is partitioned into **13 systematic phases** (Phase 0 through Phase 12), derived from the authoritative master specification in [`.ai/project/requirements.md`](file:///home/krdpk/Desktop/Projects/VCGIS-main/.ai/project/requirements.md).

| Phase | Phase Name | Status | Key Deliverables & Capabilities |
|:---:|:---|:---:|:---|
| **Phase 0** | **Foundation & Clean Slate Reset** | **COMPLETED** | • Purged legacy code and exposed plaintext credentials.<br>• Initialized Git repository on `main` branch.<br>• Set up three-service architecture: Frontend (Vite + React 18 + TS + Tailwind 4), Backend (Node.js ES Modules + Express + Mongoose + Zod), AI Service (FastAPI + Pydantic v2).<br>• Established machine-readable state tracking in `.ai/state/`. |
| **Phase 1** | **Authentication & Role-Based Access Control (RBAC)** | **COMPLETED** | • Citizen Mobile OTP flow (TTL auto-expiry, attempt rate limiting).<br>• Staff email + bcrypt password authentication (Volunteer, Official, Admin).<br>• JWT Access Token (15m) + cryptographic Refresh Token (7d) rotation.<br>• Backend `authenticate` and `authorize(...roles)` RBAC middleware.<br>• Frontend `AuthContext`, `ProtectedRoute`, and dual-tab `LoginPage`.<br>• Database seeder (`npm run seed`) with default accounts.<br>• 9/9 automated integration tests passed. |
| **Phase 2** | **Citizen Portal** | **COMPLETED** | • Direct citizen grievance submission form with multipart evidence uploads.<br>• 11 Government Departments and category classification.<br>• Auto-generated complaint numbers (`CMP-YYYY-XXXXX`) and priority SLA calculation.<br>• Browser GPS auto-detection for precise ground geotagging.<br>• Citizen dashboard with KPI statistics, search, and status filters.<br>• Chronological audit timeline, evidence viewers, 1-5 star satisfaction feedback, and reopen flow.<br>• 8/8 automated integration tests passed. |
| **Phase 3** | **Village Volunteer Portal** | **COMPLETED** | • Rural citizen assisted onboarding and registration.<br>• On-behalf grievance submission for non-tech-literate villagers.<br>• On-site 4-point field verification checklists and GPS photo tagging.<br>• Volunteer jurisdiction cluster (Village / Ward mapping).<br>• Volunteer Assistant AI for natural language statement structuring.<br>• 8/8 automated integration tests passed. |
| **Phase 4** | **Complaint Management Engine** | **COMPLETED** | • 18-stage grievance lifecycle state machine (`SUBMITTED` &rarr; `ASSIGNED` &rarr; `UNDER_REVIEW` &rarr; `ACTION_IN_PROGRESS` &rarr; `RESOLVED`).<br>• State transition validation rules & RBAC role guards.<br>• Automated department & jurisdiction officer routing engine.<br>• Dedicated immutable `AuditLog` collection & tamper-proof audit trail API.<br>• In-app Notification engine (`/api/notifications`) & live navbar bell badge.<br>• Staff field action & internal notes logging.<br>• 11/11 automated integration tests passed. |
| **Phase 5** | **Department Official Portal** | **COMPLETED** | • Department-isolated grievance queues (`requireOfficialDepartment` middleware blocks cross-department access with HTTP 403 & security audit log).<br>• Official 7 KPI Dashboard Metrics (Total, New 48h, Pending, Urgent, SLA at Risk, Resolved, Reopened).<br>• Advanced Work Queue filtering (Assigned to Me, Status, Priority, SLA risk, Taluk, Village, Keyword Search).<br>• Official Review Drawer (`OfficialReviewModal.tsx`) with color-coded live SLA countdown timer.<br>• Multipart resolution flow with mandatory photo proofs of completed work, contractor name, and materials used.<br>• Formal administrative rejection protocol with mandatory legal justification.<br>• Departmental transfer with automatic routing re-triggering.<br>• Escalation workflow to District Collector / Higher authority with priority audit logging.<br>• 8/8 automated integration tests passed. |
| **Phase 6** | **SLA Monitoring & Multi-Tier Escalation** | **COMPLETED** | • Dynamic SLA resolution timers based on priority:<br>&nbsp;&nbsp;– **Critical:** 24 hours<br>&nbsp;&nbsp;– **High:** 48 hours<br>&nbsp;&nbsp;– **Medium:** 5 days (120 hours)<br>&nbsp;&nbsp;– **Low:** 10 days (240 hours)<br>• Proactive breach warning alerts (<24h remaining) & notification triggers.<br>• Automated multi-tier escalation hierarchy:<br>&nbsp;&nbsp;– **Level 1:** Taluk Executive Officer / Tahsildar (on breach)<br>&nbsp;&nbsp;– **Level 2:** District Collector / DC (>24h overdue)<br>&nbsp;&nbsp;– **Level 3:** State Secretariat / Principal Secretary (>48h overdue)<br>• Automated background sweep engine (`/api/sla/sweep`) with audit trails.<br>• SLA Analytics API (`/api/sla/analytics`) calculating compliance % and breach % across departments and priorities.<br>• Frontend executive `SlaComplianceCard.tsx` with real-time gauges and sweep trigger.<br>• 8/8 automated integration tests passed. |
| **Phase 7** | **AI Intelligence Microservice** | **COMPLETED** | • Autonomous FastAPI microservice (`ai-service` port 8000) with Pydantic v2 schemas.<br>• **OCR Extraction (`/api/ai/ocr`):** PDF text extraction via `pypdf`, confidence scoring, and low-confidence flagging (<0.65).<br>• **NLP Intelligence (`/api/ai/nlp`):** Administrative entity extraction (Karnataka Districts, Taluks, GPs, Wards, phone, dates), citizen intent detection, and Kannada/English urgency tokens.<br>• **Department Classifier (`/api/ai/classify`):** Multi-label categorization across 11 Karnataka departments with confidence and ranked alternatives.<br>• **Priority Evaluation (`/api/ai/priority`):** Urgent life-safety hazard scoring (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`) with public safety factor analysis.<br>• **Duplicate Clustering (`/api/ai/similarity`):** TF-IDF cosine similarity + spatial Haversine proximity scoring (adhering strictly to non-auto-discard policy).<br>• **Factual Summarization (`/api/ai/summarize`):** 2–3 sentence deterministic summaries.<br>• **Unified Pipeline (`/api/ai/analyze-complaint`):** Single-call comprehensive analysis.<br>• **Backend Proxy & Heuristic Fallback Layer:** Mounted under `/api/ai` with zero-downtime offline rule fallback.<br>• **Frontend UI Insights:** `AiInsightsBadge.tsx` integrated into Official Review Modal.<br>• 12/12 pytest unit tests + 7/7 end-to-end integration tests passed. |
| **Phase 8** | **Generative AI Decision Support** | **COMPLETED** | • **Citizen Assistant (`/api/genai/citizen/assist`):** Conversational grievance drafting, plain-language status explanations, and Sakala deadline clarity in English & Kannada.<br>• **Volunteer Structuring Assistant (`/api/genai/volunteer/structure`):** 4-part formal petition structuring (`Incident Summary`, `Location Details`, `Observed Impact`, `Full Petition`) from verbal notes with missing info checklist.<br>• **Official Decision Copilot (`/api/genai/official/draft-response`):** Automated Sakala citizen resolution letters, citizen SMS drafts, technical field inspection checklists, and statutory rejection endorsements.<br>• **Executive Hotspot Briefing (`/api/genai/admin/summary`):** Synthesizes operational metrics, breach rates, and systemic hotspots into strategic executive recommendations.<br>• **Multilingual Translation (`/api/genai/translate`):** Bidirectional Kannada &harr; English civic translation.<br>• **Frontend Assistants:** `CitizenAiAssistantModal.tsx`, `VolunteerStructuringDrawer.tsx`, and quick AI actions in `OfficialReviewModal.tsx`.<br>• **Strict Human-in-the-Loop:** AI only recommends drafts; officials, volunteers, and citizens explicitly confirm and submit.<br>• 7/7 pytest unit tests + 7/7 end-to-end integration tests passed. |
| **Phase 9** | **RAG Knowledge System** | **COMPLETED** | • **Knowledge Ingestion & Semantic Chunking (`/api/rag/ingest`):** Overlapping sliding-window chunking preserving legal clauses and section headings.<br>• **Grounded RAG Engine (`/api/rag/query`):** Deterministic semantic vector retrieval with strict source citations (`documentNumber`, `department`, `version`, `effectiveDate`, and exact excerpt).<br>• **Anti-Hallucination Policy:** Discards unsupported queries with formal disclaimers; automatically excludes `SUPERSEDED` or `ARCHIVED` circulars so outdated orders never silently remain authoritative.<br>• **Pre-seeded Authoritative Karnataka Knowledge Base:** Sakala Services Act 2011, Jal Jeevan Mission Rural Water Maintenance Guidelines, BESCOM Standard of Performance, BBMP Municipal Sanitation Bye-Laws.<br>• **Backend Gateway & MongoDB Collection:** `KnowledgeDocument` model, RBAC admin controls for ingestion/archiving, local MongoDB text search fallback.<br>• **Frontend Knowledge UI:** `KnowledgeAssistantModal.tsx` directly accessible from top navigation bar (`Schemes & GOs`).<br>• 6/6 pytest unit tests + 7/7 end-to-end integration tests passed. |
| **Phase 10** | **Administrator Portal** | **COMPLETED** | • **User Lifecycle Management (`/api/admin/users`):** Provisioning staff users, role changes, active/inactive state toggles, and multi-field user search & filter.<br>• **Karnataka Department Hierarchy & SLA Configuration (`/api/admin/departments`):** 11 Karnataka Government departments seeded with categories, subcategories, and interactive Sakala statutory SLA threshold reconfiguration (Critical, High, Medium, Low hours).<br>• **Volunteer Jurisdiction Cluster Mapping (`/api/admin/volunteers`):** Real-time mapping of village volunteers to Gram Panchayats, villages, and wards with live workload counts.<br>• **Official Hierarchy Assignment (`/api/admin/officials`):** Administrative scope configuration linking officials to departments, designations, and Taluk/District scopes.<br>• **Cross-System Audit Trail Explorer (`/api/admin/audit`):** Multi-filter search across entities (`COMPLAINT`, `USER`, `DEPARTMENT`, `SYSTEM`), actions, actor roles, date ranges, and structured metadata inspection.<br>• **Frontend Administrator Dashboard:** Multi-tab layout (`AdminDashboard.tsx`) with real-time statistics cards, user management directory, SLA adjusters, and audit log viewer.<br>• 7/7 automated integration tests passed. |
| **Phase 11** | **Analytics & Geographic Intelligence** | **COMPLETED** | • **Interactive GIS Map (`/api/analytics/geo`):** Vector SVG Karnataka cartographic engine with 31 district coordinates, priority heat pins, and pulsing spatial cluster hotspots.<br>• **Section 32 Zero-PII Leakage Policy:** Guaranteed suppression of all citizen names, phone numbers, and street addresses in public and analytics GIS endpoints.<br>• **Department Performance Matrix (`/api/analytics/departments`):** Comparative ranking across all 11 Karnataka departments with Sakala compliance percentages and letter grades (A+ to D).<br>• **Temporal Trends & Intake Velocity (`/api/analytics/trends`):** Daily/weekly/monthly grievance intake vs. resolution trajectory curves.<br>• **AI Intelligence Model Metrics (`/api/analytics/ai`):** Model classification confidence stratification, duplicate candidates detected, and NLP entity volume.<br>• **Volunteer Field Operations Metrics (`/api/analytics/volunteers`):** Active volunteer counts, assisted grievance volumes, and field resolution performance.<br>• **RFC 4180 CSV Export Engine (`/api/analytics/export/csv`):** Standard CSV download with proper escaping, carriage-return linefeeds, and PII masking.<br>• **Strategic Executive Digest (`/api/analytics/export/report`):** Auto-generated executive brief with top departmental bottlenecks, spatial clusters, and statutory Sakala directives.<br>• **Frontend Master Dashboard (`AnalyticsDashboardPage.tsx`):** Multi-tab executive BI interface integrated into `/analytics` route, Navbar, and Admin/Official portals.<br>• 10/10 automated integration tests passed. |
| **Phase 12** | **Production Hardening & Deployment** | **COMPLETED** | • **Enterprise Security Headers (OWASP Top 10):** Strict Helmet configuration with HSTS (`max-age=31536000`), CSP, X-Content-Type-Options (`nosniff`), and suppression of `X-Powered-By`.<br>• **NoSQL Injection & Prototype Pollution Defense (`sanitize.middleware.ts`):** In-place recursive sanitization stripping `$` operators, prototype pollution keys, and dangerous script tags across `req.body`, `req.query`, and `req.params`.<br>• **Tiered Rate Limiting Defense:** Stricter rate limiter (15 requests/min) on `/api/auth/*` to prevent brute-force attacks and 120 requests/min for general API traffic with HTTP 429 response formatting.<br>• **In-Memory & Distributed Performance Caching (`cache.service.ts`):** High-throughput caching with automated TTL sweeps, pattern invalidation, and wrap memoization.<br>• **Zero-Downtime Healthcheck Endpoint (`/health`):** Container monitoring endpoint returning system uptime, status, and service metadata.<br>• **Multi-Stage Production Dockerfiles:** Dockerfiles for `backend` (Node 22 slim, non-root user `node`), `frontend` (Vite build + Nginx Alpine SPA server with Gzip and security headers), and `ai-service` (Python 3.10 slim, non-root user, Uvicorn).<br>• **Docker Compose Full-Stack Orchestration (`docker-compose.yml`):** Production multi-container composition connecting MongoDB 7, Redis 7, backend API, AI service, and frontend Nginx gateway with automated container healthchecks.<br>• **Continuous Integration Pipeline (`.github/workflows/ci.yml`):** Automated GitHub Actions testing backend, frontend, AI service pytest, and Docker compose configuration.<br>• 6/6 automated security and deployment integration tests passed. |

---

## 2. Authentication Architecture & Developer Guide

### 2.1 Why Real SMS Does Not Arrive on Physical Mobile Phones in Local Dev
In an enterprise government system, sending real text messages to physical telecom mobile networks requires an active commercial **SMS Gateway API service** (such as CDAC Mobile Seva, Twilio, AWS SNS, or Fast2SMS) with paid telecom credits and registered DLT (Distributed Ledger Technology) sender templates.

In local development, the system uses a **simulated secure OTP pipeline**:
1. When you enter a phone number and click **"Send OTP"**, the backend generates a cryptographically secure 6-digit numeric OTP.
2. The OTP is stored in MongoDB inside the `otps` collection with a **5-minute auto-expiration TTL index**.
3. The backend logs the OTP directly into its server terminal:
   ```text
   20:15:10 info: [AUTH] OTP generated for 9876543212: 265931 (Expires in 5m)
   ```
4. The API response includes a `devOtpPreview` field, causing the frontend UI to display an amber banner:
   ```text
   Dev Mode OTP: 265931 [AUTO-FILLED]
   ```
5. The input boxes are **automatically populated** with the OTP code, allowing you to click **"Verify & Sign In"** immediately without friction.

---

### 2.2 How to Run the Full Application Locally

To test authentication and all portals, both the frontend and backend servers must be running:

#### Terminal 1: Backend API (Port 5001)
```bash
cd /home/krdpk/Desktop/Projects/VCGIS-main/backend
npm run dev
```
*Console output:*
```text
✅ Connected to MongoDB
🚀 VCGIS Backend running on port 5001
📡 API prefix: /api
```

#### Terminal 2: Frontend Web App (Port 5173)
```bash
cd /home/krdpk/Desktop/Projects/VCGIS-main/frontend
npm run dev
```
*Console output:*
```text
  VITE v5.4.21  ready in 250 ms
  ➜  Local:   http://localhost:5173/
```

---

### 2.3 How to Test Authentication

Open `http://localhost:5173/login` in your web browser:

#### Testing Citizen Mobile OTP:
1. Stay on the **"Citizen Login (OTP)"** tab.
2. Enter any 10-digit mobile number (e.g. `9876543212`).
3. Click **"Send OTP"**.
4. Observe the **"Dev Mode OTP: XXXXXX"** banner and verify that the 6 digits auto-fill.
5. *(Optional)* Fill in your name and village if registering for the first time.
6. Click **"Verify & Sign In"**.
7. You are authenticated and redirected to the **Citizen Dashboard** (`/citizen`) with your phone number and citizen role badge.

#### Testing Staff Password Login:
1. Click the **"Staff Login"** tab.
2. Use the **Quick Dev Testing Credentials** buttons:
   - **Admin:** `admin@vcgis.gov.in` / `Admin@12345` &rarr; Redirects to Administrator Portal (`/admin`).
   - **Volunteer:** `volunteer@vcgis.gov.in` / `Volunteer@12345` &rarr; Redirects to Village Volunteer Portal (`/volunteer`).
   - **Official:** `official@vcgis.gov.in` / `Official@12345` &rarr; Redirects to Department Official Portal (`/official`).
3. Or type in your credentials manually and click **"Sign In as Staff"**.

---

### 2.4 Pre-Seeded Default Accounts

The database includes the following default accounts seeded via `npm run seed`:

| Role | Identifier | Password / Auth Method | Default Scope / Jurisdiction |
|---|---|---|---|
| **Administrator** | `admin@vcgis.gov.in` | `Admin@12345` | SuperAdmin • All permissions |
| **Village Volunteer** | `volunteer@vcgis.gov.in` | `Volunteer@12345` | Badge: `VOL-MYS-001` • Village: Rampura, Ward 4, Mysuru |
| **Department Official** | `official@vcgis.gov.in` | `Official@12345` | Rural Development & Panchayat Raj (RDPR) • Executive Engineer, Mysuru |
| **Citizen** | `9876543212` | 6-Digit Mobile OTP | Village: Rampura, Ward 4, Mysuru |

---

### 2.5 Security & Token Handling Architecture
- **Access Tokens:** Short-lived JWTs (15-minute expiry) signed with `JWT_SECRET`. Carried in `Authorization: Bearer <token>` headers.
- **Refresh Tokens:** Cryptographic random tokens stored in MongoDB `refreshtokens` collection with a 7-day TTL index. Rotated on every refresh call (`POST /api/auth/refresh`).
- **Password Security:** Salted hashes generated via `bcrypt` with 10 salt rounds. Passwords are never returned in queries (`select: false`).
- **RBAC Enforcement:** Enforced both on the backend (`authorize(...roles)`) and frontend (`ProtectedRoute`).
