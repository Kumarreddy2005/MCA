"""VCGIS AI Service — Health check tests."""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    """Health endpoint returns ok status."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["status"] == "ok"
    assert data["data"]["service"] == "vcgis-ai-service"


def test_root():
    """Root endpoint returns running message."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
