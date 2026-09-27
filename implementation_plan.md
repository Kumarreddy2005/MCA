# VCGIS — Master Reset Audit & Phased Implementation Plan

## Reset Audit Summary

I have completed a thorough audit of the entire repository. Below is the complete findings, classification of old vs. new, and the phased implementation plan.

---

## 1. Repository Audit Findings

### 1.1 Current Repository Structure

```
VCGIS-main/
├── .ai/                          ← NEW PROJECT INTELLIGENCE — PRESERVE
├── .gitignore                    ← PRESERVE (update for new structure)
├── AGENTS.md                     ← PRESERVE (agent entry point)
├── CLAUDE.md                     ← PRESERVE (Claude Code entry point)
├── README.md                     ← OLD — REPLACE
├── README (2).md                 ← OLD — REMOVE
├── VCGIS_Master_Requirements.md  ← REFERENCE COPY — REMOVE (canonical copy in .ai/project/)
├── atlas-credentials.env         ← ⚠️ SECURITY RISK — DELETE IMMEDIATELY
├── architecture.jpeg             ← OLD REFERENCE — REMOVE
├── Citizen Grievance...pptx      ← OLD REFERENCE — REMOVE
├── Volunteer_CGIS...pdf          ← OLD REFERENCE — REMOVE
├── frontend/                     ← OLD APPLICATION — REMOVE & REBUILD
├── backend/                      ← OLD APPLICATION — REMOVE & REBUILD
├── ai-service/                   ← OLD APPLICATION — REMOVE & REBUILD
└── docs/                         ← OLD DOCUMENTATION — REMOVE & REBUILD
```

### 1.2 Classification: OLD APPLICATION (to remove)

| Directory/File | Content | Action |
|---|---|---|
| `frontend/` | Old React SPA with incomplete portals, old auth, old components, old routing, old mock services | **DELETE entirely** |
| `backend/` | Old Express API with old models (CGIS not VCGIS), old auth, old controllers, old seed files, exposed `.env` with hardcoded credentials | **DELETE entirely** |
| `ai-service/` | Old FastAPI service with OCR/NLP/clustering/priority/department modules | **DELETE entirely** |
| `docs/` | Old `VCGIS-DELIVERY-ROADMAP.md` and `VCGIS-TECHNICAL-DOCUMENTATION.md` | **DELETE entirely** |
| `atlas-credentials.env` | **Contains real MongoDB Atlas credentials in plaintext** — `MONGODB_USERNAME`, `MONGODB_PASSWORD`, `MONGODB_URI` | **DELETE IMMEDIATELY** |
| `backend/.env` | Contains real MongoDB URI with password, placeholder JWT secrets | **DELETE** (will be in .gitignore) |
| `README (2).md` | Duplicate/old README | **DELETE** |
| `README.md` | Old project README | **REPLACE** |
| `VCGIS_Master_Requirements.md` | Duplicate of `.ai/project/requirements.md` | **DELETE** |
| `architecture.jpeg` | Old architecture diagram | **DELETE** |
| `Citizen Grievance...pptx` | Old presentation | **DELETE** |
| `Volunteer_CGIS...pdf` | Old architecture PDF | **DELETE** |

### 1.3 Classification: NEW INFRASTRUCTURE (to preserve)

