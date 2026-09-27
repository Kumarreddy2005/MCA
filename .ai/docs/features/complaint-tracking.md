# Citizen Complaint Submission & Tracking

RELATED FEATURES: complaint-registration, complaint-tracking, frontend-shell
RELATED COMPONENTS: complaint.controller, complaint.routes, complaint.model, upload.middleware, CitizenDashboard, GrievanceCard, CreateGrievanceModal, GrievanceDetailModal
RELATED APIs: POST /api/complaints, GET /api/complaints/my, GET /api/complaints/categories, GET /api/complaints/:id, POST /api/complaints/:id/feedback, POST /api/complaints/:id/reopen
RELATED COLLECTIONS: complaints

## Flow

1. **Grievance Registration:**
   - Citizen logs in using 6-digit OTP.
   - Enters complaint title, detailed description, department, category, and locality (Village, Ward, Mandal, District, Pincode).
   - Optional browser GPS auto-capture attaches precise latitude/longitude coordinates.
   - Evidence files (photos/PDFs) are uploaded via multipart form data, sanitized, and stored under `/uploads/evidence/` with size and MIME validation.
   - Auto-generates human-readable tracking ID (`CMP-YYYY-XXXXX`) and calculates SLA target date.
   - Appends initial `SUBMITTED` event to the grievance timeline.

2. **Tracking & Timeline:**
   - Citizen dashboard displays KPI statistics (Total, Pending, In Progress, Resolved).
   - Filterable pills by status and text search bar for quick retrieval.
   - Inspecting a grievance shows the complete chronological audit timeline with status changes, actor roles, remarks, and attached evidence viewers.

3. **Resolution Feedback & Reopen:**
   - When marked resolved, citizen can rate satisfaction (1-5 stars) and submit review comments.
   - If ground resolution is unsatisfactory, citizen can reopen the complaint with formal justification.
