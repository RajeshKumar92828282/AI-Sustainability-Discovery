"""
End-to-end API tests for Report Creation and RAG Analysis integration.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.database import Base, engine, get_db

client = TestClient(app)


def test_end_to_end_report_analysis():
    # 1. Create a test report
    report_data = {
        "description": "Overflowing waste bins near the college entrance are causing unmanaged waste accumulation.",
        "category": "Waste",
        "location": "College entrance",
    }
    response = client.post("/api/reports", data=report_data)
    assert response.status_code == 201, f"Report creation failed: {response.text}"
    created_report = response.json()
    report_id = created_report["id"]
    assert created_report["description"] == report_data["description"]
    assert created_report["category"] == report_data["category"]
    assert created_report["location"] == report_data["location"]

    # 2. Run AI Analysis with RAG
    analyze_response = client.post(f"/api/reports/{report_id}/analyze")
    assert analyze_response.status_code == 200, f"Analysis failed: {analyze_response.text}"
    analysis = analyze_response.json()

    # 3. Verify RAG Analysis Fields
    assert analysis["report_id"] == report_id
    assert 1 <= analysis["priority_score"] <= 10
    assert 0.0 <= analysis["confidence"] <= 1.0
    assert isinstance(analysis["root_cause"], str) and len(analysis["root_cause"]) > 0
    assert isinstance(analysis["recommended_action"], str) and len(analysis["recommended_action"]) > 0
    assert isinstance(analysis["impact_estimate"], str) and len(analysis["impact_estimate"]) > 0
    assert isinstance(analysis["model_name"], str) and len(analysis["model_name"]) > 0

    # 4. Verify RAG Sources
    sources = analysis.get("retrieved_sources")
    assert sources is not None, "retrieved_sources field should be present"
    assert isinstance(sources, list), "retrieved_sources should be a list"
    assert len(sources) > 0, "RAG should retrieve at least 1 source"

    source_names = [s["source"] for s in sources]
    assert "waste-management.md" in source_names or "sdg11.md" in source_names, f"Expected waste source, got {source_names}"
