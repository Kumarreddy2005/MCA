"""Similarity & Duplicate Grievance Clustering Service."""

import math
import re
from typing import List
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from app.schemas.ai import (
    CandidateComplaint,
    SimilarityMatch,
    SimilarityRequest,
    SimilarityResponse,
)


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates distance in kilometers between two GPS coordinates."""
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return 999.0

    R = 6371.0  # Earth's radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


class SimilarityService:
    """Detects similar or duplicate complaints using TF-IDF vectorization and geographic proximity."""

    @staticmethod
    def detect_similarity(req: SimilarityRequest) -> SimilarityResponse:
        if not req.existing_complaints:
            return SimilarityResponse(
                success=True,
                is_duplicate_candidate=False,
                highest_similarity_score=0.0,
                match_count=0,
                matches=[]
            )

        query_text = f"{req.title} {req.description} {req.category or ''}".strip().lower()
        candidates = req.existing_complaints

        corpus = [query_text] + [
            f"{c.title} {c.description} {c.category or ''}".strip().lower()
            for c in candidates
        ]

        try:
            vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), min_df=1)
            tfidf_matrix = vectorizer.fit_transform(corpus)
            cosine_sims = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:])[0]
        except Exception:
            cosine_sims = [0.0] * len(candidates)

        matches: List[SimilarityMatch] = []
        highest_score = 0.0

        STOP_WORDS = {"the", "a", "an", "is", "are", "in", "on", "at", "to", "for", "of", "with", "and", "or", "near", "at", "down"}

        for idx, candidate in enumerate(candidates):
            tfidf_sim = float(cosine_sims[idx]) if idx < len(cosine_sims) else 0.0

            # Compute non-stopword token overlap
            q_tokens = set(w for w in re.findall(r"\b[a-z]{3,}\b", query_text) if w not in STOP_WORDS)
            c_text = f"{candidate.title} {candidate.description} {candidate.category or ''}".lower()
            c_tokens = set(w for w in re.findall(r"\b[a-z]{3,}\b", c_text) if w not in STOP_WORDS)
            token_sim = (len(q_tokens & c_tokens) / max(len(q_tokens | c_tokens), 1)) if (q_tokens and c_tokens) else 0.0

            text_sim = max(tfidf_sim, token_sim)

            # Calculate location proximity score (0.0 to 1.0)
            loc_score = 0.0
            dist_km = None
            if req.latitude is not None and req.longitude is not None and candidate.latitude is not None and candidate.longitude is not None:
                dist_km = haversine_km(req.latitude, req.longitude, candidate.latitude, candidate.longitude)
                if dist_km <= 0.3:  # within 300m
                    loc_score = 1.0
                elif dist_km <= 1.0:  # within 1km
                    loc_score = 0.8
                elif dist_km <= 3.0:  # within 3km
                    loc_score = 0.5
                else:
                    loc_score = 0.1
            elif req.village and candidate.village and req.village.strip().lower() == candidate.village.strip().lower():
                loc_score = 0.7
            elif req.taluk and candidate.taluk and req.taluk.strip().lower() == candidate.taluk.strip().lower():
                loc_score = 0.4

            # Category boost if identical
            category_match = False
            if req.category and candidate.category:
                if req.category.strip().lower() == candidate.category.strip().lower():
                    category_match = True

            # Combined score: 50% text similarity, 35% location proximity, 15% category
            combined_score = (text_sim * 0.50) + (loc_score * 0.35) + (0.15 if category_match else 0.0)
            combined_score = round(min(1.0, max(0.0, combined_score)), 2)

            match_reasons = []
            if text_sim >= 0.40:
                match_reasons.append(f"High text content overlap ({int(text_sim * 100)}%)")
            if dist_km is not None and dist_km <= 1.0:
                match_reasons.append(f"Located within {round(dist_km, 2)} km of this incident")
            elif req.village and candidate.village and req.village.lower() == candidate.village.lower():
                match_reasons.append(f"Same village ({candidate.village})")
            if category_match:
                match_reasons.append(f"Identical grievance category ({candidate.category})")

            if combined_score >= req.threshold:
                if combined_score > highest_score:
                    highest_score = combined_score

                matches.append(
                    SimilarityMatch(
                        id=candidate.id,
                        complaint_number=candidate.complaint_number,
                        title=candidate.title,
                        similarity_score=combined_score,
                        text_similarity=round(text_sim, 2),
                        location_proximity_score=round(loc_score, 2),
                        match_reasons=match_reasons
                    )
                )

        # Sort matches descending by score
        matches.sort(key=lambda m: m.similarity_score, reverse=True)
        is_dup = len(matches) > 0 and highest_score >= req.threshold

        return SimilarityResponse(
            success=True,
            is_duplicate_candidate=is_dup,
            highest_similarity_score=highest_score,
            match_count=len(matches),
            matches=matches[:5]  # Top 5 matches
        )


similarity_service = SimilarityService()
