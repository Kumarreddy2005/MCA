"""Pydantic schemas for Phase 8 Generative AI endpoints."""

from typing import Any, List, Optional
from pydantic import BaseModel, Field


# ─── Citizen Assistant Schemas ──────────────────────────────
class CitizenAssistRequest(BaseModel):
    query: str = Field(..., min_length=2, description="Citizen input or question in colloquial English or Kannada")
    complaint_context: Optional[dict[str, Any]] = Field(None, description="Existing complaint details if asking about status")
    language: str = Field("en", description="Preferred language (en/kn)")


class CitizenAssistResponse(BaseModel):
    success: bool = True
    reply_message: str
    draft_title: Optional[str] = None
    draft_description: Optional[str] = None
    suggested_category: Optional[str] = None
    suggested_department: Optional[str] = None
    status_explanation: Optional[str] = None
    next_steps: List[str] = Field(default_factory=list)


# ─── Volunteer Structuring Schemas ──────────────────────────
class VolunteerStructureRequest(BaseModel):
    raw_notes: str = Field(..., min_length=5, description="Unstructured verbal notes or villager statements")
    language: str = Field("en", description="Language of notes (en/kn/mixed)")
    village_context: Optional[str] = None
    taluk_context: Optional[str] = None


class MissingChecklistItem(BaseModel):
    item: str
    question: str
    is_critical: bool = False


class VolunteerStructureResponse(BaseModel):
    success: bool = True
    structured_title: str
    structured_description: str
    incident_summary: str
    location_clues: str
    observed_impact: str
    detected_category: str
    detected_department: str
    recommended_priority: str
    missing_info_checklist: List[MissingChecklistItem] = Field(default_factory=list)


# ─── Official Response Draft Schemas ────────────────────────
class OfficialDraftRequest(BaseModel):
    complaint_number: str
    title: str
    category: str
    department: str
    action_type: str  # "RESOLUTION", "INSPECTION", "REJECTION", "TRANSFER"
    action_notes: Optional[str] = None
    citizen_name: Optional[str] = None
    officer_name: Optional[str] = None
    officer_designation: Optional[str] = None


class OfficialDraftResponse(BaseModel):
    success: bool = True
    formal_letter: str
    sms_summary: str
    inspection_checklist: List[str] = Field(default_factory=list)
    rejection_statutory_basis: Optional[str] = None


# ─── Admin Operational Summary Schemas ──────────────────────
class AdminSummaryRequest(BaseModel):
    time_window_days: int = Field(30, ge=1, le=365)
    district: Optional[str] = None
    department: Optional[str] = None
    total_complaints: int = 0
    breached_count: int = 0
    resolved_count: int = 0
    pending_count: int = 0
    critical_count: int = 0
    top_categories: List[str] = Field(default_factory=list)


class AdminSummaryResponse(BaseModel):
    success: bool = True
    executive_summary: str
    key_highlights: List[str] = Field(default_factory=list)
    identified_hotspots: List[str] = Field(default_factory=list)
    strategic_recommendations: List[str] = Field(default_factory=list)


# ─── Multilingual Translation Schemas ───────────────────────
class TranslationRequest(BaseModel):
    text: str = Field(..., min_length=1)
    source_language: str = Field("auto", description="Source language ('en', 'kn', or 'auto')")
    target_language: str = Field("en", description="Target language ('en' or 'kn')")


class TranslationResponse(BaseModel):
    success: bool = True
    translated_text: str
    detected_source: str
    target_language: str