| Directory/File | Content | Action |
|---|---|---|
| `.ai/` | Project intelligence system | **PRESERVE** |
| `.ai/project/requirements.md` | Master requirements (2595 lines, 77 sections) | **PRESERVE** |
| `.ai/project/architecture.json` | Architecture description | **UPDATE** after reset |
| `.ai/project/features.json` | Feature registry | **PRESERVE** |
| `.ai/project/project.json` | Project metadata | **PRESERVE** |
| `.ai/graph/` | Project knowledge graph | **UPDATE** after reset |
| `.ai/changes/` | Change ledger | **PRESERVE** |
| `.ai/agents/` | Agent instructions, rules, workflows | **PRESERVE** |
| `.ai/architecture/` | Architecture summaries, diagrams, flows | **UPDATE** after reset |
| `.ai/bin/ai-project` | CLI tool entry point | **PRESERVE** |
| `.ai/tool/` | Python tools (ai_project.py, architecture.py) | **PRESERVE** |
| `.ai/metadata/` | Architecture memory | **UPDATE** after reset |
| `.ai/cache/` | Context cache | **PRESERVE** |
| `.ai/docs/` | Documentation index, features, decisions | **PRESERVE** |
| `.ai/planning/` | Active/completed plans | **PRESERVE** |
| `AGENTS.md` | Multi-agent entry point | **PRESERVE** |
| `CLAUDE.md` | Claude Code entry point | **PRESERVE** |
| `.gitignore` | Git ignore rules | **PRESERVE & UPDATE** |

> [!CAUTION]
> **SECURITY ALERT:** The file `atlas-credentials.env` contains **real MongoDB Atlas credentials** (username: `poornateja0079_db_user`, password visible). The `backend/.env` also contains the same real MongoDB URI. These must be deleted immediately and the credentials should be rotated.

### 1.4 Git Status

**No Git repository is initialized.** The `git log` command returns `fatal: not a git repository`. This means:
- No commit history exists
- No branches exist
- Git must be initialized as part of Phase 0

### 1.5 Old Application Analysis

#### Frontend (OLD)
- **60 TypeScript/TSX files** across pages, components, services, hooks, contexts
- Roles: User (Citizen), Volunteer, Department, Admin — partially implemented
- Auth: `AuthContext.tsx` with basic JWT — incomplete
- Services: `roleServices.ts`, `realServices.ts`, `client.ts` — old API layer
- Components: cards, charts, forms, layout, modals, navbar, sidebar, tables, timeline, upload, UI, status
- Pages: Landing, Auth, User (Dashboard/Complaints/Profile/Settings), Volunteer (Dashboard/Complaints/RegisterComplaint/ComplaintDetails), Department (Dashboard/Complaints/ComplaintDetails), Admin (Dashboard/Users/Departments/Complaints/Analytics/Reports/Settings/Volunteers/ProblemClusters)
- Named "cgis-frontend" not "vcgis-frontend"

#### Backend (OLD)
- **60 TypeScript files** across routes, controllers, services, repositories, models, middlewares, validators, seed, types, config
- Models: user, complaint, department, notification, auditLog, statusHistory, complaintCluster, report, otpVerification
- Routes: auth, complaint, ai, analytics, audit, health, notification, report
- Named "cgis-backend" not "vcgis-backend"
- Seed files include `create-admin.ts` and `reset-admin.ts`
- **Missing**: volunteer-specific routes, SLA, jurisdiction, GenAI, RAG

#### AI Service (OLD)
- **40 Python files** across controllers, services, schemas, OCR, NLP, location, priority, department, summary, clustering, models, utils, config
- Tests: 7 test files (analysis, clustering, text normalizer, enrichment, health, OCR text cleaner, intelligence rules)
- **Missing**: GenAI, RAG, similarity/embeddings, multilingual

### 1.6 Directories Required by Requirements but Missing

The following directories/files specified in the requirements or prompt don't exist yet:

| Path | Purpose |
|---|---|
| `.ai/state/` | Project state persistence (project-state.json, current-task.json, etc.) |
| `.ai/handoff/` | Agent handoff state (LATEST.md) |
| `.ai/tasks/` | Task registry |
| `.ai/features/` | Feature registry (exists under `.ai/project/features.json`) |
| `.ai/decisions/` | Decision records (exists under `.ai/docs/decisions/`) |
| `.ai/state/checkpoints/` | Historical checkpoints |
| `.ai/state/active-agents.json` | Active agent tracking |
| `shared/` | Shared types across frontend/backend |
| `database/` | Database configuration/migrations |
| `storage/` | Storage abstraction |
| `tests/` | Integration/E2E tests |
| `scripts/` | Development/deployment scripts |
| `infra/` | Infrastructure configuration |
| `.github/copilot-instructions.md` | GitHub Copilot config |
| `.opencode/` | OpenCode agent config |

