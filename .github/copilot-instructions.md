# Copilot Instructions — VCGIS

This repo uses a shared `.ai/` project intelligence system. Follow the protocol in `AGENTS.md`.

## Before coding

1. Run `.ai/bin/ai-project sync`
2. Run `.ai/bin/ai-project context "<task>"`
3. Read only recommended files

## Architecture

- **Frontend:** React + TypeScript + Vite + Tailwind CSS (`frontend/`)
- **Backend:** Node.js + Express + TypeScript (`backend/`)
- **AI Service:** Python + FastAPI (`ai-service/`)
- **Database:** MongoDB
- **Shared types:** `shared/types/`

## Conventions

- Backend: route → controller → service → repository → model
- Frontend: pages/<Role>/<Feature>, components/{ui,layout,common}
- API base: `/api`
- All endpoints require auth + RBAC (except /health, /login, /signup)

## After coding

1. Run tests
2. Run `.ai/bin/ai-project sync`
3. Run `.ai/bin/ai-project record-change --confirm --task "<task>"`
