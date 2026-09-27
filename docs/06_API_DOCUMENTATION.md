# VCGIS REST API Documentation

**System Name:** Village Volunteer-Assisted Citizen Grievance Intelligence System (VCGIS)  
**Base URL:** `http://localhost:5001/api` (Production: `https://vcgis.karnataka.gov.in/api`)  
**API Version:** v1 (12 Active Route Modules)  
**Security Protocols:** Bearer JWT, Tiered Rate Limiter, NoSQL Sanitizer, Role-Based Access Control  

---

## 1. Global Conventions & Standards

### 1.1 Authentication & Authorization Headers
Protected endpoints require an HTTP Authorization header containing a valid JSON Web Token:
```http
Authorization: Bearer <jwt_access_token>
```
Access tokens expire in **15 minutes**. Refresh tokens expire in **7 days**.

### 1.2 Uniform Response Envelope
All API endpoints return JSON conforming to the standardized response envelope:

#### Successful Response (HTTP 200 / 201)
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

#### Error Response (HTTP 4xx / 5xx)
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE_STRING",
    "message": "Human-readable explanation of error",
    "details": null
  }
}
```

---

## 2. Authentication API Module (`/auth`)

### 2.1 Send Citizen OTP
- **Method:** `POST`
- **Path:** `/auth/citizen/send-otp`
- **Purpose:** Initiates citizen login by generating a cryptographically random 6-digit OTP stored in MongoDB with 5m TTL.
- **Authentication:** Public
- **Rate Limit:** 15 requests / minute
- **Request Body:**
  ```json
  {
    "phone": "9876543212"
  }
  ```
- **Success Response (HTTP 200):**
  ```json
  {
    "success": true,
    "message": "OTP sent successfully",
    "data": {
      "phone": "9876543212",
      "expiresInSeconds": 300,
      "devOtpPreview": "493933"
    }
  }
  ```
- **Error Codes:** `INVALID_PHONE` (400), `RATE_LIMITED` (429).

---

### 2.2 Verify Citizen OTP
- **Method:** `POST`
- **Path:** `/auth/citizen/verify-otp`
- **Purpose:** Verifies the 6-digit OTP code, creates or retrieves citizen profile, and issues JWT access and refresh tokens.
- **Authentication:** Public
- **Request Body:**
  ```json
  {
    "phone": "9876543212",
    "otp": "493933",
    "name": "Basavaraj Patil",
    "village": "Rampura",
    "ward": "Ward 4"
  }
  ```
- **Success Response (HTTP 200):**
  ```json
  {
    "success": true,
    "message": "Authentication successful",
    "data": {
      "user": {
        "id": "60d0fe4f5311236168a109ca",
        "phone": "9876543212",
        "name": "Basavaraj Patil",
        "role": "CITIZEN",
        "isActive": true
      },
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "4a7b9c1d..."
    }
  }
  ```
- **Error Codes:** `INVALID_OTP` (401), `OTP_EXPIRED` (401), `MAX_ATTEMPTS_EXCEEDED` (429).

---

### 2.3 Staff Email/Password Login
- **Method:** `POST`
- **Path:** `/auth/staff/login`
- **Purpose:** Authenticates Volunteers, Department Officials, and Administrators using email and salted bcrypt password.
- **Authentication:** Public
- **Rate Limit:** 15 requests / minute
- **Request Body:**
  ```json
  {
    "email": "official@vcgis.gov.in",
    "password": "Official@12345"
  }
  ```
- **Success Response (HTTP 200):**
  ```json
  {
    "success": true,
    "message": "Staff login successful",
    "data": {
      "user": {
        "id": "60d0fe4f5311236168a109cb",
        "email": "official@vcgis.gov.in",
        "role": "OFFICIAL",
        "officialProfile": {
          "department": "Rural Development & Panchayat Raj",
          "designation": "Executive Engineer",
          "jurisdictionDistrict": "Mysuru"
        }
      },
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "9f8e7d6c..."
    }
  }
  ```
- **Error Codes:** `INVALID_CREDENTIALS` (401), `USER_INACTIVE` (403).

---

### 2.4 Refresh Access Token
- **Method:** `POST`
- **Path:** `/auth/refresh`
- **Purpose:** Rotates a valid 7-day refresh token to issue a new 15-minute access token and new refresh token.
- **Authentication:** Public (Refresh Token payload required)
- **Request Body:**
  ```json
  {
    "refreshToken": "4a7b9c1d..."
  }
  ```
- **Success Response (HTTP 200):**
  ```json
  {
    "success": true,
    "data": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "1a2b3c4d..."
    }
  }
  ```
- **Error Codes:** `INVALID_REFRESH_TOKEN` (401), `TOKEN_EXPIRED` (401).

---

### 2.5 Current Authenticated User Profile
- **Method:** `GET`
- **Path:** `/auth/me`
- **Purpose:** Retrieves the current authenticated user profile and permissions from JWT payload.
- **Authentication:** Bearer JWT (Any Role)
- **Success Response (HTTP 200):**
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "60d0fe4f5311236168a109ca",
        "name": "Basavaraj Patil",
        "phone": "9876543212",
        "role": "CITIZEN"
      }
    }
  }
  ```

