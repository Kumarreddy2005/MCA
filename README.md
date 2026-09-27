# VCGIS — Village Volunteer-Assisted Citizen Grievance Intelligence System

A digital grievance-management platform connecting citizens, village volunteers, government department officials, and administrators through a centralized complaint-management and AI intelligence system.

## Architecture

```
Frontend (React + TypeScript + Vite + Tailwind CSS)
    ↓
Backend API (Node.js + Express + TypeScript)
    ↓
┌───────────────┐
│               │
MongoDB      AI Service (Python + FastAPI)
│               │
└───────┬───────┘
        ↓
     Storage
```

## Quick Start

### Prerequisites

- Node.js >= 22
- Python >= 3.11
- MongoDB (local or Atlas)

### Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your configuration
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### AI Service

```bash
cd ai-service
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Project Structure

```
├── .ai/              # Project intelligence (multi-agent development)
├── frontend/         # React SPA
├── backend/          # Express REST API
├── ai-service/       # FastAPI AI microservice
├── shared/           # Shared TypeScript types
├── docs/             # Documentation
├── AGENTS.md         # Multi-agent entry point
└── CLAUDE.md         # Claude Code entry point
```

## Development

See [requirements](/.ai/project/requirements.md) for the complete specification.

See [AGENTS.md](/AGENTS.md) for multi-agent development protocol.

## License

Private — All rights reserved.
