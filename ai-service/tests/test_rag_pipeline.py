"""Pytest suite for Phase 9 RAG Knowledge System endpoints."""

import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_list_preseeded_documents(client):
    """Verify that default pre-seeded Karnataka Government documents are available."""
    res = client.get("/api/rag/documents")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["total_documents"] >= 4

    doc_numbers = [d["document_number"] for d in data["documents"]]
    assert "KRN-ACT-SAKALA-2011-01" in doc_numbers
    assert "KRN-GO-RDPR-2024-41" in doc_numbers
    assert "KRN-KERC-BESCOM-2023-12" in doc_numbers
    assert "KRN-UDD-SWM-2022-09" in doc_numbers


def test_query_sakala_statutory_timeline(client):
    """Test grounded query regarding Sakala Act statutory grievance timelines."""
    res = client.post(
        "/api/rag/query",
        json={
            "query": "What is the statutory deadline under Sakala for resolving drinking water failure?",
            "department_filter": "Rural Development",
            "max_sources": 3,
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["is_grounded"] is True
    assert len(data["sources"]) > 0

    top_source = data["sources"][0]
    assert "SAKALA" in top_source["document_number"] or "Sakala" in top_source["title"]
    assert "15" in top_source["excerpt"] or "Sakala" in top_source["excerpt"]
    assert "Karnataka Sakala Services Act" in data["grounded_answer"]


def test_query_water_supply_borewell_funds(client):
    """Test grounded query on borewell motor replacement fund limits."""
    res = client.post(
        "/api/rag/query",
        json={
            "query": "How much can the Gram Panchayat spend to replace a burnt community borewell pump?",
            "max_sources": 2,
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["is_grounded"] is True
    assert len(data["sources"]) > 0

    doc_nums = [s["document_number"] for s in data["sources"]]
    assert "KRN-GO-RDPR-2024-41" in doc_nums


def test_query_bescom_transformer_sla(client):
    """Test grounded query on BESCOM transformer failure restoration SLA."""
    res = client.post(
        "/api/rag/query",
        json={
            "query": "Within how many hours must BESCOM replace a failed distribution transformer in rural areas?",
            "department_filter": "Energy",
            "max_sources": 2,
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["is_grounded"] is True
    assert len(data["sources"]) > 0

    top_source = data["sources"][0]
    assert top_source["document_number"] == "KRN-KERC-BESCOM-2023-12"
    assert "24 hours" in top_source["excerpt"] or "transformer" in top_source["excerpt"].lower()


def test_unsupported_query_anti_hallucination(client):
    """Verify that unsupported queries return explicit disclaimer rather than hallucinations."""
    res = client.post(
        "/api/rag/query",
        json={
            "query": "What are the rules for private spaceship parking subsidies on the moon in Karnataka?",
            "max_sources": 3,
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["is_grounded"] is False
    assert len(data["sources"]) == 0
    assert "No authorized Government of Karnataka circular" in data["grounded_answer"]


def test_ingest_and_query_new_document(client):
    """Test dynamic ingestion of a new circular, verify chunking and subsequent retrieval."""
    ingest_res = client.post(
        "/api/rag/ingest",
        json={
            "title": "Karnataka Agricultural Pump Solarization Scheme 2026 (Kusum-K)",
            "document_number": "KRN-AGRI-SOLAR-2026-05",
            "department": "Energy Department",
            "category": "Solar Energy & Farmers",
            "version": "1.0",
            "effective_date": "2026-03-01",
            "source": "Karnataka Renewable Energy Development Ltd (KREDL)",
            "approval_state": "APPROVED",
            "document_status": "ACTIVE",
            "content": """# KUSUM-K SOLAR PUMP SUBSIDY GUIDELINES 2026
## Farmer Eligibility & Solar Subsidies
Small and marginal farmers holding minimum 1 acre agricultural land with an existing grid pump connection are eligible for 80% capital subsidy on solar agricultural pumps.
The solar pump installation must be completed by empanelled vendors within thirty (30) days from the receipt of beneficiary contribution. Defective solar inverters under warranty must be serviced within 72 hours of farmer complaint registration.""",
            "tags": ["solar", "farmer", "agriculture", "kusum", "subsidy", "inverter"],
        },
    )
    assert ingest_res.status_code == 201
    ingest_data = ingest_res.json()
    assert ingest_data["success"] is True
    assert ingest_data["total_chunks"] >= 1
    doc_id = ingest_data["document_id"]

    # Query the newly ingested document
    query_res = client.post(
        "/api/rag/query",
        json={
            "query": "What is the subsidy percentage for solar agricultural pumps under Kusum-K in Karnataka?",
            "max_sources": 2,
        },
    )
    assert query_res.status_code == 200
    query_data = query_res.json()
    assert query_data["is_grounded"] is True
    assert any(s["document_number"] == "KRN-AGRI-SOLAR-2026-05" for s in query_data["sources"])

    # Archive document and verify it is no longer returned
    arch_res = client.post(f"/api/rag/documents/{doc_id}/archive?new_status=SUPERSEDED")
    assert arch_res.status_code == 200

    # Query again: superseded document should be excluded
    query_again = client.post(
        "/api/rag/query",
        json={
            "query": "solar agricultural pump Kusum-K 80% subsidy",
            "max_sources": 2,
        },
    )
    assert query_again.status_code == 200
    sources = [s["document_number"] for s in query_again.json()["sources"]]
    assert "KRN-AGRI-SOLAR-2026-05" not in sources
