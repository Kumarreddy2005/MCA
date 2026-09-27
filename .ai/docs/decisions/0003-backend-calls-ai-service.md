# ADR 0003 — Backend Proxies All AI Calls

## Status
Accepted

## Context
The AI service has no authentication of its own; the frontend holds JWTs issued by the backend.

## Decision
The frontend never calls ai-service directly. All AI endpoints are exposed under `/api/v1/ai/*` and proxied by backend/src/services/ai.service.ts.

## Consequences
- ai-service can stay unauthenticated inside the private network (docker-compose).
- Adding an AI capability requires: ai-service controller/service + backend proxy route + frontend service function.
- Latency doubles per AI call; keep ai-service responses fast or make analysis async.
