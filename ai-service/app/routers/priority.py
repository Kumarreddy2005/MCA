"""Urgency scoring and priority recommendation router."""

from fastapi import APIRouter
from app.schemas.ai import PriorityRequest, PriorityResponse
from app.services.priority_service import priority_service

router = APIRouter(prefix="/priority", tags=["Priority"])


@router.post("", response_model=PriorityResponse)
async def evaluate_priority(req: PriorityRequest):
    """Evaluate grievance urgency score (0-100) and suggested priority level."""
    return priority_service.evaluate(
        title=req.title,
        description=req.description,
        category=req.category
    )
