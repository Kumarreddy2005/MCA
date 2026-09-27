"""Test suite for Phase 8 Generative AI Decision Support endpoints."""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_citizen_assistant_drafting():
    """Citizen assistant converts informal query into structured draft petition."""
    payload = {
        "query": "Borewell motor burnt in Mandya village and no drinking water for 3 days",
        "language": "en"
    }
    response = client.post("/api/genai/citizen/assist", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "draft_title" in data
    assert "Borewell" in data["draft_title"] or "water" in data["draft_title"].lower()
    assert data["suggested_department"] == "WATER"
    assert len(data["next_steps"]) >= 2


def test_citizen_assistant_status_explanation():
    """Citizen assistant explains existing grievance status clearly."""
    payload = {
        "query": "What is the update on my complaint?",
        "complaint_context": {
            "complaintNumber": "CMP-2026-00028",
            "status": "ACTION_IN_PROGRESS",
            "department": "ELECTRICITY",
            "assignedOfficialName": "Sri. K. Ramesh (AEE BESCOM)"
        }
    }
    response = client.post("/api/genai/citizen/assist", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "CMP-2026-00028" in data["status_explanation"]
    assert "ACTION_IN_PROGRESS" in data["status_explanation"] or "Field corrective action" in data["status_explanation"]


def test_volunteer_structuring_and_checklist():
    """Volunteer copilot structures informal speech notes and identifies missing checklist items."""
    payload = {
        "raw_notes": "Ramesh from cross 4 near Maramma temple says street light pole tilted and wire sparking since yesterday night",
        "language": "en",
        "village_context": "Bidadi",
        "taluk_context": "Ramanagara"
    }
    response = client.post("/api/genai/volunteer/structure", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "1. INCIDENT SUMMARY:" in data["structured_description"]
    assert "2. LOCATION CLUES:" in data["structured_description"]
    assert "3. OBSERVED IMPACT:" in data["structured_description"]
    assert data["detected_department"] in ["ELECTRICITY", "WATER", "UNCERTAIN"]
    if data["detected_department"] == "UNCERTAIN":
        assert data.get("needs_volunteer_review", True) is True
    assert data["recommended_priority"] in ["MEDIUM", "HIGH", "CRITICAL"]

    # Verify checklist
    assert len(data["missing_info_checklist"]) >= 3
    items = [item["item"] for item in data["missing_info_checklist"]]
    assert any("Landmark" in it or "Street" in it for it in items)


def test_official_draft_resolution_letter():
    """Official copilot generates formal Sakala resolution letter and SMS summary."""
    payload = {
        "complaint_number": "CMP-2026-00028",
        "title": "Burnt BESCOM transformer replacement",
        "category": "Transformer Failure",
        "department": "ELECTRICITY",
        "action_type": "RESOLUTION",
        "action_notes": "New 100kVA transformer installed and 11kV lines energized.",
        "citizen_name": "Basavaraj Gowda",
        "officer_name": "Smt. Priya Sharma",
        "officer_designation": "Executive Engineer"
    }
    response = client.post("/api/genai/official/draft-response", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "GOVERNMENT OF KARNATAKA" in data["formal_letter"]
    assert "CMP-2026-00028" in data["formal_letter"]
    assert "Sakala" in data["formal_letter"]
    assert "Govt of Karnataka VCGIS" in data["sms_summary"]
    assert len(data["inspection_checklist"]) > 0


def test_official_draft_rejection_notice():
    """Official copilot generates statutory rejection endorsement with appeal provision."""
    payload = {
        "complaint_number": "CMP-2026-00029",
        "title": "Private dispute over agricultural boundary wall",
        "category": "Land Encroachment",
        "department": "Revenue Department",
        "action_type": "REJECTION",
        "action_notes": "Matter is currently pending before Senior Civil Judge Court under OS No 124/2025.",
        "citizen_name": "K. Shivanna",
        "officer_name": "Sri. Manjunath",
        "officer_designation": "Tahsildar"
    }
    response = client.post("/api/genai/official/draft-response", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "Appellate Authority" in data["formal_letter"]
    assert "Sakala" in data["rejection_statutory_basis"]


def test_admin_operational_summary():
    """Admin assistant computes compliance rates and synthesizes executive briefings."""
    payload = {
        "time_window_days": 30,
        "district": "Ramanagara",
        "total_complaints": 120,
        "resolved_count": 96,
        "breached_count": 12,
        "pending_count": 12,
        "critical_count": 5,
        "top_categories": ["Drinking Water", "Street Lights", "Transformer Repair"]
    }
    response = client.post("/api/genai/admin/summary", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "80.0%" in data["executive_summary"]  # 96/120 = 80%
    assert len(data["key_highlights"]) >= 3
    assert len(data["strategic_recommendations"]) >= 2


def test_multilingual_translation():
    """Translation helper maps terms between Kannada and English."""
    # Kannada to English
    res_kn = client.post("/api/genai/translate", json={
        "text": "ಗ್ರಾಮದಲ್ಲಿ ಕುಡಿಯುವ ನೀರು ಮತ್ತು ವಿದ್ಯುತ್ ತೊಂದರೆ ಇದೆ",
        "source_language": "kn",
        "target_language": "en"
    })
    assert res_kn.status_code == 200
    data_kn = res_kn.json()
    assert data_kn["success"] is True
    assert "water" in data_kn["translated_text"].lower() or "electricity" in data_kn["translated_text"].lower()

    # English to Kannada
    res_en = client.post("/api/genai/translate", json={
        "text": "Grievance regarding water and electricity danger",
        "source_language": "en",
        "target_language": "kn"
    })
    assert res_en.status_code == 200
    data_en = res_en.json()
    assert data_en["success"] is True
    assert "ನೀರು" in data_en["translated_text"]