---

## 3. Complaint & Citizen API Module (`/complaints`)

### 3.1 Get Department Categories
- **Method:** `GET`
- **Path:** `/complaints/categories`
- **Purpose:** Lists all 11 Karnataka government departments, categories, and subcategories.
- **Authentication:** Public

---

### 3.2 Lodge Grievance (Multipart Upload)
- **Method:** `POST`
- **Path:** `/complaints`
- **Purpose:** Submits a new grievance with optional file evidence (up to 5 files, 10MB each) and GPS coordinates.
- **Authentication:** Bearer JWT (`CITIZEN`, `VOLUNTEER`, `ADMIN`)
- **Content-Type:** `multipart/form-data`
- **Form Fields:**
  - `department`: (String) e.g., "Rural Water Supply"
  - `category`: (String) e.g., "Drinking Water"
  - `title`: (String, 5–100 chars)
  - `description`: (String, 10–2000 chars)
  - `village`: (String)
  - `district`: (String) e.g., "Mysuru"
  - `latitude`: (Float, optional) e.g., 12.2958
  - `longitude`: (Float, optional) e.g., 76.6394
  - `files`: (File array, max 5)
- **Success Response (HTTP 201):**
  ```json
  {
    "success": true,
    "message": "Grievance registered successfully",
    "data": {
      "id": "60d0fe4f5311236168a109cd",
      "complaintNumber": "CMP-2026-00042",
      "status": "SUBMITTED",
      "priority": "HIGH",
      "sla": {
        "targetResolutionDate": "2026-09-15T09:00:00.000Z",
        "status": "ON_TRACK"
      }
    }
  }
  ```

---

### 3.3 Get My Grievances
- **Method:** `GET`
- **Path:** `/complaints/my`
- **Purpose:** Retrieves grievances submitted by or assigned to the authenticated citizen.
- **Authentication:** Bearer JWT (`CITIZEN`)

---

### 3.4 Get Grievance Dossier by ID
- **Method:** `GET`
- **Path:** `/complaints/:id`
- **Purpose:** Retrieves complete complaint dossier including evidence files, SLA status, verification reports, and AI insights.
- **Authentication:** Bearer JWT (Owner, Official of same department, or Admin)

---

### 3.5 Submit Satisfaction Feedback
- **Method:** `POST`
- **Path:** `/complaints/:id/feedback`
- **Purpose:** Allows citizen to submit a 1 to 5 star rating and feedback remarks once a grievance is `RESOLVED`.
- **Authentication:** Bearer JWT (Citizen Owner)
- **Request Body:**
  ```json
  {
    "rating": 5,
    "remarks": "Borewell pump replaced promptly within 24 hours. Excellent response."
  }
  ```

---

### 3.6 Reopen Resolved Grievance
- **Method:** `POST`
- **Path:** `/complaints/:id/reopen`
- **Purpose:** Reopens an unresolved grievance within 7 days of resolution, escalating back to official review.
- **Authentication:** Bearer JWT (Citizen Owner)
- **Request Body:**
  ```json
  {
    "reason": "Water pipeline started leaking again immediately after team left."
  }
  ```

---

## 4. Village Volunteer API Module (`/volunteers`)

### 4.1 Register Rural Citizen
- **Method:** `POST`
- **Path:** `/volunteers/citizens`
- **Purpose:** Onboards a non-tech-literate citizen without smartphone access.
- **Authentication:** Bearer JWT (`VOLUNTEER`, `ADMIN`)
- **Request Body:**
  ```json
  {
    "name": "Ningappa Gowda",
    "phone": "9845012345",
    "village": "Rampura",
    "ward": "Ward 2",
    "gramPanchayat": "Rampura GP",
    "district": "Mysuru"
  }
  ```

---

