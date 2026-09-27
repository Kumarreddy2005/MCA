# VCGIS System Architecture Document

**System Name:** Village Volunteer-Assisted Citizen Grievance Intelligence System (VCGIS)  
**Governance Authority:** Government of Karnataka  
**Document Revision:** 1.0 (Authoritative Technical Architecture)  
**Last Updated:** September 2026  

---

## 1. Architectural Principles & System Overview

VCGIS is architected as an asynchronous, microservice-backed e-governance platform designed for high availability, fault tolerance, and strict human-in-the-loop governance. 

### Core Architectural Axioms:
1. **Human Authority Preservation:** AI and GenAI models operate strictly as advisory decision-support pipelines. No AI service is permitted to modify complaint states, reject citizen petitions, or bypass role-based authorization.
2. **Strict Departmental Isolation:** Officials can only access, view, and act on grievances assigned to their authorized department and administrative jurisdiction. Cross-department queries trigger security audit events and return HTTP 403.
3. **Decoupled Three-Tier Topology:** The web client (React/Vite), backend business engine (Node.js/Express), and AI intelligence pipeline (Python/FastAPI) communicate across standardized REST/JSON boundaries, allowing independent scaling and isolated failure domains.
4. **Zero-PII Spatial Exposure (Section 32 Compliance):** Public and analytical geographic intelligence layers suppress all citizen identity attributes (names, phone numbers, exact house addresses), exposing only aggregated spatial coordinates and department metrics.
5. **Non-Repudiable Auditability:** Every grievance status change, assignment, SLA breach, volunteer field verification, and admin configuration event is permanently recorded in an append-only audit trail.

---

## 2. Multi-Service Component Architecture

The physical deployment topology connects five interconnected services:

```mermaid
graph TD
    subgraph Client_Layer [Client Application Layer]
        CitizenBrowser[Citizen Mobile / Desktop Web]
        VolunteerBrowser[Village Volunteer Field App]
        OfficialBrowser[Department Official Workstation]
        AdminBrowser[State Administrator Console]
    end

    subgraph Ingress_Layer [Ingress & Gateway Layer]
        NginxGateway[Nginx Gateway :80 / Reverse Proxy]
    end

    subgraph Application_Layer [Application Services]
        FrontendApp[Frontend Service: React 19 + Vite :5173]
        BackendAPI[Backend API: Node.js 22 + Express 5 :5001]
        AIService[AI Microservice: Python 3.10 + FastAPI :8000]
    end

    subgraph Datastore_Layer [Persistence & Caching]
        MongoCluster[(MongoDB 7.0 Persistence)]
        RedisCache[(Redis 7.0 / Memory Cache)]
        LocalUploads[(Evidence File Storage: /uploads)]
    end

    CitizenBrowser -->|HTTPS| NginxGateway
    VolunteerBrowser -->|HTTPS| NginxGateway
    OfficialBrowser -->|HTTPS| NginxGateway
    AdminBrowser -->|HTTPS| NginxGateway

    NginxGateway -->|/| FrontendApp
    NginxGateway -->|/api/*| BackendAPI

    BackendAPI -->|Mongoose ODM| MongoCluster
    BackendAPI -->|Session / Rate Limiting / TTL Cache| RedisCache
    BackendAPI -->|Multer Local Disk Write| LocalUploads
    BackendAPI -->|HTTP REST Client /api/ai/*| AIService
    BackendAPI -->|HTTP REST Client /api/genai/*| AIService
    BackendAPI -->|HTTP REST Client /api/rag/*| AIService
```

---

## 3. Frontend Architecture (React 19 + TypeScript + Tailwind 4)

The frontend application is constructed as a modern Single Page Application (SPA) utilizing Vite 5, React 19, and Tailwind CSS 4.

