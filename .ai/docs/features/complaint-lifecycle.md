# Complaint Lifecycle

RELATED FEATURES: complaint-registration, complaint-tracking
RELATED COMPONENTS: complaint.controller, complaint.service, complaint.repository, complaint.model, RegisterComplaint, VolunteerComplaints, ComplaintDetails, Timeline
RELATED APIs: POST /api/v1/complaints, GET /api/v1/complaints, GET /api/v1/complaints/:id, PATCH /api/v1/complaints/:id/status
RELATED COLLECTIONS: complaints, statushistories

## Flow

1. Volunteer registers complaint on behalf of an existing citizen account (citizen phone + text + optional image/PDF evidence via multer upload).
2. Express resolves the citizen, records `registeredBy`, and calls the AI service through the backend AI client with a five-second timeout.
3. AI returns extracted problem, department, priority, summary, keywords, and cluster → stored as complaint defaults and traceable `aiAnalysis` metadata (model, version, confidence, timestamp).
4. Status transitions recorded in `statushistories` (timeline shown in UI).
5. Department admin reviews, updates status with official remarks; citizen/volunteer track progress.

## Registration API

`POST /api/v1/complaints` accepts multipart form data with `complaintText`,
`citizenPhone` for volunteer registration, optional `pincode`,
`extractedLocation`, and `files`. Citizens may submit without `citizenPhone`;
the authenticated citizen is used. AI failures fall back to the backend's
rule-based analysis and do not prevent complaint creation.

## Status workflow

Submitted → In Review → ... → Resolved (see backend/src/constants/domain.ts and complaint.service.ts for the authoritative list).
