"""Summarization router."""

from fastapi import APIRouter
from app.schemas.ai import SummarizeRequest, SummarizeResponse
from app.services.summarizer_service import summarizer_service

router = APIRouter(prefix="/summarize", tags=["Summarize"])


@router.post("", response_model=SummarizeResponse)
async def summarize_complaint(req: SummarizeRequest):
    """Generate concise factual summary without hallucinations."""
    return summarizer_service.summarize(req)