---

## 2. Reset Execution Plan

### Step 1: Initialize Git

```bash
git init
git add .gitignore AGENTS.md CLAUDE.md .ai/
git commit -m "chore: preserve project intelligence before application reset"
```

### Step 2: Delete Old Application Files

Files to delete:
```
frontend/           # Entire old frontend
backend/            # Entire old backend
ai-service/         # Entire old AI service
docs/               # Old documentation
atlas-credentials.env   # SECURITY: real credentials
README (2).md       # Duplicate
VCGIS_Master_Requirements.md  # Duplicate (canonical in .ai/)
architecture.jpeg   # Old diagram
Citizen Grievance Intelligence System 1.pptx  # Old presentation
Volunteer_CGIS_Final_Architecture.pdf  # Old PDF
```

### Step 3: Verify Clean State

- `.ai/` intact with all subdirectories
- `AGENTS.md` exists
- `CLAUDE.md` exists
- `.gitignore` exists
- `.ai/project/requirements.md` exists (master requirements)
- No old application code remains

### Step 4: Create State Infrastructure

```
.ai/state/project-state.json
.ai/state/current-task.json
.ai/state/active-agents.json
.ai/state/last-session.json
.ai/state/checkpoints/
.ai/handoff/LATEST.md
.ai/tasks/
```

### Step 5: Initialize New Application Structure

```
vcgis-main/
├── .ai/                    # Preserved intelligence
├── .github/
│   └── copilot-instructions.md
├── frontend/               # React + TS + Vite + Tailwind
├── backend/                # Node.js + Express + TS
├── ai-service/             # Python + FastAPI
├── shared/                 # Shared TypeScript types
├── database/               # MongoDB schemas/migrations
├── storage/                # File/evidence storage abstraction
├── tests/                  # Integration & E2E tests
├── scripts/                # Dev/deploy scripts
├── docs/                   # Architecture, API, guides
├── infra/                  # Docker, CI/CD
├── AGENTS.md
├── CLAUDE.md
├── .gitignore
└── README.md
```

---

## 3. Phased Implementation Plan

### Phase 0 — Foundation

> [!IMPORTANT]
> This phase establishes the clean codebase. Everything after depends on it.

#### [NEW] `frontend/` — React + Vite + Tailwind + TypeScript

- `package.json` (name: `vcgis-frontend`)
- Vite config with Tailwind CSS 4
- TypeScript config
- ESLint config
- `src/main.tsx` — entry point
- `src/App.tsx` — root with React Router
- `src/styles/` — Tailwind CSS, global styles
- `src/config/` — environment config (API URL)
- `src/lib/` — utility functions
- `src/services/api/client.ts` — axios instance
- `src/components/ui/` — base UI components (Button, Card, Input, etc.)
- `src/components/layout/` — AppLayout, Sidebar, Navbar shells
- `src/pages/` — placeholder routing structure

#### [NEW] `backend/` — Express + TypeScript

- `package.json` (name: `vcgis-backend`)
- TypeScript config
- ESLint config
- `src/server.ts` — entry with MongoDB connect + Socket.IO
- `src/app.ts` — Express app with helmet, cors, compression, rate limiting, morgan
- `src/config/env.ts` — environment configuration (validated with Zod)
- `src/config/database.ts` — MongoDB connection
- `src/middlewares/error.middleware.ts` — global error handler
- `src/middlewares/requestContext.middleware.ts` — request context
- `src/utils/logger.ts` — Winston logger
- `src/utils/apiResponse.ts` — standardized API response
- `src/utils/asyncHandler.ts` — async route wrapper
- `src/routes/index.ts` — API router
- `src/routes/health.routes.ts` — health check
- `.env.example` — template (NO real credentials)

#### [NEW] `ai-service/` — FastAPI + Python

- `requirements.txt`
- `app/main.py` — FastAPI app with CORS, health
- `app/config/settings.py` — Pydantic settings
- `app/utils/logging.py` — Loguru setup
- `app/schemas/common.py` — common response schemas
- `tests/test_health.py` — health check test