### 4.2 Search Registered Citizens
- **Method:** `GET`
- **Path:** `/volunteers/citizens?query=9845012345`
- **Purpose:** Look up citizen profile by phone number or name before filing assisted grievances.
- **Authentication:** Bearer JWT (`VOLUNTEER`, `ADMIN`)

---

### 4.3 Submit On-Site Field Verification
- **Method:** `POST`
- **Path:** `/volunteers/complaints/:id/verify`
- **Purpose:** Records volunteer 4-point on-site inspection checklist, determination, and photo proof.
- **Authentication:** Bearer JWT (`VOLUNTEER`, `ADMIN`)
- **Content-Type:** `multipart/form-data`
- **Form Fields:**
  - `result`: "VERIFIED" | "REJECTED" | "REQUIRES_INFO"
  - `notes`: (String) Ground observations
  - `citizenIdentified`: "true"
  - `incidentConfirmed`: "true"
  - `evidenceValid`: "true"
  - `severityMatches`: "true"
  - `photos`: (Files, max 5)

---

## 5. Department Official API Module (`/officials`)

### 5.1 Official Dashboard Operational Metrics
- **Method:** `GET`
- **Path:** `/officials/metrics`
- **Purpose:** Computes the 7 key operational metrics for the official's assigned department.
- **Authentication:** Bearer JWT (`OFFICIAL`, `ADMIN`)

---

### 5.2 Department Isolated Work Queue
- **Method:** `GET`
- **Path:** `/officials/queue?status=UNDER_REVIEW&priority=CRITICAL&page=1`
- **Purpose:** Fetches filtered work queue isolated strictly to the official's department.
- **Authentication:** Bearer JWT (`OFFICIAL`, `ADMIN`)

---

### 5.3 Resolve Grievance (Mandatory Photo Proof)
- **Method:** `POST`
- **Path:** `/officials/complaints/:id/resolve`
- **Purpose:** Marks grievance as `RESOLVED`. Strictly requires resolution summary and photo attachments.
- **Authentication:** Bearer JWT (`OFFICIAL`, `ADMIN`)
- **Content-Type:** `multipart/form-data`
- **Form Fields:**
  - `summary`: "Installed new 63kVA transformer, restored full power"
  - `contractor`: "Sri Manjunatha Electricals"
  - `materialsUsed`: "63kVA Transformer, 3x LT Fuse carriers"
  - `photos`: (Files, min 1, max 5)

---

### 5.4 Statutory Rejection Endorsement
- **Method:** `POST`
- **Path:** `/officials/complaints/:id/reject`
- **Purpose:** Formally rejects an ineligible grievance with statutory legal justification.
- **Authentication:** Bearer JWT (`OFFICIAL`, `ADMIN`)
- **Request Body:**
  ```json
  {
    "rejectionReason": "Private agricultural boundary dispute; sub judice in civil court."
  }
  ```

---

## 6. SLA & Escalation API Module (`/sla`)

### 6.1 SLA Compliance & Performance Analytics
- **Method:** `GET`
- **Path:** `/sla/analytics`
- **Purpose:** Calculates compliance percentage, breach percentage, and average resolution hours across all departments and priorities.
- **Authentication:** Bearer JWT (`OFFICIAL`, `ADMIN`)

---

### 6.2 Trigger Autonomous SLA Sweep
- **Method:** `POST`
- **Path:** `/sla/sweep`
- **Purpose:** Executes automated system sweep across all active complaints: sends warning alerts for cases expiring in <24h and escalates breached cases (L1 &rarr; L2 &rarr; L3).
- **Authentication:** Bearer JWT (`ADMIN`)

---

## 7. AI Intelligence API Module (`/ai`)

### 7.1 Unified AI Complaint Analysis
- **Method:** `POST`
- **Path:** `/ai/analyze`
- **Purpose:** Single-call comprehensive pipeline executing OCR, entity extraction, department classification, urgency scoring, and duplicate check.
- **Authentication:** Bearer JWT (Any Role)
- **Request Body:**
  ```json
  {
    "title": "Borewell pump burnt near GP office",
    "description": "Drinking water has stopped for 500 families in Ward 3 since Friday.",
    "district": "Mysuru"
  }
  ```

---

### 7.2 Optical Character Recognition (OCR)
- **Method:** `POST`
- **Path:** `/ai/ocr`
- **Purpose:** Extracts text stream from base64 PDF or image with confidence score.
- **Authentication:** Bearer JWT (Any Role)

---

### 7.3 Duplicate & Similarity Detection
- **Method:** `POST`
- **Path:** `/ai/duplicates`
- **Purpose:** Computes TF-IDF cosine similarity and 2km Haversine distance matches against existing active complaints.
- **Authentication:** Bearer JWT (Any Role)

