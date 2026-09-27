# VCGIS Master Test Strategy & Quality Assurance Plan

**System Name:** Village Volunteer-Assisted Citizen Grievance Intelligence System (VCGIS)  
**Governance Authority:** Government of Karnataka  
**Lead Author:** QA Lead & Senior Software Architect  
**Document Revision:** 1.0  
**Audit Date:** September 2026  

---

## 1. Quality Objectives & Testing Philosophy

The VCGIS platform is a public-facing e-governance system impacting rural citizens, village volunteers, and senior departmental officers across Karnataka. Quality assurance is governed by four core principles:

1. **Evidence-Based Validation:** A test is only considered passed when verified by actual automated script execution with zero assertions failed. Theoretical assertions or file existence checks are not evidence of correctness.
2. **Zero-Regression Standard:** Any modification to backend routing, domain schemas, or AI microservice pipelines must trigger full regression sweeps across all 12 verification test suites.
3. **Multi-Role RBAC Isolation:** Security tests must rigorously assert negative authorization boundaries (e.g. citizens cannot access analytics, officials cannot view other departments' complaints).
4. **Resilience to External Outages:** AI and GenAI integrations must demonstrate zero-downtime offline heuristic fallback if external microservices are unreachable.

---

## 2. Multi-Level Testing Pyramid

```
                ▲
               / \
              /   \
             / E2E \       Level 4: End-to-End System Integration Scripts
            /-------\      (12 TypeScript Scripts running against live DB & API)
           /         \
          / Service   \    Level 3: Microservice Pytest Suites
         / Integration \   (25 Python Pytest suites verifying OCR, NLP, RAG, GenAI)
        /---------------\
       /                 \
      / Static Analysis   \ Level 2: Strict TypeScript Compiler & ESLint Gates
     /  & Typechecking    \ (0 type errors, 0 lint warnings in Backend & Frontend)
    /---------------------\
   /                       \
  /    Schema & Model       \ Level 1: Mongoose Validation Rules & Pydantic Schemas
 /       Constraints         \ (Zod payloads, DB unique constraints, TTL indexes)
/─────────────────────────────\
```

---

## 3. Automation Matrix & Test Suites

The automated verification infrastructure is distributed across three environments:

### 3.1 Backend Integration Verification Suites (`backend/src/scripts/`)
Executed via `npx tsx src/scripts/<script-name>.ts`:
- **`verify-auth.ts` (9 tests):** Citizen OTP flow, staff login, refresh token rotation, RBAC role guards, profile endpoints.
- **`verify-complaints.ts` (8 tests):** Direct citizen filing, multipart evidence upload, personal query isolation, dossier view, feedback rating, 7-day reopen.
- **`verify-volunteer.ts` (8 tests):** Rural citizen onboarding, on-behalf complaint lodging, cluster work queues, 4-point ground verification, AI structurer.
- **`verify-complaint-engine.ts` (11 tests):** 18-stage state machine transitions, 11-department auto-routing, mandatory resolution artifacts, immutable audit trails.
- **`verify-official-portal.ts` (8 tests):** Departmental isolation enforcement (HTTP 403), 7 KPI operational metrics, work queue filtering, mandatory photo proofs.
- **`verify-sla-engine.ts` (8 tests):** Priority deadline calculation (24h/48h/120h/240h), breach warnings (<24h), automated 3-tier escalation, `/sweep` execution.
- **`verify-ai-service.ts` (7 tests):** OCR text extraction, entity recognition, department classification, urgency scoring, TF-IDF duplicate clustering.
- **`verify-genai.ts` (7 tests):** Citizen conversational drafting, volunteer 4-part structuring, official Sakala letter drafting, bilingual civic translation.
- **`verify-rag.ts` (7 tests):** Karnataka circular ingestion, semantic legal chunking, grounded retrieval, anti-hallucination source citations.
- **`verify-admin.ts` (7 tests):** Staff user lifecycle, department SLA threshold configuration, volunteer cluster mapping, audit log explorer.
- **`verify-analytics.ts` (10 tests):** 11-department scorecard matrix, temporal trend curves, Section 32 zero-PII spatial GIS masking, RFC 4180 CSV export.
- **`verify-production-hardening.ts` (6 tests):** OWASP security headers (HSTS, CSP, nosniff), NoSQL injection neutralization, tiered rate limiting HTTP 429 block, caching.

### 3.2 Python AI Service Pytest Suites (`ai-service/tests/`)
Executed via `.venv/bin/pytest ai-service/tests`:
- **`test_health.py` (2 tests):** Fast microservice healthcheck and root endpoints.
- **`test_ai_pipeline.py` (10 tests):** PyPDF extraction, confidence scoring, NLP entities, weighted classification, urgency scoring, duplicate clustering.
- **`test_genai_pipeline.py` (7 tests):** Bilingual drafting, missing checklist verification, Sakala response formatting, translation lexicon.
- **`test_rag_pipeline.py` (6 tests):** Document ingestion, sliding-window chunking, version filtering, citation grounding, unsupported query rejection.

### 3.3 Static Analysis & Build Gates
- `npm run typecheck` in `backend/` &rarr; `tsc --noEmit`
- `npm run lint` in `backend/` &rarr; `eslint "src/**/*.ts"`
- `npm run build` in `backend/` &rarr; Clean compile to `dist/`
- `npm run typecheck` in `frontend/` &rarr; `tsc --noEmit`
- `npm run lint` in `frontend/` &rarr; `eslint .`
- `npm run build` in `frontend/` &rarr; Production bundle compilation
- `docker compose config --quiet` &rarr; Docker orchestration validation

---

## 4. Test Execution Protocol & Quality Gates

In accordance with Karnataka e-governance deployment standards, the following quality gates must be satisfied prior to committing code or promoting builds:

1. **Gate 1: Static Type & Lint Compliance:**
   Zero TypeScript errors (`tsc --noEmit`) and zero ESLint warnings across both frontend and backend repositories.
2. **Gate 2: Microservice Pytest Green Line:**
   All 25 unit/integration tests in `ai-service/tests/` must pass with zero failures and zero warnings.
3. **Gate 3: Core Backend Suite Execution:**
   All 12 backend verification scripts must execute sequentially against local MongoDB and report 100% test passage.
4. **Gate 4: Clean Production Compilation:**
   Both `backend/` and `frontend/` must compile to production distribution artifacts (`dist/`) without relying on development polyfills.
5. **Gate 5: Docker Container Health Validation:**
   Docker Compose must parse cleanly and execute container healthchecks on `/health` returning status 200 within 15 seconds.