#### [NEW] `shared/`

- `types/` — shared TypeScript type definitions (roles, complaint statuses, API contracts)

#### [NEW] `database/`

- MongoDB index definitions, initial schema docs

#### [NEW] `storage/`

- `src/storage.interface.ts` — abstract storage
- `src/local.storage.ts` — local file storage implementation

#### [NEW] Supporting Files

- `.env.example` at root level
- `docker-compose.yml` — MongoDB + backend + frontend + ai-service
- `README.md` — new project README
- `scripts/setup.sh` — development environment setup

#### [NEW] State Infrastructure

- `.ai/state/project-state.json`
- `.ai/state/current-task.json`
- `.ai/state/active-agents.json`
- `.ai/state/last-session.json`
- `.ai/handoff/LATEST.md`
- `.github/copilot-instructions.md`

#### Verification

- [ ] `npm run build` passes in frontend
- [ ] `npm run build` passes in backend
- [ ] `npm run typecheck` passes in both
- [ ] `npm run lint` passes in both
- [ ] `pytest ai-service/tests` passes
- [ ] Health endpoints respond
- [ ] MongoDB connects
- [ ] Git initialized with clean commit history

---

### Phase 1 — Authentication + RBAC

#### Backend

- [MODIFY] `backend/src/models/user.model.ts` — User model with roles (CITIZEN, VOLUNTEER, OFFICIAL, ADMIN)
- [NEW] `backend/src/services/auth.service.ts` — signup, login, logout, token refresh, password hashing
- [NEW] `backend/src/services/token.service.ts` — JWT access + refresh token management
- [NEW] `backend/src/services/password.service.ts` — bcrypt hashing
- [NEW] `backend/src/middlewares/auth.middleware.ts` — JWT verification, role extraction
- [NEW] `backend/src/middlewares/rbac.middleware.ts` — role + resource authorization
- [NEW] `backend/src/routes/auth.routes.ts` — signup, login, logout, refresh, me
- [NEW] `backend/src/controllers/auth.controller.ts`
- [NEW] `backend/src/validators/auth.validator.ts` — Zod schemas
- [NEW] `backend/src/routes/user.routes.ts` — profile, password change

#### Frontend

- [NEW] `frontend/src/contexts/AuthContext.tsx` — JWT state, login/logout, role
- [NEW] `frontend/src/pages/Auth/LoginPage.tsx`
- [NEW] `frontend/src/pages/Auth/SignupPage.tsx`
- [NEW] `frontend/src/components/auth/ProtectedRoute.tsx`
- [NEW] `frontend/src/components/auth/RoleGuard.tsx`
- [NEW] `frontend/src/services/api/auth.service.ts`

#### Verification

- [ ] Citizen can signup, login, logout
- [ ] JWT tokens issued and validated
- [ ] Protected routes reject unauthenticated users
- [ ] Role-based access enforced at backend
- [ ] Password properly hashed

---

### Phase 2 — Citizen Portal

#### Backend
- Complaint model, citizen complaint CRUD, evidence upload
- Citizen profile endpoints

#### Frontend
- Citizen dashboard, complaint creation form, complaint list, complaint detail, timeline
- Evidence upload UI, location input
- Notification display

---

### Phase 3 — Village Volunteer Portal

#### Backend
- Citizen registration by volunteer, complaint-on-behalf, verification workflow
- Volunteer-specific authorization scoping

#### Frontend
- Volunteer dashboard, citizen registration form, complaint registration
- Verification UI, assigned complaint tracking

---

### Phase 4 — Complaint Management Engine

#### Backend
- Full complaint lifecycle state machine (19 states)
- State transition validation
- Complaint history tracking
- Assignment logic, department routing hooks

---

### Phase 5 — Department Official Portal

#### Backend
- Department model, official-to-department assignment
- Department-scoped complaint queries
- Official action endpoints (assign, review, resolve, escalate)

