# VCGIS Automated Testing Suite & Verification Guide

## Test Suite Overview

The VCGIS application maintains testing across all three microservice layers:

| Layer | Test Framework / Command | Coverage Areas | Status |
| :--- | :--- | :--- | :--- |
| **Frontend** | `npm run typecheck` (Vite / TypeScript 5) | Component types, props, API client contracts, route guards | **PASSED** (0 errors) |
| **Backend API** | `npm run typecheck` (tsc) + verification scripts | Controllers, services, Mongoose schemas, RBAC middleware | **PASSED** (0 errors) |
| **AI Microservice** | `pytest ai-service/tests` | NLP, OCR, department classifier, duplicate similarity, RAG | **PASSED** (29/29 tests) |

---

## Running Test Verification Commands

### 1. Frontend Typecheck
```bash
cd frontend
npm run typecheck
```

### 2. Backend Typecheck
```bash
cd backend
npm run typecheck
```

### 3. AI Service Pytest Suite
```bash
$env:PYTHONIOENCODING="utf-8"
ai-service\.venv\Scripts\python.exe -m pytest ai-service/tests
```

### 4. Retrain AI Models & Calibrate Uncertainty
```bash
$env:PYTHONIOENCODING="utf-8"
ai-service\.venv\Scripts\python.exe ai-service/scripts/train_models.py
```
