"""NLP Analysis, Entity Recognition, and Intent Extraction Service."""

import re
from typing import List, Set
from app.schemas.ai import EntityItem, NLPResponse


# Karnataka Districts & Common Administrative Keywords
KARNATAKA_DISTRICTS = {
    "bagalkot", "ballari", "belagavi", "bengaluru", "bengaluru rural", "bengaluru urban",
    "bidar", "chamarajanagar", "chikkaballapur", "chikkamagaluru", "chitradurga",
    "dakshina kannada", "davanagere", "dharwad", "gadag", "hassan", "haveri",
    "kalaburagi", "kodagu", "kolar", "koppal", "mandya", "mysuru", "raichur",
    "ramanagara", "shivamogga", "tumakuru", "udupi", "uttara kannada", "vijayanagara", "yadgir"
}

ADMIN_KEYWORDS = {
    "taluk": "TALUK",
    "tahsil": "TALUK",
    "tehsil": "TALUK",
    "panchayat": "GRAM_PANCHAYAT",
    "gp": "GRAM_PANCHAYAT",
    "gram": "VILLAGE",
    "village": "VILLAGE",
    "ward": "WARD",
    "district": "DISTRICT",
    "cross": "LOCATION",
    "road": "LOCATION",
    "street": "LOCATION",
    "layout": "LOCATION",
    "circle": "LOCATION",
    "junction": "LOCATION"
}

FACILITY_PATTERNS = [
    (r"\b(phc|primary health centre|dispensary|hospital|clinic)\b", "HEALTH_FACILITY"),
    (r"\b(anganwadi|anganavadi|play school)\b", "EDUCATION_FACILITY"),
    (r"\b(school|high school|college|hostel|pu college)\b", "EDUCATION_FACILITY"),
    (r"\b(borewell|tank|handpump|water tank|overhead tank|ro plant)\b", "WATER_FACILITY"),
    (r"\b(substation|transformer|pole|electric line|feeder|bescom office)\b", "ENERGY_FACILITY"),
    (r"\b(bridge|culvert|drain|gutter|flyover|underpass)\b", "CIVIC_INFRASTRUCTURE"),
    (r"\b(fair price shop|ration shop|godown)\b", "FOOD_FACILITY"),
]

URGENCY_TOKENS = {
    "live wire", "sparking", "electrocution", "shock", "fallen wire",
    "flood", "overflowing sewage", "overflowing drain", "burst", "burst pipe",
    "fatal", "death", "casualty", "critical", "emergency", "danger",
    "life threatening", "urgent", "immediate", "poison", "toxic",
    "contamination", "cholera", "dengue", "collapse", "cave-in",
    "gas leak", "fire", "explosion", "spark"
}

INTENT_MAPPINGS = [
    (r"\b(bribe|corruption|loot|money demanded|scam|illegal demand)\b", "CORRUPTION_COMPLAINT"),
    (r"\b(live wire|sparking|sparks|shock|collapse|flood|hazard|fire|drowning|danger|open borewell|wire snapped|fallen.*wire|high voltage|electrocution)\b", "REPORT_HAZARD"),
    (r"\b(burnt transformer|broken road|caved in|damaged bridge|pipe burst|leakage|fallen pole)\b", "INFRASTRUCTURE_FAILURE"),
    (r"\b(pension|ration card|rtc|khata|scholarship|scheme|subsidy|aadhaar|pahani)\b", "WELFARE_APPLICATION"),
    (r"\b(not working|no water|no power|power cut|street light off|garbage|delay|not collected)\b", "SERVICE_DISRUPTION"),
]

STOP_WORDS = {
    "the", "a", "an", "is", "are", "was", "were", "and", "or", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "up", "about", "into", "over", "after", "this", "that",
    "these", "those", "my", "our", "their", "sir", "madam", "please", "kindly", "help",
    "complaint", "issue", "problem", "there", "here", "we", "i", "he", "she", "it"
}


