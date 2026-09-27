# ADR 0001 — Three-Service Architecture

## Status
Accepted

## Context
The platform needs a web UI, a transactional REST API with auth and persistence, and heavy Python-only ML/NLP dependencies (spaCy, sentence-transformers, tesseract) that cannot share a Node.js runtime.

## Decision
Split into three independently deployable services:
- `frontend/` — React 19 + Vite SPA
- `backend/` — Express + TypeScript + MongoDB (source of business truth and auth)
- `ai-service/` — FastAPI Python microservice for OCR/NLP/clustering

Each has its own Dockerfile/docker-compose.

## Consequences
- AI failures must not block complaint registration (backend must degrade gracefully).
- Cross-service contracts are internal HTTP APIs (backend → ai-service).
- Only ai-service has tests today; contract drift is a real risk.
