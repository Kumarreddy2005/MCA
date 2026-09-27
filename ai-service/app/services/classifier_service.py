"""Supervised VCGIS classifier with explicit uncertainty and safe fallback."""
import re
from pathlib import Path
from typing import Dict, List
import joblib
from app.schemas.ai import ClassifyResponse, DepartmentRecommendation

ROOT = Path(__file__).resolve().parents[2]
MODEL_PATH = ROOT / "models" / "department_classifier.joblib"
SUBCAT_PATH = ROOT / "models" / "subcategory_classifier.joblib"

OUT_OF_SCOPE_TERMS = [
    "hospital", "school", "ration card", "land record", "pension", "scholarship",
    "garbage collection", "sanitation", "property tax", "police", "crime", "bus pass",
    "agriculture", "birth certificate", "death certificate", "social welfare", "doctor", "medical", "hospital", "phc", "dengue"
]

class ClassifierService:
    def __init__(self):
        self.model = joblib.load(MODEL_PATH) if MODEL_PATH.exists() else None
        self.subcat_model = joblib.load(SUBCAT_PATH) if SUBCAT_PATH.exists() else None

    @staticmethod
    def _out_of_scope(text: str) -> bool:
        has_scope_signal = any(re.search(rf"\b{re.escape(term)}\b", text, re.I) for term in [
            "pothole", "road", "footpath", "bridge", "manhole", "transformer", "electricity",
            "power", "wire", "pole", "sparking", "streetlight", "voltage", "pipeline",
            "water", "borewell", "pump", "water tank", "leakage", "contamination"
        ])
        return (not has_scope_signal) and any(re.search(rf"\b{re.escape(term)}\b", text, re.I) for term in OUT_OF_SCOPE_TERMS)

    def classify(self, title: str, description: str, selected_category: str = None) -> ClassifyResponse:
        text = f"{title} {description}".strip()
        if self._out_of_scope(text):
            return ClassifyResponse(success=True, primary_department="OUT_OF_SCOPE", confidence=0.99,
                sub_category=None, alternative_departments=[], needs_volunteer_review=True,
                clarification_required=False, possible_categories=[])
        if not text or len(text.split()) < 3 or not self.model:
            return ClassifyResponse(success=True, primary_department="UNCERTAIN", confidence=0.0,
                sub_category=None, alternative_departments=[], needs_volunteer_review=True,
                clarification_required=True, possible_categories=[])

        probs = self.model.predict_proba([text])[0]
        classes = list(self.model.classes_)
        ranked = sorted(zip(classes, probs), key=lambda x: x[1], reverse=True)
        best, best_prob = ranked[0]
        second_prob = ranked[1][1] if len(ranked) > 1 else 0.0
        margin = float(best_prob - second_prob)
        # Conservative gate: uncertain if confidence or separation is weak.
        uncertain = best_prob < 0.50 or margin < 0.15
        primary = "UNCERTAIN" if uncertain else str(best)
        alternatives = [DepartmentRecommendation(department=str(d), confidence=round(float(p), 4)) for d,p in ranked[1:3]]

        subcat = None
        if primary != "UNCERTAIN" and self.subcat_model:
            try:
                subcat = str(self.subcat_model.predict([text])[0])
            except Exception:
                subcat = None
        possible = [str(d) for d,p in ranked if p >= 0.15][:3]
        if primary != "UNCERTAIN" and subcat:
            possible = [subcat]
        return ClassifyResponse(success=True, primary_department=primary,
            confidence=round(float(best_prob), 4), sub_category=subcat,
            alternative_departments=alternatives,
            needs_volunteer_review=uncertain,
            clarification_required=uncertain,
            possible_categories=possible)

classifier_service = ClassifierService()