### 3.1 Modular Directory Structure
```
frontend/src/
├── components/
│   ├── admin/             # Overview, User Management, Department SLA, Jurisdictions, Audit Tabs
│   ├── ai/                # AiInsightsBadge (confidence, entities, duplicates)
│   ├── analytics/         # GisMapViewer (SVG Karnataka), Trends Chart, Dept Performance Table
│   ├── auth/              # ProtectedRoute wrapper enforcing role checks
│   ├── citizen/           # CreateGrievanceModal, GrievanceDetailModal, GrievanceCard
│   ├── complaints/        # Action history viewer, audit modal
│   ├── genai/             # CitizenAiAssistantModal, VolunteerStructuringDrawer
│   ├── layout/            # Navbar (role-specific quick links, notification bell, user badge)
│   ├── notifications/     # NotificationBell with unread counter and popover drawer
│   ├── official/          # OfficialReviewModal with live SLA timer, action drawer, resolution proof
│   ├── rag/               # KnowledgeAssistantModal (Karnataka GO and circular queries)
│   ├── sla/               # SlaComplianceCard (gauges, sweep trigger, compliance score)
│   └── volunteer/         # AssistedComplaintModal, FieldVerificationModal, CitizenRegisterModal
├── context/
│   ├── AuthContext.tsx    # State: user, accessToken, role, login, logout, refresh session
│   └── useAuth.ts         # Custom hook exposing authentication methods
├── pages/
│   ├── HomePage.tsx       # Public portal landing page with department directory & tracking
│   ├── auth/LoginPage.tsx # Dual-tab login (Citizen OTP vs Staff Email/Password)
│   ├── citizen/           # Citizen personal grievance tracking dashboard
│   ├── volunteer/         # Village volunteer cluster queue and citizen onboarding
│   ├── official/          # Department official work queue and resolution console
│   └── admin/             # Administrator console and executive analytics dashboard
└── services/api/          # Axios HTTP clients mapping 1:1 to backend route groups
```

### 3.2 Client-Side Routing & Access Control
All routes are guarded using a declarative `ProtectedRoute` component:
- `/` &rarr; `HomePage` (Public)
- `/login` &rarr; `LoginPage` (Public)
- `/citizen/*` &rarr; Guarded: `allowedRoles={[CITIZEN, ADMIN]}`
- `/volunteer/*` &rarr; Guarded: `allowedRoles={[VOLUNTEER, ADMIN]}`
- `/official/*` &rarr; Guarded: `allowedRoles={[OFFICIAL, ADMIN]}`
- `/admin/*` &rarr; Guarded: `allowedRoles={[ADMIN]}`
- `/analytics/*` &rarr; Guarded: `allowedRoles={[OFFICIAL, ADMIN]}`

---

## 4. Backend Application Architecture (Node.js 22 + Express 5)

The backend acts as the authoritative application server, managing transactions, business rules, SLA timers, and security boundaries.

### 4.1 Middleware Pipeline Execution Order
Every incoming HTTP request traverses an ordered middleware pipeline:

```mermaid
sequenceDiagram
    autonumber
    actor Client
    participant Helmet as Helmet & Security Headers
    participant RateLimiter as Tiered Rate Limiter
    participant BodyParser as Express JSON / URL Encoded
    participant Sanitize as NoSQL Injection Sanitizer
    participant Auth as Authenticate (JWT Bearer)
    participant RBAC as Authorize (Role Guard)
    participant Isolation as Dept Isolation Middleware
    participant Controller as Business Controller
    participant Datastore as MongoDB / AI Service

    Client->>Helmet: HTTP Request
    Helmet->>RateLimiter: Check Headers (HSTS, CSP, nosniff)
    RateLimiter->>BodyParser: Verify IP rate bucket (Auth: 15/m, Gen: 120/m)
    BodyParser->>Sanitize: Parse JSON body
    Sanitize->>Auth: Strip $, __proto__, script tags in-place
    Auth->>RBAC: Verify JWT Access Token signature & expiry
    RBAC->>Isolation: Verify UserRole matches route permissions
    Isolation->>Controller: If OFFICIAL, verify dept matches complaint dept
    Controller->>Datastore: Execute transaction / Mongoose query / AI proxy
    Datastore-->>Controller: Return query result
    Controller-->>Client: Standardized JSON Response { success, data }
```

### 4.2 Error Handling & Standardized Response Envelope
All API controllers wrap asynchronous logic in `asyncHandler` utilities and return responses adhering to the uniform schema:
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```
Failed requests are intercepted by `error.middleware.ts`, converting domain exceptions into structured error payloads:
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Please slow down.",
    "details": null
  }
}
```

---

## 5. Complaint Lifecycle & State Machine Architecture

The grievance lifecycle encompasses 18 distinct states managed by `complaint-lifecycle.service.ts`:

