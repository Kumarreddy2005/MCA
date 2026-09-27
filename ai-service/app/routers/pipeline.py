"""Unified Complaint Analysis Pipeline Router."""

from fastapi import APIRouter
from app.schemas.ai import (
    AnalyzeComplaintRequest,
    AnalyzeComplaintResponse,
    ClassifyRequest,
    PriorityRequest,
    SimilarityRequest,
    SummarizeRequest,
)
from app.services.classifier_service import classifier_service
from app.services.nlp_service import nlp_service
from app.services.ocr_service import ocr_service
from app.services.priority_service import priority_service
from app.services.similarity_service import similarity_service
from app.services.summarizer_service import summarizer_service

router = APIRouter(prefix="", tags=["Pipeline"])


@router.post("/analyze-complaint", response_model=AnalyzeComplaintResponse)
async def analyze_complaint(req: AnalyzeComplaintRequest):
    """Unified pipeline: runs OCR, NLP, classification, priority, similarity, and summary."""
    ocr_res = None
    augmented_description = req.description

    # 1. OCR if document provided
    if req.document_base64:
        ocr_res = ocr_service.extract(
            file_base64=req.document_base64,
            mime_type=req.document_mime_type or "application/pdf"
        )
        if ocr_res.success and ocr_res.extracted_text and not ocr_res.is_low_confidence:
            augmented_description = f"{req.description}\n\n[Extracted Petition Text]: {ocr_res.extracted_text}"

    # 2. NLP Analysis
    full_text = f"{req.title} {augmented_description}"
    nlp_res = nlp_service.analyze(full_text)

    # 3. Department Classification
    classify_res = classifier_service.classify(
        title=req.title,
        description=augmented_description,
        selected_category=req.category
    )

    # 4. Priority Assessment
    priority_res = priority_service.evaluate(
        title=req.title,
        description=augmented_description,
        category=req.category or classify_res.primary_department
    )

    # 5. Similarity & Duplicate Candidate Analysis
    similarity_res = similarity_service.detect_similarity(
        SimilarityRequest(
            title=req.title,
            description=req.description,
            category=req.category or classify_res.primary_department,
            latitude=req.latitude,
            longitude=req.longitude,
            village=req.village,
            taluk=req.taluk,
            existing_complaints=req.existing_complaints,
            threshold=0.65
        )
    )

    # 6. Factual Summarization
    location_desc = ", ".join(filter(None, [req.village, req.taluk, req.district]))
    summary_res = summarizer_service.summarize(
        SummarizeRequest(
            title=req.title,
            description=req.description,
            category=classify_res.primary_department,
            location_name=location_desc
        )
    )

    return AnalyzeComplaintResponse(
        success=True,
        ocr=ocr_res,
        nlp=nlp_res,
        classification=classify_res,
        priority=priority_res,
        similarity=similarity_res,
        summary=summary_res
    )
