"""
VCGIS AI Service — Village Volunteer-Assisted Citizen Grievance Intelligence System

FastAPI microservice providing AI capabilities:
- OCR (Phase 7)
- NLP Analysis (Phase 7)
- Classification (Phase 7)
- Priority Intelligence (Phase 7)
- Similarity Detection (Phase 7)
- Department Recommendation (Phase 7)
- Summarization (Phase 7)
- GenAI Assistants (Phase 8)
- RAG Knowledge System (Phase 9)
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config.settings import settings
from app.routers import (
    classify,
    genai,
    nlp,
    ocr,
    pipeline,
    priority,
    rag,
    similarity,
    summarize,
)

app = FastAPI(
    title="VCGIS AI Service",
    description="AI Intelligence Layer for the Village Volunteer-Assisted Citizen Grievance Intelligence System",
    version="0.1.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount AI routers under /api/ai
app.include_router(ocr.router, prefix="/api/ai")
app.include_router(nlp.router, prefix="/api/ai")
app.include_router(classify.router, prefix="/api/ai")
app.include_router(priority.router, prefix="/api/ai")
app.include_router(similarity.router, prefix="/api/ai")
app.include_router(summarize.router, prefix="/api/ai")
app.include_router(pipeline.router, prefix="/api/ai")

# Mount GenAI decision support routers under /api/genai
app.include_router(genai.router, prefix="/api/genai")

# Mount RAG knowledge assistant routers under /api/rag
app.include_router(rag.router, prefix="/api/rag")


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "success": True,
        "data": {
            "status": "ok",
            "service": "vcgis-ai-service",
            "version": "0.1.0",
        },
    }


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "success": True,
        "message": "VCGIS AI Service is running",
    }

