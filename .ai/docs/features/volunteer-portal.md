# Feature: Village Volunteer Portal & Assisted Access Layer

## Overview
The Village Volunteer Portal fulfills the foundational architecture decision [ADR 0002 — Volunteer as Human-in-the-Loop Access Layer](file:///.ai/docs/decisions/0002-volunteer-human-in-loop.md). It empowers grassroots village volunteers to onboard rural citizens without digital access, register grievances on their behalf, conduct physical on-site field verifications, manage their village cluster work queue, and utilize AI drafting tools.

## Key Capabilities

### 1. Assisted Citizen Onboarding
- Volunteers register rural citizens with minimal data friction: Full Name, 10-digit Indian Mobile Number, Village, Ward, Mandal, District, Pincode, and Door/House landmark.
- Automatically marks the citizen profile as verified in the volunteer's assigned cluster (`UserRole.CITIZEN`).

### 2. On-Behalf Complaint Submission
- Volunteers file grievances on behalf of registered villagers with source tagged as `VOLUNTEER_ASSISTED`.
- Captures colloquial verbal statements, attaches photographic/documentary evidence, and auto-detects high-accuracy GPS coordinates.
- Supports optional immediate on-site verification during grievance intake.

### 3. On-Site Field Verification
- Volunteers physically inspect reported incidents in their assigned village/ward cluster.
- Implements a 4-point verification checklist:
  1. Citizen identity & residence confirmed in person
  2. Physical ground inspection conducted at the reported spot
  3. Supporting evidence/photographs authentic and matching reality
  4. Severity and requested departmental intervention verified
- Structured verification decision: `VERIFIED` (transitions complaint to `VERIFIED`), `REQUIRES_INFO` (transitions to `INFORMATION_REQUIRED`), or `REJECTED` (transitions to `REJECTED`).
- Stores inspector field notes, GPS inspection coordinates, and timestamped audit entries in the chronological timeline.

### 4. Cluster Work Queue & Dashboard
- Work queue filtered to complaints in the volunteer's assigned jurisdiction (`assignedVillage`, `assignedWard`).
- Real-time KPI summary cards: Registered Citizens, Pending Verifications, Cluster Grievances, and Urgent/Critical complaints.
- Tabbed interface separating active verification tasks, cluster grievances, and the citizen directory.

### 5. Volunteer AI Grievance Assistant
- Structuring tool that ingests informal, dialectal, or rough colloquial citizen verbal statements.
- Generates formal administrative titles, departmental grievance descriptions, category/department mappings, priority recommendations, and a missing information checklist.

## API Endpoints

| Method | Endpoint | Description | Guard |
|---|---|---|---|
| `POST` | `/api/volunteers/citizens` | Register a new villager or update profile | `VOLUNTEER`, `ADMIN` |
| `GET` | `/api/volunteers/citizens` | Search citizens by phone/name in cluster | `VOLUNTEER`, `ADMIN` |
| `POST` | `/api/volunteers/complaints` | File assisted grievance with multipart evidence | `VOLUNTEER`, `ADMIN` |
| `GET` | `/api/volunteers/work-queue` | Get cluster complaints, verification queue & KPIs | `VOLUNTEER`, `ADMIN` |
| `POST` | `/api/volunteers/complaints/:id/verify` | Submit on-site field verification checklist & photos | `VOLUNTEER`, `ADMIN` |
| `POST` | `/api/volunteers/assistant` | AI verbal statement structurer & prompt generator | `VOLUNTEER`, `ADMIN` |