class NLPService:
    """Analyzes complaint text for entities, intent, urgency indicators, and keywords."""

    @staticmethod
    def analyze(text: str) -> NLPResponse:
        if not text:
            return NLPResponse(
                success=False,
                intent="SERVICE_DISRUPTION",
                entities=[],
                urgency_indicators=[],
                keywords=[],
                detected_language="en"
            )

        text_lower = text.lower()
        entities = NLPService._extract_entities(text, text_lower)
        intent = NLPService._detect_intent(text_lower)
        urgency_indicators = NLPService._extract_urgency(text_lower)
        keywords = NLPService._extract_keywords(text_lower)
        language = NLPService._detect_language(text)

        return NLPResponse(
            success=True,
            intent=intent,
            entities=entities,
            urgency_indicators=urgency_indicators,
            keywords=keywords,
            detected_language=language
        )

    @staticmethod
    def _extract_entities(text: str, text_lower: str) -> List[EntityItem]:
        entities: List[EntityItem] = []
        seen_entities: Set[str] = set()

        # 1. Karnataka Districts
        for district in KARNATAKA_DISTRICTS:
            if re.search(rf"\b{re.escape(district)}\b", text_lower):
                val = district.title()
                if val not in seen_entities:
                    seen_entities.add(val)
                    entities.append(EntityItem(text=val, type="DISTRICT"))

        # 2. Administrative divisions (Taluk / GP / Village / Ward)
        admin_match = re.findall(r"([A-Za-z]+)\s+(taluk|panchayat|village|ward|gp|circle|road)", text, re.IGNORECASE)
        for name, unit in admin_match:
            full = f"{name} {unit}".title()
            ent_type = ADMIN_KEYWORDS.get(unit.lower(), "LOCATION")
            if full not in seen_entities:
                seen_entities.add(full)
                entities.append(EntityItem(text=full, type=ent_type))

        # 3. Facilities
        for pattern, ftype in FACILITY_PATTERNS:
            matches = re.findall(pattern, text_lower)
            for m in matches:
                val = m.upper() if len(m) <= 4 else m.title()
                if val not in seen_entities:
                    seen_entities.add(val)
                    entities.append(EntityItem(text=val, type=ftype))

        # 4. Phone numbers
        phone_matches = re.findall(r"\b(?:\+91|0)?[6-9]\d{9}\b", text)
        for phone in phone_matches:
            if phone not in seen_entities:
                seen_entities.add(phone)
                entities.append(EntityItem(text=phone, type="PHONE"))

        # 5. Dates
        date_matches = re.findall(r"\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})\b", text, re.IGNORECASE)
        for dt in date_matches:
            if dt not in seen_entities:
                seen_entities.add(dt)
                entities.append(EntityItem(text=dt, type="DATE"))

        return entities

    @staticmethod
    def _detect_intent(text_lower: str) -> str:
        for pattern, intent_name in INTENT_MAPPINGS:
            if re.search(pattern, text_lower):
                return intent_name
        return "SERVICE_DISRUPTION"

    @staticmethod
    def _extract_urgency(text_lower: str) -> List[str]:
        found = []
        for token in URGENCY_TOKENS:
            if token in text_lower:
                found.append(token)
        return sorted(list(set(found)))

    @staticmethod
    def _extract_keywords(text_lower: str) -> List[str]:
        # Tokenize words, exclude punctuation & short tokens
        words = re.findall(r"\b[a-z]{3,}\b", text_lower)
        word_freq = {}
        for w in words:
            if w not in STOP_WORDS:
                word_freq[w] = word_freq.get(w, 0) + 1
        # Return top 8 most frequent keywords
        sorted_keywords = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
        return [k for k, _ in sorted_keywords[:8]]

    @staticmethod
    def _detect_language(text: str) -> str:
        has_kannada = any("\u0C80" <= char <= "\u0CFF" for char in text)
        has_latin = any("a" <= char.lower() <= "z" for char in text)
        if has_kannada and has_latin:
            return "mixed"
        if has_kannada:
            return "kn"
        return "en"


nlp_service = NLPService()
