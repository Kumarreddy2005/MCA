# VCGIS Repository Changelog

All notable changes to this project are documented in this file based on actual Git commit history and verified repository ledger records.

---

## [0.1.0-alpha] - September 2026

### Commit `05ca30e` — Phase 12: Production Hardening & Deployment
- **Security:** Implemented enterprise HTTP security headers via Helmet (HSTS 1 year, strict CSP, X-Frame-Options, nosniff, suppression of X-Powered-By).
- **Sanitization:** Added recursive in-place NoSQL injection and prototype pollution sanitizer middleware compatible with Express 5 getter-only properties.
- **Rate Limiting:** Added tiered rate limiters: 15 req/min on `/api/auth/*` and 120 req/min on general routes returning structured HTTP 429.
- **Caching:** Built high-throughput caching service with background TTL sweeps, pattern invalidation, and wrap memoization.
- **Containerization:** Multi-stage production Dockerfiles for Backend (Node 22 slim, non-root user `node`), Frontend (Vite + Nginx Alpine), and AI Service (Python 3.10 slim, non-root user).
- **Orchestration:** Built multi-container `docker-compose.yml` connecting MongoDB 7, Redis 7, Backend, Frontend, and AI Service with healthchecks.
- **CI/CD:** Configured GitHub Actions workflow (`.github/workflows/ci.yml`) testing all services.
- **Verification:** 6/6 automated security and deployment tests passed (`verify-production-hardening.ts`).

### Commit `9c43870` — Phase 11: Analytics & Geographic Intelligence
- **GIS Cartography:** Interactive 31-district vector SVG Karnataka map with centroid coordinates, heat pins, and pulsing spatial cluster hotspots.
- **Privacy Compliance:** Enforced Section 32 Zero-PII privacy guarantee across all public and analytics GIS endpoints.
- **Department Scorecard:** 11-department performance matrix with Sakala compliance percentages and letter grades (A+ to D).
- **Temporal Curves:** Grievance intake vs. resolution velocity curves across daily, weekly, and monthly intervals.
- **Data Export:** Built RFC 4180 compliant CSV export engine with proper CRLF line endings, quote escaping, and PII masking.
- **Executive Digest:** Built automated strategic executive performance brief with Sakala compliance directives.
- **Verification:** 10/10 automated tests passed (`verify-analytics.ts`).

### Commit `88d8903` — Phase 10: Administrator Portal
- **User Lifecycle:** Admin console tab for provisioning staff, role changes, and active/inactive state toggling.
- **Department SLA Tuner:** Reconfiguration of statutory Sakala SLA resolution hours (Critical, High, Medium, Low) for 11 Karnataka departments.
- **Volunteer Clustering:** Gram Panchayat and ward cluster mapping displaying live volunteer workloads.
- **Audit Explorer:** Cross-system audit log search filtering by actor, role, entity, and date range.
- **Verification:** 7/7 automated tests passed (`verify-admin.ts`).

### Commit `56f05f3` — Fix: RAG Controller Type Narrowing
- **Bugfix:** Resolved TypeScript compiler type narrowing issue for `req.params.id` in `rag.controller.ts`.

### Commit `663025f` — Phase 9: RAG Knowledge System
- **Chunking Engine:** Sliding-window semantic legal clause chunking preserving headings and token counts.
- **Grounded Answer Generator:** Semantic retrieval against pre-seeded Karnataka Government Orders with strict source citations.
- **Anti-Hallucination Guard:** Discards unverified queries with formal disclaimers; automatically excludes superseded/archived circulars.
- **UI:** Global `KnowledgeAssistantModal.tsx` accessible from navigation bar.
- **Verification:** 7/7 backend integration tests (`verify-rag.ts`) and 6/6 pytest tests passed.

### Commit `5b5a74d` — Phase 8: Generative AI Decision Support
- **Citizen Copilot:** Conversational grievance drafting and plain-language status explanations in English and Kannada.
- **Volunteer Copilot:** 4-part formal petition structuring from raw verbal field notes with missing info checklist.
- **Official Copilot:** Automated drafting of Sakala resolution letters, SMS alerts, and technical inspection checklists.
- **Translation Engine:** Bidirectional civic terminology translation between Kannada and English.
- **Verification:** 7/7 backend integration tests (`verify-genai.ts`) and 7/7 pytest tests passed.

