"""Similarity and duplicate detection router."""

from fastapi import APIRouter
from app.schemas.ai import SimilarityRequest, SimilarityResponse
from app.services.similarity_service import similarity_service

router = APIRouter(prefix="/similarity", tags=["Similarity"])


@router.post("", response_model=SimilarityResponse)
async def detect_similarity(req: SimilarityRequest):
    """Detect textual and geographic similarity against existing grievances."""
    return similarity_service.detect_similarity(req)
