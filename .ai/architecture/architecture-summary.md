# VCGIS Architecture

Architecture evidence: (none indexed)

## Frontend

The React/Vite web application provides role-based interfaces for citizens,
village volunteers, department officials, and administrators.

## Backend

The Express/TypeScript application owns authentication, complaint workflows,
REST APIs, notifications, audit behavior, and MongoDB access.

## AI Service

The FastAPI/Python service provides OCR, NLP, location and keyword extraction,
priority prediction, similarity/duplicate detection, routing recommendations,
confidence scoring, and human-review signals.

## Data and Communication

Frontend -> Express backend -> MongoDB. The backend sends complaint data to the
AI service and receives structured analysis results. External notification,
location, and optional file-storage services are integrations around the backend.

## Evidence and Authority

The diagram and PDF are intended-architecture evidence. Source code remains
authoritative for implementation. Use `ai-project architecture-check` to review
matches and unresolved differences.

## Flows

- Complaint registration: actor -> frontend -> backend -> MongoDB.
- AI processing: backend -> FastAPI AI service -> analysis pipeline -> backend.
