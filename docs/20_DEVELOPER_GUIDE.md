# VCGIS Software Engineer & Contributor Guide

**System Name:** Village Volunteer-Assisted Citizen Grievance Intelligence System (VCGIS)  
**Governance Authority:** Government of Karnataka  
**Lead Author:** Senior Software Architect  
**Document Revision:** 1.0  
**Audit Date:** September 2026  

---

## 1. Local Development Environment Setup

### 1.1 Host Prerequisites
- **Node.js:** v22 LTS or newer (`node --version`)
- **Python:** Python 3.10 or newer (`python3 --version`)
- **Database:** Local MongoDB 7.0 daemon listening on `127.0.0.1:27017`
- **Package Managers:** `npm` v10+, Python `venv` and `pip`

---

## 2. Booting Services for Local Development

The three microservices run concurrently across dedicated local ports:
- **Backend API:** Port `5001`
- **Frontend App:** Port `5173`
- **AI Microservice:** Port `8000`

### 2.1 Terminal 1: Backend API (Port 5001)
```bash
cd /home/krdpk/Desktop/Projects/VCGIS-main/backend
npm install
npm run seed     # Populates default accounts & 11 departments
npm run dev      # Starts tsx watch on src/server.ts
```
*Expected Console Output:*
```text
info: ✅ Connected to MongoDB {"service":"vcgis-backend"}
info: 🚀 VCGIS Backend running on port 5001 {"service":"vcgis-backend"}
```

### 2.2 Terminal 2: Frontend Web Application (Port 5173)
```bash
cd /home/krdpk/Desktop/Projects/VCGIS-main/frontend
npm install
npm run dev      # Starts Vite dev server
```
*Expected Console Output:*
```text
  VITE v5.4.21  ready in 250 ms
  ➜  Local:   http://localhost:5173/
```

### 2.3 Terminal 3: AI Intelligence Microservice (Port 8000)
```bash
cd /home/krdpk/Desktop/Projects/VCGIS-main/ai-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
*Expected Console Output:*
```text
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
```

---

## 3. Engineering Workflows & Standards

### 3.1 Coding Conventions & Rules
1. **Strict TypeScript Typing:** Never use `any` unless explicitly wrapping untyped legacy buffers. Define all domain types inside `backend/src/types/domain.ts` and `frontend/src/types/`.
2. **ES Modules (`import / export`):** Backend uses `"type": "module"`. Local file imports must explicitly include the `.js` extension (e.g. `import { UserRole } from "../types/domain.js"`).
3. **Express 5 Object Mutation:** In Express 5, `req.query` is a getter-only property. Never reassign `req.query = ...`; mutate keys in-place (`sanitizeInPlace(req.query)`).
4. **Centralized Error Handling:** Controllers must never use raw `try/catch` blocks that swallow exceptions. Wrap route handlers in `asyncHandler(...)` and throw domain errors.

---

## 4. Running Tests & Quality Verification

Always execute the following regression suite before pushing code:

```bash
# 1. Typecheck and lint backend
cd /home/krdpk/Desktop/Projects/VCGIS-main/backend
npm run typecheck
npm run lint

# 2. Typecheck and lint frontend
cd /home/krdpk/Desktop/Projects/VCGIS-main/frontend
npm run typecheck
npm run lint

# 3. Run AI Service Pytest Suite
cd /home/krdpk/Desktop/Projects/VCGIS-main/ai-service
.venv/bin/pytest tests

# 4. Run Backend Automated Verification Scripts
cd /home/krdpk/Desktop/Projects/VCGIS-main/backend
npx tsx src/scripts/verify-auth.ts
npx tsx src/scripts/verify-complaints.ts
npx tsx src/scripts/verify-volunteer.ts
npx tsx src/scripts/verify-complaint-engine.ts
npx tsx src/scripts/verify-official-portal.ts
npx tsx src/scripts/verify-sla-engine.ts
npx tsx src/scripts/verify-ai-service.ts
npx tsx src/scripts/verify-genai.ts
npx tsx src/scripts/verify-rag.ts
npx tsx src/scripts/verify-admin.ts
npx tsx src/scripts/verify-analytics.ts
npx tsx src/scripts/verify-production-hardening.ts
```

---

## 5. Integrating with the `.ai/` Project Intelligence System

The repository maintains an integrated persistent intelligence system in `.ai/`.

### Key Commands (Run from Repository Root):
- **Sync Repository State:** `.ai/bin/ai-project sync`
- **Check System Health:** `.ai/bin/ai-project validate` and `.ai/bin/ai-project doctor`
- **Inspect System Architecture:** `.ai/bin/ai-project architecture`
- **View Task Impact & Blast Radius:** `.ai/bin/ai-project impact-task "<task name>"`
- **Record Verified Changes:** `.ai/bin/ai-project record-change --confirm --task "<task name>"`
- **Verify Documentation Drift:** `.ai/bin/ai-project docs-check`
