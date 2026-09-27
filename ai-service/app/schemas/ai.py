"""Pydantic schemas for AI microservice requests and responses."""

from typing import Any, List, Optional
from pydantic import BaseModel, Field


# ─── OCR Schemas ─────────────────────────────────────────────
class OCRRequest(BaseModel):
    """Request payload for OCR extraction when text or base64 file is provided."""
    file_base64: Optional[str] = Field(None, description="Base64 encoded file content (PDF or image)")
    mime_type: Optional[str] = Field("application/pdf", description="MIME type (e.g. application/pdf, image/png, image/jpeg)")
    text_content: Optional[str] = Field(None, description="Direct text input if already extracted or digital petition")


class OCRResponse(BaseModel):
    success: bool = True
    extracted_text: str = ""
    confidence: float = Field(..., ge=0.0, le=1.0)
    is_low_confidence: bool = False
    page_count: int = 1
    language: str = "en"
    metadata: dict[str, Any] = Field(default_factory=dict)


# ─── NLP & Entity Extraction Schemas ─────────────────────────
class EntityItem(BaseModel):
    text: str
    type: str  # LOCATION, TALUK, GRAM_PANCHAYAT, DISTRICT, DATE, PHONE, PERSON, FACILITY


class NLPRequest(BaseModel):
    text: str = Field(..., min_length=3, description="Complaint text or petition content")


class NLPResponse(BaseModel):
    success: bool = True
    intent: str  # REPORT_HAZARD, INFRASTRUCTURE_FAILURE, SERVICE_DISRUPTION, CORRUPTION_COMPLAINT, WELFARE_APPLICATION
    entities: List[EntityItem] = Field(default_factory=list)
    urgency_indicators: List[str] = Field(default_factory=list)
    keywords: List[str] = Field(default_factory=list)
    detected_language: str = "en"  # "en", "kn", "mixed"


# ─── Department Classification Schemas ───────────────────────
class DepartmentRecommendation(BaseModel):
    department: str
    confidence: float = Field(..., ge=0.0, le=1.0)


class ClassifyRequest(BaseModel):
    title: str
    description: str
    selected_category: Optional[str] = None


class ClassifyResponse(BaseModel):
    success: bool = True
    primary_department: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    sub_category: Optional[str] = None
    alternative_departments: List[DepartmentRecommendation] = Field(default_factory=list)
    needs_volunteer_review: bool = False
    clarification_required: bool = False
    possible_categories: List[str] = Field(default_factory=list)


# ─── Urgency & Priority Schemas ──────────────────────────────
class PriorityRequest(BaseModel):
    title: str
    description: str
    category: Optional[str] = None


class PriorityResponse(BaseModel):
    success: bool = True
    suggested_priority: str  # CRITICAL, HIGH, MEDIUM, LOW
    urgency_score: int = Field(..., ge=0, le=100)
    reasoning: List[str] = Field(default_factory=list)
    safety_factors: List[str] = Field(default_factory=list)


# ─── Similarity & Duplicate Detection Schemas ────────────────
class CandidateComplaint(BaseModel):
    id: str
    complaint_number: str
    title: str
    description: str
    category: Optional[str] = None
    status: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    village: Optional[str] = None
    taluk: Optional[str] = None


class SimilarityMatch(BaseModel):
    id: str
    complaint_number: str
    title: str
    similarity_score: float = Field(..., ge=0.0, le=1.0)
    text_similarity: float = Field(..., ge=0.0, le=1.0)
    location_proximity_score: float = Field(0.0, ge=0.0, le=1.0)
    match_reasons: List[str] = Field(default_factory=list)


class SimilarityRequest(BaseModel):
    title: str
    description: str
    category: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    village: Optional[str] = None
    taluk: Optional[str] = None
    existing_complaints: List[CandidateComplaint] = Field(default_factory=list)
    threshold: float = Field(0.65, ge=0.0, le=1.0)


class SimilarityResponse(BaseModel):
    success: bool = True
    is_duplicate_candidate: bool = False
    highest_similarity_score: float = 0.0
    match_count: int = 0
    matches: List[SimilarityMatch] = Field(default_factory=list)


# ─── Summarization Schemas ───────────────────────────────────
class SummarizeRequest(BaseModel):
    title: str
    description: str
    category: Optional[str] = None
    location_name: Optional[str] = None


class SummarizeResponse(BaseModel):
    success: bool = True
    summary: str
    key_points: List[str] = Field(default_factory=list)


# ─── Unified Analysis Pipeline Schemas ───────────────────────
class AnalyzeComplaintRequest(BaseModel):
    title: str
    description: str
    category: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    village: Optional[str] = None
    taluk: Optional[str] = None
    district: Optional[str] = None
    document_base64: Optional[str] = None
    document_mime_type: Optional[str] = None
    existing_complaints: List[CandidateComplaint] = Field(default_factory=list)


class AnalyzeComplaintResponse(BaseModel):
    success: bool = True
    ocr: Optional[OCRResponse] = None
    nlp: NLPResponse
    classification: ClassifyResponse
    priority: PriorityResponse
    similarity: SimilarityResponse
    summary: SummarizeResponse