```mermaid
stateDiagram-v2
    [*] --> SUBMITTED: Citizen or Volunteer Lodges
    SUBMITTED --> VALIDATING: Initial AI / System Ingestion
    VALIDATING --> VERIFICATION_REQUIRED: Low Confidence or Ground Check Flagged
    VALIDATING --> ROUTING: High Confidence Validation
    VERIFICATION_REQUIRED --> VERIFIED: Volunteer Conducts 4-Point Field Visit
    VERIFICATION_REQUIRED --> REJECTED: Fraudulent / False Claim
    VERIFIED --> ROUTING: Field Evidence Attached
    ROUTING --> ASSIGNED: Routed to 1 of 11 Depts & Jurisdictional Officer
    ASSIGNED --> UNDER_REVIEW: Official Opens & Reviews Dossier
    UNDER_REVIEW --> ACTION_IN_PROGRESS: Contractor Dispatched / Work Order
    UNDER_REVIEW --> INFORMATION_REQUIRED: Official Queries Citizen
    INFORMATION_REQUIRED --> UNDER_REVIEW: Citizen Responds with Info
    ACTION_IN_PROGRESS --> RESOLVED: Official Uploads Mandatory Photo Proof
    UNDER_REVIEW --> REJECTED: Legally Ineligible (Statutory Reason)
    RESOLVED --> CLOSED: Citizen Submits Satisfaction Rating
    RESOLVED --> REOPENED: Citizen Dissatisfied within 7 Days
    REOPENED --> UNDER_REVIEW: Escalated Back to Queue
    UNDER_REVIEW --> ESCALATED: SLA Breached (L1 -> L2 -> L3)
    ACTION_IN_PROGRESS --> ESCALATED: SLA Breached (L1 -> L2 -> L3)
    ASSIGNED --> ESCALATED: SLA Breached (L1 -> L2 -> L3)
    CLOSED --> [*]
    REJECTED --> [*]
```

### Validated State Transition Rules:
- Transition to `RESOLVED` strictly requires `resolutionSummary` and `resolutionPhotos` (mandatory work proof).
- Transition to `REJECTED` strictly requires administrative legal grounds recorded in `rejectionReason`.
- Transition to `REOPENED` is restricted to citizens within 7 days of resolution, requiring a dissatisfaction justification.

---

## 6. AI Intelligence Microservice Architecture

The AI service operates as an autonomous FastAPI application structured into modular functional pipelines:

```mermaid
graph TD
    subgraph Request_Ingress
        RawPetition[Citizen Petition / Verbal Notes / PDF Scan]
    end

    subgraph Extraction_Pipeline [Phase 7: Extraction & Understanding]
        PDFParser[PyPDF Text Stream Parser]
        OCRModule[Pillow / Tesseract Heuristic OCR]
        NLPEngine[Multilingual Tokenizer & Entity Extractor]
        Districts[(Karnataka 31 Districts / Taluks Gazette)]
    end

    subgraph Intelligence_Pipeline [Phase 7: Analysis & Scoring]
        DeptClassifier[Rule-Based Weighted 11-Dept Classifier]
        UrgencyModel[Urgency & Public Safety Hazard Scorer]
        VectorSim[TF-IDF Vectorizer + Cosine Sim]
        GeoFilter[Haversine GPS 2km Radius Filter]
    end

    subgraph Generative_Support [Phase 8: GenAI Decision Support]
        CitizenCopilot[Citizen Plain-Language Grievance Structurer]
        VolunteerCopilot[Volunteer 4-Part Field Petition Structurer]
        OfficialCopilot[Official Resolution Letter & SMS Generator]
        TranslationEngine[Bidirectional Kannada <-> English Civic Lexicon]
    end

    subgraph Knowledge_RAG [Phase 9: Grounded RAG Knowledge Base]
        DocChunker[Sliding-Window Semantic Legal Chunker]
        VectorStore[(In-Memory Document & Chunk Index)]
        RelevanceRanker[Heading & Keyword Proximity Ranker]
        AntiHallucination[Strict Source Grounding & Citation Enforcer]
    end

    RawPetition --> PDFParser
    RawPetition --> OCRModule
    PDFParser --> NLPEngine
    OCRModule --> NLPEngine
    NLPEngine --> Districts
    NLPEngine --> DeptClassifier
    NLPEngine --> UrgencyModel
    NLPEngine --> VectorSim
    VectorSim --> GeoFilter

    NLPEngine --> CitizenCopilot
    NLPEngine --> VolunteerCopilot
    NLPEngine --> OfficialCopilot
    NLPEngine --> TranslationEngine

    RawPetition --> RelevanceRanker
    RelevanceRanker --> VectorStore
    VectorStore --> AntiHallucination
```

---

## 7. SLA & Hierarchical Escalation Architecture

In compliance with the **Karnataka Guarantee of Services to Citizens Act (Sakala Act, 2011)**, grievances are bound to statutory resolution timeframes:

