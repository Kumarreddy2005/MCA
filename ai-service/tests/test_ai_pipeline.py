"""Comprehensive test suite for Phase 7 AI Intelligence Microservice."""

import base64
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_ocr_text_content():
    """OCR handles direct text input with high confidence."""
    payload = {
        "text_content": "Petition submitted regarding severe drinking water shortage in Ramanagara district."
    }
    response = client.post("/api/ai/ocr", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "Ramanagara" in data["extracted_text"]
    assert data["confidence"] >= 0.85
    assert data["is_low_confidence"] is False


def test_ocr_low_confidence_flag():
    """OCR flags low-confidence or empty inputs (< 0.65)."""
    payload = {
        "file_base64": ""
    }
    response = client.post("/api/ai/ocr", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["is_low_confidence"] is True
    assert data["confidence"] < 0.65


def test_nlp_entity_and_urgency_extraction():
    """NLP correctly identifies Karnataka administrative entities and urgency tokens."""
    payload = {
        "text": "Live wire sparking near Government Primary School, Mandya Taluk, Bengaluru Rural district. Contact 9876543210 immediately!"
    }
    response = client.post("/api/ai/nlp", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["intent"] == "REPORT_HAZARD"

    entities = {e["text"]: e["type"] for e in data["entities"]}
    assert "Mandya Taluk" in entities
    assert entities["Mandya Taluk"] == "TALUK"
    assert "9876543210" in entities
    assert entities["9876543210"] == "PHONE"

    assert "live wire" in data["urgency_indicators"] or "sparking" in data["urgency_indicators"]


def test_department_classification_energy():
    """Classifier maps transformer and BESCOM power issues to Energy Department."""
    payload = {
        "title": "Burnt BESCOM transformer and fallen pole",
        "description": "The main electricity transformer failed with severe sparking and loose wires."
    }
    response = client.post("/api/ai/classify", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["primary_department"] == "ELECTRICITY"
    assert data["confidence"] >= 0.50
    assert len(data["alternative_departments"]) > 0


def test_department_classification_health_and_rdpr():
    """Classifier maps health and village drainage appropriately."""
    # Health
    res_health = client.post("/api/ai/classify", json={
        "title": "PHC doctor absent and no dengue medicine",
        "description": "The primary health centre has no medical supplies and fever cases are rising."
    })
    assert res_health.json()["primary_department"] == "OUT_OF_SCOPE"

    # RDPR
    res_rdpr = client.post("/api/ai/classify", json={
        "title": "Open gutter overflowing in Gram Panchayat",
        "description": "Drainage water and solid waste stagnant near the drinking water borewell."
    })
    assert res_rdpr.json()["primary_department"] == "WATER"


def test_priority_critical_urgency():
    """Urgent life-safety hazards receive CRITICAL priority score (> 85)."""
    payload = {
        "title": "Snapped live electrical wire in school playground",
        "description": "Active electric shock hazard near children. Imminent danger of electrocution!"
    }
    response = client.post("/api/ai/priority", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["suggested_priority"] == "CRITICAL"
    assert data["urgency_score"] >= 85
    assert len(data["safety_factors"]) > 0


def test_priority_medium_and_low():
    """Routine municipal issues receive MEDIUM or LOW priority."""
    payload_med = {
        "title": "Street light not working for a week",
        "description": "The bulb on 3rd cross road is fused."
    }
    res_med = client.post("/api/ai/priority", json=payload_med)
    assert res_med.json()["suggested_priority"] == "MEDIUM"
    assert 40 <= res_med.json()["urgency_score"] <= 65

    payload_low = {
        "title": "Request for painting village community board",
        "description": "The village entrance signboard paint has faded."
    }
    res_low = client.post("/api/ai/priority", json=payload_low)
    assert res_low.json()["suggested_priority"] == "LOW"
    assert res_low.json()["urgency_score"] < 40


def test_similarity_duplicate_clustering():
    """Similarity detection accurately identifies matching grievances without auto-discarding."""
    existing = [
        {
            "id": "comp-101",
            "complaint_number": "CMP-2026-0001",
            "title": "Burnt BESCOM transformer near bus stand",
            "description": "Electricity transformer caught fire and power is cut in entire sector.",
            "category": "ELECTRICITY",
            "latitude": 12.9716,
            "longitude": 77.5946,
            "village": "Kengeri",
            "taluk": "Bengaluru South"
        },
        {
            "id": "comp-102",
            "complaint_number": "CMP-2026-0002",
            "title": "Delayed ration card distribution",
            "description": "Fair price shop dealer has not received wheat quota.",
            "category": "Food & Civil Supplies",
            "latitude": 12.9800,
            "longitude": 77.6000,
            "village": "Kengeri",
            "taluk": "Bengaluru South"
        }
    ]

    new_complaint = {
        "title": "BESCOM transformer burnt down at bus stop",
        "description": "Severe fire in transformer, no power since morning in sector.",
        "category": "ELECTRICITY",
        "latitude": 12.9720,
        "longitude": 77.5950,
        "village": "Kengeri",
        "taluk": "Bengaluru South",
        "existing_complaints": existing,
        "threshold": 0.65
    }

    response = client.post("/api/ai/similarity", json=new_complaint)
    assert response.status_code == 200
    data = response.json()
    assert data["is_duplicate_candidate"] is True
    assert data["highest_similarity_score"] >= 0.65
    assert len(data["matches"]) >= 1
    assert data["matches"][0]["complaint_number"] == "CMP-2026-0001"
    reasons_str = " ".join(data["matches"][0]["match_reasons"])
    assert "High text content overlap" in reasons_str
    assert "Located within" in reasons_str


def test_summarization():
    """Summarizer generates concise factual statements."""
    payload = {
        "title": "Main road culvert collapsed",
        "description": "Heavy monsoon rains washed away the stone culvert. Buses cannot pass through the village since yesterday.",
        "category": "Public Works Department",
        "location_name": "Bidadi Village, Ramanagara"
    }
    response = client.post("/api/ai/summarize", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "Public Works Department" in data["summary"]
    assert "Bidadi Village" in data["summary"]
    assert len(data["key_points"]) >= 3


def test_unified_analyze_complaint_pipeline():
    """Composite /analyze-complaint endpoint orchestrates full intelligence pipeline."""
    payload = {
        "title": "Fallen live electric wire on Ramanagara main road",
        "description": "High voltage wire snapped after tree branch fell. Sparks flying everywhere near houses. Immediate BESCOM response required!",
        "category": "ELECTRICITY",
        "latitude": 12.7200,
        "longitude": 77.2800,
        "village": "Bidadi",
        "taluk": "Ramanagara",
        "district": "Ramanagara",
        "existing_complaints": []
    }
    response = client.post("/api/ai/analyze-complaint", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True

    # Validate all components populated
    assert data["classification"]["primary_department"] == "ELECTRICITY"
    assert data["priority"]["suggested_priority"] == "CRITICAL"
    assert data["priority"]["urgency_score"] >= 85
    assert data["nlp"]["intent"] == "REPORT_HAZARD"
    assert "Ramanagara" in data["summary"]["summary"]
    assert data["similarity"]["is_duplicate_candidate"] is False
