# ADR 0002 — Volunteer as Human-in-the-Loop Access Layer

## Status
Accepted

## Context
Rural citizens may lack smartphones, literacy, or connectivity to file digital grievances themselves.

## Decision
Complaints are registered by a Village Volunteer on behalf of the citizen. The volunteer verifies basic citizen information and attaches evidence before submitting to the AI pipeline.

## Consequences
- The registration UI (frontend/src/pages/Volunteer/RegisterComplaint) is the primary write path; citizen self-service login also exists (OTP) but the volunteer flow is primary.
- Citizen identity fields come from the volunteer's input, so backend validation matters.
