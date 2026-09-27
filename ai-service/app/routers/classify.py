"""Department classification router."""

from fastapi import APIRouter
from app.schemas.ai import ClassifyRequest, ClassifyResponse
from app.services.classifier_service import classifier_service

router = APIRouter(prefix="/classify", tags=["Classification"])


@router.post("", response_model=ClassifyResponse)
async def classify_department(req: ClassifyRequest):
    """Classify grievance into three operational departments with confidence & alternatives."""
    return classifier_service.classify(
        title=req.title,
        description=req.description,
        selected_category=req.selected_category
    )
