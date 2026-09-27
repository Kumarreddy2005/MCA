"""Urgency Scoring and Priority Intelligence Service."""

import re
from typing import List, Tuple
from app.schemas.ai import PriorityResponse

CRITICAL_HAZARD_FACTORS = [
    (r"\b(live wire|fallen electric wire|wire snapped|sparking|electrocution|electric shock)\b", "Severe electrocution hazard endangering public life"),
    (r"\b(open borewell|uncovered borewell|trapped child|open manhole)\b", "Fatal fall hazard in unbarricaded cavity"),
    (r"\b(bridge collapse|culvert collapsed|road caved in|landslide)\b", "Catastrophic structural failure blocking transit"),
    (r"\b(cholera|water poisoning|toxic water|contagious|death|fatal accident)\b", "Imminent public health emergency"),
    (r"\b(phc power cut|hospital power failure|oxygen supply failure)\b", "Critical healthcare lifeline failure")
]

HIGH_DISRUPTION_FACTORS = [
    (r"\b(no water for \d+ days|water supply cut|pipeline burst|drinking water crisis)\b", "Community-wide drinking water deprivation"),
    (r"\b(transformer burnt|total blackout|no power in whole village|voltage spike damaged)\b", "Widespread power grid failure affecting community"),
    (r"\b(overflowing sewage|sewage inside school|drain water entering houses)\b", "High biohazard contamination in living area"),
    (r"\b(ambulance cannot enter|road completely blocked|inaccessible)\b", "Emergency access obstruction"),
    (r"\b(dengue outbreak|malaria cases increasing|fever spread)\b", "Escalating vector-borne disease cluster")
]

MEDIUM_FACTORS = [
    (r"\b(street\s*lights?|lights? (off|fused|not working)|dark street|bulb fused|lamp)\b", "Darkness or street lighting issue"),
    (r"\b(potholes?|muddy road|damaged road|speed breaker)\b", "Vehicle transit difficulty"),
    (r"\b(garbage pile|waste not collected|dustbin full)\b", "Accumulated civic refuse"),
    (r"\b(ration delayed|dealer rude|biometric machine not working)\b", "Welfare delivery friction"),
    (r"\b(low water pressure|intermittent water)\b", "Sub-optimal water flow")
]


class PriorityService:
    """Evaluates urgency score (0-100) and recommends priority (CRITICAL/HIGH/MEDIUM/LOW)."""

    @staticmethod
    def evaluate(title: str, description: str, category: str = None) -> PriorityResponse:
        full_text = f"{title} {description} {category or ''}".lower()

        safety_factors: List[str] = []
        reasoning: List[str] = []
        score = 25  # default base score

        # Check Critical triggers
        critical_hits = 0
        for pattern, factor_desc in CRITICAL_HAZARD_FACTORS:
            if re.search(pattern, full_text):
                critical_hits += 1
                safety_factors.append(factor_desc)
                reasoning.append(f"Detected severe public safety threat: '{factor_desc}'")

        if critical_hits > 0:
            score = min(100, 85 + (critical_hits * 5))
            priority = "CRITICAL"
            reasoning.insert(0, "Classified as CRITICAL priority due to imminent danger to human life or high-voltage hazard.")
            return PriorityResponse(
                success=True,
                suggested_priority=priority,
                urgency_score=score,
                reasoning=reasoning,
                safety_factors=safety_factors
            )

        # Check High triggers
        high_hits = 0
        for pattern, factor_desc in HIGH_DISRUPTION_FACTORS:
            if re.search(pattern, full_text):
                high_hits += 1
                safety_factors.append(factor_desc)
                reasoning.append(f"Detected community impact factor: '{factor_desc}'")

        if high_hits > 0:
            score = min(84, 65 + (high_hits * 6))
            priority = "HIGH"
            reasoning.insert(0, "Classified as HIGH priority due to widespread disruption of essential public utilities.")
            return PriorityResponse(
                success=True,
                suggested_priority=priority,
                urgency_score=score,
                reasoning=reasoning,
                safety_factors=safety_factors
            )

        # Check Medium triggers
        med_hits = 0
        for pattern, factor_desc in MEDIUM_FACTORS:
            if re.search(pattern, full_text):
                med_hits += 1
                reasoning.append(f"Routine maintenance indicator: '{factor_desc}'")

        if med_hits > 0:
            score = min(64, 40 + (med_hits * 5))
            priority = "MEDIUM"
            reasoning.insert(0, "Classified as MEDIUM priority for standard municipal/panchayat maintenance.")
            return PriorityResponse(
                success=True,
                suggested_priority=priority,
                urgency_score=score,
                reasoning=reasoning,
                safety_factors=[]
            )

        # Fallback to LOW priority
        priority = "LOW"
        reasoning.append("No acute hazards or utility disruptions detected. Scheduled for routine civic intake.")
        return PriorityResponse(
            success=True,
            suggested_priority=priority,
            urgency_score=score,
            reasoning=reasoning,
            safety_factors=[]
        )


priority_service = PriorityService()
