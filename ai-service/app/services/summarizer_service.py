"""Deterministic Factual Summarization Service."""

import re
from typing import List
from app.schemas.ai import SummarizeRequest, SummarizeResponse


class SummarizerService:
    """Generates concise factual summaries preserving key operational facts without hallucinations."""

    @staticmethod
    def summarize(req: SummarizeRequest) -> SummarizeResponse:
        title = req.title.strip()
        desc = req.description.strip()
        cat = req.category or "civic grievance"
        # Un-nest any previous meta prefix
        meta_match = re.match(r"^Citizen filed a grievance regarding ['\"]?([^'\"]+)['\"]?\s+under", title)
        if meta_match:
            title = meta_match.group(1).strip()

        loc = req.location_name.strip() if req.location_name and req.location_name.strip() else ""

        # Break description into sentences
        sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", desc) if len(s.strip()) > 5]

        # Extract salient sentences
        key_sentences = []
        if sentences:
            # First sentence usually describes the core issue
            key_sentences.append(sentences[0])
            # If additional sentences exist, pick one that mentions impact, duration, or danger
            for s in sentences[1:]:
                s_lower = s.lower()
                if any(w in s_lower for w in ["since", "days", "hazard", "danger", "water", "road", "wire", "school", "hospital", "urgent", "request", "please", "affect"]):
                    key_sentences.append(s)
                    break
        else:
            key_sentences.append(desc or title)

        joined_facts = " ".join(key_sentences)
        if loc and loc.lower() not in ["unresolved", "unknown", "none", "specified village location"]:
            summary = f"Citizen filed a grievance regarding '{title}' under {cat} at {loc}. {joined_facts}"
        else:
            summary = f"Citizen filed a grievance regarding '{title}' under {cat}. {joined_facts}"

        # Ensure summary is concise (< 350 chars if possible)
        if len(summary) > 400:
            summary = summary[:397] + "..."

        # Key bullet points
        bullet_points = [
            f"Issue: {title}",
            f"Category: {cat}",
            f"Location: {loc or 'Not specified'}",
            f"Core Grievance: {sentences[0] if sentences else desc[:100]}"
        ]

        return SummarizeResponse(
            success=True,
            summary=summary,
            key_points=bullet_points
        )


summarizer_service = SummarizerService()
