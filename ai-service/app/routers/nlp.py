"""NLP router for entity recognition and intent extraction."""

from fastapi import APIRouter
from app.schemas.ai import NLPRequest, NLPResponse
from app.services.nlp_service import nlp_service

router = APIRouter(prefix="/nlp", tags=["NLP"])


@router.post("", response_model=NLPResponse)
async def analyze_nlp(req: NLPRequest):
    """Analyze text for administrative entities, citizen intent, urgency indicators, and keywords."""
    return nlp_service.analyze(req.text)
