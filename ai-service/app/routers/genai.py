"""GenAI Decision Support Router."""

from fastapi import APIRouter
from app.schemas.genai import (
    AdminSummaryRequest,
    AdminSummaryResponse,
    CitizenAssistRequest,
    CitizenAssistResponse,
    OfficialDraftRequest,
    OfficialDraftResponse,
    TranslationRequest,
    TranslationResponse,
    VolunteerStructureRequest,
    VolunteerStructureResponse,
)
from app.services.genai_service import genai_service

router = APIRouter(prefix="", tags=["Generative AI Decision Support"])


@router.post("/citizen/assist", response_model=CitizenAssistResponse)
async def assist_citizen(req: CitizenAssistRequest):
    """Conversational drafting and status explanation for citizens."""
    return genai_service.assist_citizen(req)


@router.post("/volunteer/structure", response_model=VolunteerStructureResponse)
async def structure_volunteer_notes(req: VolunteerStructureRequest):
    """Structures informal villager speech/notes into formal 4-part grievances with missing checklist."""
    return genai_service.structure_volunteer_notes(req)


@router.post("/official/draft-response", response_model=OfficialDraftResponse)
async def draft_official_response(req: OfficialDraftRequest):
    """Drafts formal citizen resolution notices, technical inspection steps, and rejection justifications."""
    return genai_service.draft_official_response(req)


@router.post("/admin/summary", response_model=AdminSummaryResponse)
async def generate_admin_summary(req: AdminSummaryRequest):
    """Synthesizes operational metrics into executive briefings with identified hotspots."""
    return genai_service.generate_admin_summary(req)


@router.post("/translate", response_model=TranslationResponse)
async def translate_text(req: TranslationRequest):
    """Bidirectional Kannada <-> English translation helper for citizen petitions."""
    return genai_service.translate_text(req)
