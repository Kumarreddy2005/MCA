# VCGIS Release Notes: Version 0.1.0-alpha

**Release Tag:** `v0.1.0-alpha`  
**Release Name:** Karnataka Statewide Public Grievance Architecture Baseline  
**Release Date:** September 2026  
**Target Authority:** Government of Karnataka (Department of Rural Development & Panchayat Raj / e-Governance)  
**Target Commit:** `05ca30e`  

---

## 1. Release Overview

VCGIS Version 0.1.0-alpha marks the completion of the foundational development roadmap spanning **all 13 planned development phases** (Phases 0 through 12). 

This release provides the state government with an integrated, end-to-end digital grievance intelligence architecture connecting rural Karnataka citizens, grassroots village volunteers, department executive engineers, and state administrators into a unified, auditable ecosystem.

---

## 2. Key Capabilities Delivered in v0.1.0-alpha

### 2.1 Citizen Portal
- **Passwordless Mobile OTP Authentication:** Quick, low-friction login via 10-digit mobile number with auto-expiring 5-minute security codes.
- **Multipart Grievance Lodging with Ground Geotagging:** Direct filing across 11 Karnataka state departments with HTML5 browser GPS auto-capture and up to 5 evidence attachments (photos, PDFs, scans).
- **Chronological Audit Timeline & Dossier:** Real-time visibility into intermediate field actions and official resolution proofs.
- **Citizen Feedback & Reopening:** 1 to 5 star satisfaction ratings and a statutory 7-day reopening window for incomplete work.

### 2.2 Village Volunteer Assisted Access
- **Rural Resident Onboarding:** Assisted registration for villagers without smartphones or digital connectivity.
- **On-Behalf Grievance Lodging:** Permanent attribution linking complaints to both the citizen and the assisting volunteer's badge.
- **4-Point On-Site Ground Verification:** Standardized physical verification checklist (citizen identity, incident reality, evidence validity, severity level) accompanied by GPS-stamped inspection photos.
- **Volunteer AI Structuring Copilot:** Automatic structuring of unstructured verbal notes into 4-part formal petitions.

### 2.3 Department Official Portal
- **Strict Departmental Isolation:** Cryptographic and middleware guards preventing officials of one department from accessing grievances belonging to another (enforcing HTTP 403 blocks and audit logging).
- **7-Metric Operational Cockpit:** Real-time counters for new intakes, pending reviews, life-safety hazards, and cases approaching statutory breach (<24h).
- **Mandatory Photo Proof Protocol:** Resolution requires photographic evidence of completed repair work, contractor names, and materials used.
- **Statutory Rejection Endorsement:** Ineligible grievances enforce mandatory legal justification.

### 2.4 SLA & Multi-Tier Escalation Engine
- **Statutory Sakala SLA Timers:** Dynamic countdown timers based on severity:
  - *Critical:* 24 Hours
  - *High:* 48 Hours
  - *Medium:* 120 Hours (5 Days)
  - *Low:* 240 Hours (10 Days)
- **Multi-Tier Automated Escalation Hierarchy:**
  - *Level 1:* Taluk Executive Officer / Tahsildar (upon breach)
  - *Level 2:* District Collector / DC (> 24 hours overdue)
  - *Level 3:* State Secretariat / Principal Secretary (> 48 hours overdue)

### 2.5 AI & GenAI Intelligence Layer
- **Autonomous Python/FastAPI Microservice (`ai-service`):** High-speed microservice on port 8000 handling extraction and analysis.
- **OCR Text Extraction:** PDF text stream parsing via `pypdf` with confidence scoring.
- **11-Department Classifier:** Multi-label categorization across Karnataka departments with ranked alternatives.
- **Urgency Scoring:** Life-safety and environmental contamination risk analysis.
- **Duplicate Detection & Problem Clustering:** TF-IDF cosine similarity combined with 2km Haversine GPS radius filtering (adhering strictly to the non-auto-discard rule).
- **Grounded Legal RAG Knowledge Base:** Overlapping semantic chunking of Karnataka Government Orders with strict source citations and anti-hallucination disclaimers.

### 2.6 Analytics & Section 32 Geographic Intelligence
- **Interactive 31-District Karnataka SVG Cartography:** Real-time district health ranking and spatial problem clusters.
- **Section 32 Zero-PII Privacy Compliance:** Guaranteed suppression of all citizen names, phone numbers, and street door numbers from public maps and data feeds.
- **RFC 4180 Standard CSV Export Engine:** Compliant CSV data export with CRLF line endings, proper quote escaping, and citizen phone masking.

### 2.7 Production Hardening & Security
- **OWASP Top 10 Defenses:** Strict Helmet configuration (HSTS 1 year, CSP, nosniff, frameguard, suppression of X-Powered-By).
- **NoSQL Injection Neutralizer:** Recursive in-place sanitization stripping MongoDB operator keys (`$ne`, `$where`, etc.) and prototype mutation keys.
- **Tiered Rate Limiting:** 15 req/min on auth endpoints (brute-force defense) and 120 req/min on general endpoints.
- **Containerization & CI/CD:** Multi-stage production Dockerfiles, Docker Compose v2 orchestration, and GitHub Actions CI.

---

## 3. Verification & Test Execution Baseline

This release is accompanied by verifiable, passing test evidence:
- **Total Automated Tests Executed:** **121 Tests (100% Passing)**
  - 12 Backend TypeScript Verification Scripts (`verify-*.ts`): **98 / 98 Passed**
  - AI Service Pytest Modules (`ai-service/tests/`): **25 / 25 Passed**
- **Static Analysis:** **0 TypeScript Errors, 0 ESLint Warnings** across frontend and backend.
- **Build Status:** Clean production builds compiled to `backend/dist/` and `frontend/dist/`.
- **System Graph Health:** `.ai/bin/ai-project validate` reports **100% Graph Health with 0 problems**.

---

## 4. Known Caveats Prior to Statewide Deployment

1. **Simulated OTP Pipeline:** Citizen mobile login operates in simulated dev mode (`devOtpPreview`). Connecting an active SMS gateway (CDAC Mobile Seva) is required for physical cellular text delivery.
2. **Heuristic AI Baselines:** Classification and duplicate detection utilize rule-based dictionaries and TF-IDF vectors; training supervised FastText/IndicBERT models on historical state data is scheduled for Horizon 2.
3. **In-Memory Legal RAG Index:** Legal chunk indexing runs in microservice memory; deploying an external vector database (Qdrant or Milvus) is recommended for scaling to 10,000+ Government Orders.
4. **Local File Storage:** Uploads are written to local disk (`backend/uploads/`); configuring S3-compatible cloud object storage (MinIO / AWS S3) is recommended for multi-pod Kubernetes clusters.