```mermaid
graph TD
    GrievanceLodged[Grievance Registered] --> PriorityEvaluation{Priority Assigned}
    PriorityEvaluation -->|CRITICAL| T24[24 Hours Target]
    PriorityEvaluation -->|HIGH| T48[48 Hours Target]
    PriorityEvaluation -->|MEDIUM| T120[5 Days / 120 Hours Target]
    PriorityEvaluation -->|LOW| T240[10 Days / 240 Hours Target]

    T24 & T48 & T120 & T240 --> ActiveMonitor[SLA Monitor Active]
    ActiveMonitor --> WarningCheck{< 24h Remaining?}
    WarningCheck -->|Yes| SendWarning[Dispatch Yellow Warning Notification]
    WarningCheck -->|No| ActiveMonitor

    ActiveMonitor --> BreachCheck{Target Expired?}
    BreachCheck -->|Yes| EscalationLevel1[Level 1 Escalation: Taluk Tahsildar / EO]
    EscalationLevel1 --> Overdue24Check{> 24h Overdue?}
    Overdue24Check -->|Yes| EscalationLevel2[Level 2 Escalation: District Collector]
    EscalationLevel2 --> Overdue48Check{> 48h Overdue?}
    Overdue48Check -->|Yes| EscalationLevel3[Level 3 Escalation: Principal Secretary]
```

---

## 8. Data Storage & Entity Relationship Architecture

Persistence is provided by MongoDB using 8 specialized collections:

```mermaid
erDiagram
    USER ||--o{ COMPLAINT : "submits / assigned"
    USER ||--o{ REFRESH_TOKEN : "owns"
    USER ||--o{ NOTIFICATION : "receives"
    USER ||--o{ AUDIT_LOG : "triggers"
    DEPARTMENT ||--o{ COMPLAINT : "handles"
    COMPLAINT ||--o{ AUDIT_LOG : "has history"
    KNOWLEDGE_DOCUMENT ||--o{ KNOWLEDGE_CHUNK : "chunks into"

    USER {
        string id PK
        string phone UK
        string email UK
        string role
        boolean isActive
        object citizenProfile
        object volunteerProfile
        object officialProfile
    }

    COMPLAINT {
        string id PK
        string complaintNumber UK
        string title
        string description
        string status
        string priority
        string department
        object location
        array evidence
        object verification
        object sla
        object aiAnalysis
    }

    DEPARTMENT {
        string id PK
        string code UK
        string name
        array categories
        object defaultSlaHours
    }

    AUDIT_LOG {
        string id PK
        string action
        string entityType
        string entityId
        string actorRole
        object previousState
        object newState
        date timestamp
    }
```

---

## 9. Security & Privacy Architecture (Section 32 Compliance)

The platform implements multi-layered security controls designed to fulfill state government cybersecurity standards:

1. **Section 32 Zero-PII Spatial Guard:**
   The GIS analytics endpoint (`/api/analytics/geo`) and public dashboard map omit citizen names, mobile numbers, and street door numbers. Geographic coordinates are clustered into centroid pins with noise injection where citizen density is low.
2. **Enterprise Transport Security:**
   Strict HTTP security headers configured via Helmet:
   - `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
   - `Content-Security-Policy`: Disallows arbitrary remote scripts, frames, and unsafe eval.
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: SAMEORIGIN`
   - Suppression of `X-Powered-By`.
3. **NoSQL Injection & Prototype Pollution Sanitizer:**
   `sanitize.middleware.ts` intercepts all incoming payloads, recursively stripping MongoDB operators (`$ne`, `$where`, `$gt`, etc.) and prototype mutation properties (`__proto__`, `constructor`, `prototype`).
4. **Tiered Dynamic Rate Limiting:**
   Powered by `rate-limiter-flexible` with Redis/memory backing:
   - Authentication routes (`/api/auth/*`): 15 requests per minute per IP.
   - General API routes: 120 requests per minute per IP.
   - Rate limit violations return standard HTTP 429 payloads with retry-after metadata.

---

## 10. Deployment & Orchestration Architecture

The system is packaged into isolated multi-stage production containers orchestrated via Docker Compose:

```mermaid
graph TD
    subgraph Host_Network
        Port80[Port :80 Public Ingress]
    end

    subgraph Docker_Bridge_Network [VCGIS Container Network]
        NginxCont[Nginx Alpine Gateway]
        FrontendCont[Frontend Production Container]
        BackendCont[Backend Node.js 22 Slim Container]
        AICont[FastAPI Python 3.10 Slim Container]
        MongoCont[MongoDB 7.0 Container]
        RedisCont[Redis 7.0 Container]
    end

    subgraph Docker_Volumes [Persistent Storage]
        MongoVol[(mongodb_data)]
        UploadsVol[(backend_uploads)]
        RedisVol[(redis_data)]
    end

    Port80 --> NginxCont
    NginxCont -->|Internal Route /| FrontendCont
    NginxCont -->|Internal Route /api/| BackendCont
    BackendCont --> AICont
    BackendCont --> MongoCont
    BackendCont --> RedisCont

    MongoCont --- MongoVol
    BackendCont --- UploadsVol
    RedisCont --- RedisVol
```

All application processes execute under non-root unprivileged users (`USER node` in backend, non-root user in AI service) and incorporate container healthcheck sweeps verifying service availability.
