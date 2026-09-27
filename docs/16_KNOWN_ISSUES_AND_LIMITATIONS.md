# VCGIS Known Issues, Technical Constraints & System Limitations

**System Name:** Village Volunteer-Assisted Citizen Grievance Intelligence System (VCGIS)  
**Governance Authority:** Government of Karnataka  
**Document Revision:** 1.0  
**Audit Date:** September 2026  

---

## 1. Overview & Audit Boundaries

This document provides a factual, unembellished inventory of **confirmed technical constraints, architectural limitations, and operational caveats** discovered during the post-Phase 12 system audit. 

Issues are categorized into distinct engineering domains to prevent conflating operational limitations with functional software defects.

---

## 2. Confirmed Software Bugs
*Zero blocking software crashes or uncaught runtime exceptions currently exist in the codebase.*
- All 12 backend verification suites and 4 Pytest modules execute with zero unhandled rejections or runtime failures.
- Express 5 getter-only property mutation issues previously affecting `req.query` were fully resolved via in-place object sanitization.

---

## 3. Partial Features & Simulated Subsystems

### 3.1 Simulated Mobile OTP Telecom Pipeline
- **Category:** Partial Feature
- **Affected Component:** `backend/src/controllers/auth.controller.ts`
- **Description:** The system generates cryptographically secure 6-digit OTPs and records them in MongoDB with 5-minute TTL indexes. However, physical SMS text message dispatch across cellular telecom networks is simulated via `devOtpPreview` payloads and console logs.
- **Operational Consequence:** In a live public deployment without commercial SMS gateway provisioning (e.g. CDAC Mobile Seva), OTP codes will not reach physical citizen smartphones.

### 3.2 In-Memory Semantic Legal Chunk Index
- **Category:** Partial Feature
- **Affected Component:** `ai-service/app/services/rag_service.py`
- **Description:** The RAG knowledge system semantically chunks and indexes pre-seeded Karnataka Government Orders (Sakala Act, JJM Guidelines, BESCOM Standards) directly in application memory.
- **Operational Consequence:** When the AI microservice process restarts, dynamically ingested documents added via `/api/rag/documents` must be re-synced from MongoDB to repopulate the in-memory chunk index.

---

## 4. AI & Machine Learning Limitations

### 4.1 Heuristic & Rule-Driven Department Classification
- **Affected Component:** `ai-service/app/services/classifier_service.py`
- **Limitation:** The department classifier operates on weighted keyword dictionaries and subcategory heuristic rules (`DEPARTMENT_RULES`). It does not employ a deep neural text classifier (e.g. IndicBERT) or supervised statistical model (e.g. FastText).
- **Consequence:** Complaints containing novel dialectal Kannada slang, colloquial phrasing, or ambiguous terminology without keyword matches may receive low confidence scores (<0.65) and require manual dispatcher review.

### 4.2 Bitmap Image OCR Dependency on System Binaries
- **Affected Component:** `ai-service/app/services/ocr_service.py`
- **Limitation:** While PDF digital text streams are parsed accurately via `pypdf`, bitmap image OCR (scanned handwritten petition paper) falls back to low-confidence flags if the Tesseract system binary is not installed on the host environment.
- **Consequence:** Physical scanned petitions without digital font layers cannot be transcribed automatically without installing `tesseract-ocr` and `tesseract-ocr-kan` packages.

### 4.3 English / Transliterated TF-IDF Vocabulary in Duplicate Detection
- **Affected Component:** `ai-service/app/services/similarity_service.py`
- **Limitation:** Duplicate detection combines 2km Haversine GPS proximity with scikit-learn `TfidfVectorizer`. While effective for English and standardized text, it lacks dense cross-lingual vector alignment (e.g. matching a Kannada script petition against an English petition describing the same broken bridge).

---

## 5. Frontend UI/UX Limitations

### 5.1 Mobile Navigation Drawer Missing on Small Viewports
- **Affected Component:** `frontend/src/components/layout/Navbar.tsx`
- **Limitation:** On mobile screens (<768px wide), top navigation links are collapsed or hidden, lacking an animated slide-out hamburger drawer menu.
- **Consequence:** Rural citizens and field volunteers on mobile phones must navigate via the home screen rather than a persistent global drawer.

### 5.2 Polling-Based Realtime Updates on Client
- **Affected Component:** `frontend/src/components/notifications/NotificationBell.tsx`, `CitizenDashboard.tsx`
- **Limitation:** The frontend fetches notifications and status updates via HTTP polling on mount and focus rather than maintaining an active bidirectional WebSocket connection.
- **Consequence:** If an official marks a complaint resolved, the citizen's browser does not update the badge in real-time until the page is refreshed or re-focused.

---

## 6. Backend & Infrastructure Limitations

### 6.1 Local Filesystem Evidence Storage
- **Affected Component:** `backend/src/middlewares/upload.middleware.ts`
- **Limitation:** Uploaded photos, PDFs, and resolution proofs are written to local server disk under `backend/uploads/`.
- **Consequence:** In a multi-instance containerized cloud deployment (e.g. Kubernetes with multiple replica pods), local filesystem storage prevents pods from sharing uploaded images unless backed by a shared NFS/EFS volume.

### 6.2 External Trigger Dependency for SLA Sweeps
- **Affected Component:** `backend/src/routes/sla.routes.ts`
- **Limitation:** The automated SLA evaluation sweep is exposed via an HTTP endpoint (`POST /api/sla/sweep`). It does not run on an autonomous internal scheduler.
- **Consequence:** An external cron daemon or scheduler must invoke the sweep endpoint hourly to ensure breach warnings and multi-tier escalations are calculated promptly.

---

## 7. Operational & Deployment Caveats

1. **State Data Centre (KSDC) Private Cloud Network Access:**
   If deployed within the secure KSDC intranet without public internet egress, external cloud LLM APIs (OpenAI, Gemini) cannot be reached. The system must operate entirely on its internal deterministic AI pipelines or utilize locally hosted Ollama/vLLM instances.
2. **Database Sharding Boundaries:**
   Currently running on a single MongoDB replica set. Scaling beyond 500,000 active grievance records requires establishing range-sharding across district administrative boundaries.