### Commit `92f637b` — Phase 7: AI Intelligence Microservice
- **Microservice Setup:** Autonomous FastAPI application (`ai-service` on port 8000) with Pydantic v2 schemas.
- **OCR:** Digital PDF text stream extraction with confidence scoring.
- **NLP:** Multilingual entity recognition (districts, taluks, dates) and urgency scoring.
- **Classifier:** Multi-label department categorization across 11 Karnataka departments.
- **Similarity:** TF-IDF cosine similarity + 2km Haversine distance duplicate clustering.
- **Verification:** 7/7 backend integration tests (`verify-ai-service.ts`) and 12/12 pytest tests passed.

### Commit `05e0fa8` — Phase 6: SLA Monitoring & Escalation Engine
- **SLA Engine:** Dynamic resolution windows based on priority (24h/48h/120h/240h).
- **Proactive Warnings:** Automated warning triggers when resolution time remaining < 24 hours.
- **Multi-Tier Escalation:** Automated 3-tier hierarchy: Level 1 (Tahsildar), Level 2 (District Collector), Level 3 (Principal Secretary).
- **Sweep Endpoint:** Automated `/api/sla/sweep` evaluation trigger.
- **Verification:** 8/8 automated tests passed (`verify-sla-engine.ts`).

### Commit `b580b49` — Phase 5: Department Official Portal
- **Department Isolation:** `requireOfficialDepartment` middleware blocking cross-department access with HTTP 403.
- **Dashboard:** 7 key operational KPI metrics and work queue with taluk/priority filters.
- **Resolution Proof:** Mandatory photo proofs of completed repair work, contractor details, and materials used.
- **Rejection Grounds:** Mandatory statutory justification for ineligible complaints.
- **Verification:** 8/8 automated tests passed (`verify-official-portal.ts`).

### Commit `082cd0b` — Phase 4: Complaint Management Engine
- **Lifecycle Engine:** 18-stage grievance lifecycle state machine with validation rules.
- **Auto-Routing:** Automated routing to 11 departments and jurisdictional officers.
- **Audit Collection:** Dedicated immutable `AuditLog` collection with tamper-proof history API.
- **Notifications:** In-app notification engine with real-time navbar badge.
- **Verification:** 11/11 automated tests passed (`verify-complaint-engine.ts`).

### Commit `09e8c2b` — Karnataka Governance Transition
- **Branding & Jurisdiction:** Transitioned all departments, taluks, districts, and legal citations to the Government of Karnataka and Karnataka Sakala Act.

### Commit `072833e` — Phase 3: Village Volunteer Portal
- **Assisted Onboarding:** Rural citizen registration by volunteers.
- **On-Behalf Lodging:** Grievance filing on behalf of non-tech-literate villagers.
- **Ground Verification:** 4-point on-site inspection checklist with GPS photos.
- **Verification:** 8/8 automated tests passed (`verify-volunteer.ts`).

### Commit `9b858c4` — Phase 2: Citizen Portal
- **Citizen Dashboard:** Grievance lodging with GPS geotagging and multipart uploads.
- **Dossier & Feedback:** Chronological timeline, evidence viewer, 1-5 star ratings, and 7-day reopening window.
- **Verification:** 8/8 automated tests passed (`verify-complaints.ts`).

### Commit `457b38b` — Phase 1: Authentication & RBAC
- **Citizen Auth:** Mobile phone OTP verification flow with 5-minute auto-expiry.
- **Staff Auth:** Email/password login with salted bcrypt hashes.
- **JWT:** 15-minute access token + 7-day refresh token rotation.
- **RBAC:** `authenticate` and `authorize` middlewares and frontend `ProtectedRoute`.
- **Verification:** 9/9 automated tests passed (`verify-auth.ts`).

### Commit `41fba83` — Phase 0: Foundation Reset
- **Clean Slate:** Purged insecure legacy prototypes.
- **Architecture:** Initialized three-service architecture: React 19 frontend, Node.js 22 backend, FastAPI Python AI service.
- **Intelligence:** Connected persistent `.ai/` knowledge graph.
