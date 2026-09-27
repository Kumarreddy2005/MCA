"""OCR router for petition document text extraction."""

from fastapi import APIRouter
from app.schemas.ai import OCRRequest, OCRResponse
from app.services.ocr_service import ocr_service

router = APIRouter(prefix="/ocr", tags=["OCR"])


@router.post("", response_model=OCRResponse)
async def extract_document_ocr(req: OCRRequest):
    """Extract text from uploaded petition documents (PDF / Image) with confidence scoring."""
    return ocr_service.extract(
        file_base64=req.file_base64,
        mime_type=req.mime_type,
        text_content=req.text_content
    )