#### Frontend
- Department dashboard, complaint queue, review UI
- Action recording, notes, information requests

---

### Phase 6 — SLA + Escalation

#### Backend
- SLA model, configurable rules
- Timer/deadline tracking
- Warning & breach detection (background job)
- Escalation triggers

---

### Phase 7 — AI Intelligence

#### AI Service
- OCR pipeline (Tesseract, PyMuPDF, OpenCV)
- NLP (spaCy, entity/intent/location extraction)
- Classification (configurable categories, confidence)
- Priority intelligence
- Similarity/duplicate detection (sentence-transformers, embeddings)
- Department recommendation
- Summarization, keyword extraction

#### Backend
- AI service integration layer
- AI result storage
- Human review workflow

---

### Phase 8 — Generative AI

#### AI Service + Backend
- Citizen AI Assistant (complaint help, status explanation)
- Volunteer AI Assistant (structuring, translation, missing info)
- Official AI Assistant (summaries, draft responses, SLA summaries)
- Admin AI Assistant (analytics questions, operational summaries)

---

### Phase 9 — RAG Knowledge System

#### AI Service + Backend
- Knowledge document ingestion
- Chunking, embedding, retrieval
- Source references, versioning
- Admin knowledge management UI

---

### Phase 10 — Admin Portal

#### Backend + Frontend
- User management (CRUD all roles)
- Department management
- Volunteer management
- Official management
- Category/subcategory configuration
- Workflow configuration
- SLA configuration
- Audit log viewer

---

### Phase 11 — Analytics + Geographic Intelligence

#### Backend + Frontend
- Complaint analytics dashboards
- SLA analytics
- Volunteer analytics
- AI analytics
- Map integration (complaint locations, clustering, hotspots)
- Export/reporting

---

### Phase 12 — Security + Testing + Deployment + Production Hardening

- Security audit (RBAC, input validation, rate limiting, secure headers)
- Comprehensive test suite (unit, integration, E2E)
- CI/CD pipeline
- Docker production configuration
- Performance optimization
- Final documentation
- Production readiness review

---

## 4. Open Questions for User Review

> [!IMPORTANT]
> **Credentials Rotation:** The `atlas-credentials.env` file contains real MongoDB Atlas credentials. These should be rotated immediately since they were exposed in the repository without Git protection. Are these still the active credentials?

> [!IMPORTANT]
> **MongoDB Atlas vs Local:** Should the new development environment connect to the existing MongoDB Atlas cluster (`cgis.lhjabhr.mongodb.net`), or should we use a local MongoDB instance via Docker for development?

> [!IMPORTANT]
> **Reference Files:** The old files (`architecture.jpeg`, `Citizen Grievance...pptx`, `Volunteer_CGIS_Final_Architecture.pdf`) appear to be original project reference materials. Should these be preserved in a `docs/references/` directory, or are they no longer needed since the master requirements are in `.ai/project/requirements.md`?

> [!IMPORTANT]
> **Tailwind CSS Version:** The old frontend used `@tailwindcss/vite` v4.3.3 (Tailwind CSS 4). The requirements specify Tailwind CSS. Should we continue with Tailwind CSS 4, or use the stable Tailwind CSS 3.x?

---

## 5. Verification Plan

### After Reset
- [ ] All old application files removed
- [ ] `.ai/` fully intact
- [ ] `AGENTS.md`, `CLAUDE.md` intact
- [ ] `requirements.md` accessible
- [ ] No credentials in repository
- [ ] Git initialized with clean history

### Per-Phase Gates
Each phase will verify:
- [ ] TypeScript compilation passes (`npm run typecheck`)
- [ ] Linting passes (`npm run lint`)
- [ ] Build passes (`npm run build`)
- [ ] Tests pass
- [ ] Security checks pass
- [ ] Project intelligence synchronized
- [ ] Handoff state updated

### Manual Verification
- Frontend renders correctly in browser
- API endpoints respond correctly via curl/Postman
- Authentication flow works end-to-end
- Role-based access correctly enforced
