# VCGIS Phase 1 — Three-Department Normalization

Status: IMPLEMENTED IN WRITABLE WORKSPACE

## Canonical operational departments
- ROAD — Roads & Transport
- ELECTRICITY — Electricity & Power
- WATER — Water Supply

Legacy department values are retained only as normalization aliases where mapping is unambiguous. Existing legacy Department records are deactivated by the development seed; historical records are not deleted.

## Role foundation
Added `DEPARTMENT_STAFF` to backend/shared/frontend role definitions and provisioning validation. The full Department Staff portal is intentionally deferred to the next phase.

## Complaint compatibility
The existing 19-status lifecycle remains unchanged. Complaints now support a canonical `departmentCode` while retaining the existing display-name field for backward compatibility.

## AI foundation
The existing rule-based baseline now emits only ROAD, ELECTRICITY, WATER, UNCERTAIN, or OUT_OF_SCOPE. Existing response fields remain compatible, with additional uncertainty fields:
- needs_volunteer_review
- clarification_required
- possible_categories

This is explicitly a baseline, not supervised ML. Supervised ML is deferred to Phase 2.

## Routing/security
New complaint routing and official department isolation use canonical department codes, with legacy normalization fallback.

## Validation performed
- Python syntax compilation for AI schema/classifier: PASS
- Direct classifier smoke tests for Road, Electricity, Water, Uncertain, Out-of-scope: PASS
- Backend TypeScript build could not be completed because the workspace dependency installation was incomplete/transport-timed-out; `npm run build` reported missing type-definition packages rather than a confirmed source-code error.

## Deferred
- Supervised ML training/evaluation
- Full Volunteer Review Gate
- Department Staff dashboard
- Full SLA hardcoded-deadline correction
- Fabricated analytics fallback removal
- Complete OCR implementation