---

## 8. Generative AI Decision Support API Module (`/genai`)

### 8.1 Citizen Conversational Drafting Assistant
- **Method:** `POST`
- **Path:** `/genai/citizen/assist`
- **Purpose:** Structures plain conversational user input into a formal title, petition statement, and recommended department.
- **Authentication:** Bearer JWT (Any Role)

---

### 8.2 Volunteer 4-Part Petition Structuring
- **Method:** `POST`
- **Path:** `/genai/volunteer/structure`
- **Purpose:** Formulates raw field notes into: Incident Summary, Location Specifics, Observed Impact, and Formal Petition Text.
- **Authentication:** Bearer JWT (`VOLUNTEER`, `ADMIN`)

---

### 8.3 Official Sakala Resolution Letter Drafting
- **Method:** `POST`
- **Path:** `/genai/official/draft-response`
- **Purpose:** Drafts formal citizen closure letters, SMS notifications, and technical inspection checklists.
- **Authentication:** Bearer JWT (`OFFICIAL`, `ADMIN`)

---

### 8.4 Multilingual Civic Translation (Kannada &harr; English)
- **Method:** `POST`
- **Path:** `/genai/translate`
- **Purpose:** Bidirectional translation across 45+ civic and governance vocabulary terms.
- **Authentication:** Bearer JWT (Any Role)

---

## 9. RAG Knowledge System API Module (`/rag`)

### 9.1 Query Grounded Knowledge
- **Method:** `POST`
- **Path:** `/rag/query`
- **Purpose:** Semantic legal retrieval against active Karnataka Government Orders with strict source citations and anti-hallucination disclaimers.
- **Authentication:** Bearer JWT (Any Role)
- **Request Body:**
  ```json
  {
    "query": "What is the Sakala timeline for repairing street lights in rural areas?",
    "departmentFilter": "Rural Development"
  }
  ```

---

### 9.2 Ingest Karnataka Government Order (Admin)
- **Method:** `POST`
- **Path:** `/rag/documents`
- **Purpose:** Ingests and semantically chunks an authoritative Karnataka circular or scheme manual.
- **Authentication:** Bearer JWT (`ADMIN`)

---

## 10. Analytics & GIS Intelligence API Module (`/analytics`)

### 10.1 Geographic Intelligence & Section 32 Zero-PII Hotspots
- **Method:** `GET`
- **Path:** `/analytics/geo`
- **Purpose:** Returns 31 district coordinates, incident centroid pins, and cluster hotspots. Strictly suppresses all citizen PII.
- **Authentication:** Bearer JWT (`OFFICIAL`, `ADMIN`)

---

### 10.2 11 Karnataka Department Performance Matrix
- **Method:** `GET`
- **Path:** `/analytics/departments`
- **Purpose:** Comparative ranking of all 11 state departments with Sakala compliance percentages and letter grades (A+ to D).
- **Authentication:** Bearer JWT (`OFFICIAL`, `ADMIN`)

---

### 10.3 RFC 4180 Standard CSV Export
- **Method:** `GET`
- **Path:** `/analytics/export/csv`
- **Purpose:** Streams audit-ready CSV of grievances with proper quotes, CRLF line endings, and PII masking.
- **Authentication:** Bearer JWT (`OFFICIAL`, `ADMIN`)

---

## 11. Administrator Governance API Module (`/admin`)

### 11.1 List & Filter Users
- **Method:** `GET`
- **Path:** `/admin/users?role=VOLUNTEER&status=ACTIVE&search=Mysuru`
- **Purpose:** Search and filter state user roster.
- **Authentication:** Bearer JWT (`ADMIN`)

---

### 11.2 Department SLA Threshold Adjustment
- **Method:** `PATCH`
- **Path:** `/admin/departments/:id/sla`
- **Purpose:** Reconfigures statutory SLA resolution hours for Critical, High, Medium, and Low priorities.
- **Authentication:** Bearer JWT (`ADMIN`)
- **Request Body:**
  ```json
  {
    "defaultSlaHours": {
      "CRITICAL": 24,
      "HIGH": 48,
      "MEDIUM": 120,
      "LOW": 240
    }
  }
  ```

---

### 11.3 Cross-System Audit Log Explorer
- **Method:** `GET`
- **Path:** `/admin/audit?actorRole=OFFICIAL&entityType=COMPLAINT`
- **Purpose:** Deep query of immutable audit log collection.
- **Authentication:** Bearer JWT (`ADMIN`)
