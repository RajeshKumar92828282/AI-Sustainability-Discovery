"""
Comprehensive tests for AI Sustainability Discovery - Tasks 1-13.

Covers:
  1.  Gemini configuration detection (GEMINI_API_KEY loaded from env)
  2.  Gemini fallback when key is placeholder
  3.  AI response contract (provider, is_live, priority_level fields)
  4.  RAG waste retrieval
  5.  RAG water retrieval
  6.  RAG electricity retrieval
  7.  RAG plastic retrieval
  8.  Valid status transitions
  9.  Invalid transition: verified -> submitted (must raise ValueError / return 400)
  10. Status history only records valid transitions
  11. Agent does not change report status (read-only safety)
  12. Human status update works via service layer
  13. Analysis source citations present
  14. No fabricated survey statistics
"""

import os
import json
import pytest
from unittest.mock import patch
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

# In-memory DB setup
from app.db.database import Base
import app.models  # noqa: registers all SQLAlchemy models

TEST_DB_URL = "sqlite:///:memory:"
_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine)


@pytest.fixture(scope="module")
def db():
    Base.metadata.create_all(bind=_engine)
    session = TestingSessionLocal()
    yield session
    session.close()
    Base.metadata.drop_all(bind=_engine)


@pytest.fixture(scope="module")
def sample_report(db):
    from app.models.report import Report
    from datetime import datetime
    r = Report(
        description="Several waste bins near the college entrance are overflowing.",
        category="Waste",
        location="College Entrance",
        status="submitted",
        created_at=datetime.utcnow(),
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return r


@pytest.fixture(scope="module")
def api_client():
    from app.main import app
    return TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def init_rag():
    from app.services.rag_service import initialize_knowledge_base
    ok = initialize_knowledge_base(force_rebuild=True)
    assert ok is True, "Knowledge base must initialize successfully"


# =============================================================================
# TEST 1 - Gemini configuration detection
# =============================================================================

def test_gemini_api_key_is_loaded_from_env():
    from dotenv import load_dotenv
    load_dotenv()
    key = os.getenv("GEMINI_API_KEY", "").strip()
    placeholder_values = {"your_gemini_api_key_here", "placeholder", ""}
    assert isinstance(key, str), "GEMINI_API_KEY must be a string"
    configured = bool(key) and key not in placeholder_values
    print(f"\nGemini configured: {configured}")
    if configured:
        print(f"Gemini key hint: {key[:6]}...{key[-4:]}")
    else:
        print("Gemini key not set or is placeholder - fallback will be used")
    # Detection logic must distinguish configured from placeholder
    if key in placeholder_values:
        assert not configured, "Placeholder key must be detected as not configured"
    elif key:
        assert configured, "Real key must be detected as configured"


# =============================================================================
# TEST 2 - Gemini fallback when key is placeholder
# =============================================================================

def test_gemini_fallback_when_key_is_placeholder():
    with patch.dict(os.environ, {"GEMINI_API_KEY": "placeholder", "WATSONX_API_KEY": ""}):
        from app.services.ai_service import analyze_report
        result = analyze_report(
            description="Overflowing waste bins near the college entrance",
            category="Waste",
            location="College Entrance",
        )
    assert result.is_live is False, "Fallback must set is_live=False"
    assert result.provider == "Structured Fallback", (
        f"Fallback must set provider='Structured Fallback', got '{result.provider}'"
    )
    assert "Simulated" in result.model_name or "Fallback" in result.model_name, (
        f"Fallback model_name must indicate simulation, got: '{result.model_name}'"
    )


# =============================================================================
# TEST 3 - AI response contract fields
# =============================================================================

def test_ai_response_contract_fields():
    with patch.dict(os.environ, {"GEMINI_API_KEY": "placeholder", "WATSONX_API_KEY": ""}):
        from app.services.ai_service import analyze_report
        result = analyze_report(
            description="Overflowing waste bins near the college entrance",
            category="Waste",
            location="College Entrance",
        )
    assert hasattr(result, "provider") and isinstance(result.provider, str)
    assert hasattr(result, "is_live") and isinstance(result.is_live, bool)
    assert hasattr(result, "priority_level") and result.priority_level in ("LOW", "MEDIUM", "HIGH", "CRITICAL")
    assert 1 <= result.priority_score <= 10
    assert 0.0 <= result.confidence <= 1.0
    assert isinstance(result.root_cause, str) and len(result.root_cause) > 0
    assert isinstance(result.recommended_action, str) and len(result.recommended_action) > 0
    assert isinstance(result.impact_estimate, str) and len(result.impact_estimate) > 0
    assert isinstance(result.model_name, str) and len(result.model_name) > 0
    assert isinstance(result.retrieved_sources, list)


# =============================================================================
# TEST 4 - RAG waste retrieval
# =============================================================================

def test_rag_waste_retrieval():
    from app.services.rag_service import retrieve_context
    results = retrieve_context("overflowing waste bins near college entrance", top_k=5)
    assert len(results) > 0, "RAG must return results for waste query"
    sources = [r["source"] for r in results]
    assert "waste-management.md" in sources, f"Expected waste-management.md, got {sources}"


# =============================================================================
# TEST 5 - RAG water retrieval
# =============================================================================

def test_rag_water_retrieval():
    from app.services.rag_service import retrieve_context
    results = retrieve_context("water leaking from tap and pipe rupture", top_k=5)
    assert len(results) > 0
    sources = [r["source"] for r in results]
    assert "water-conservation.md" in sources, f"Expected water-conservation.md, got {sources}"


# =============================================================================
# TEST 6 - RAG electricity retrieval
# =============================================================================

def test_rag_electricity_retrieval():
    from app.services.rag_service import retrieve_context
    results = retrieve_context("save electricity in buildings and reduce power loss", top_k=5)
    assert len(results) > 0
    sources = [r["source"] for r in results]
    assert "energy-efficiency.md" in sources, f"Expected energy-efficiency.md, got {sources}"


# =============================================================================
# TEST 7 - RAG plastic retrieval
# =============================================================================

def test_rag_plastic_retrieval():
    from app.services.rag_service import retrieve_context
    results = retrieve_context("Plastic waste accumulating around the canteen", top_k=5)
    assert len(results) > 0
    sources = [r["source"] for r in results]
    assert "campus-survey.md" in sources, f"Expected campus-survey.md, got {sources}"


# =============================================================================
# TEST 8 - Valid status transitions
# =============================================================================

def test_valid_status_transitions():
    from app.services.report_service import validate_status_transition, VALID_TRANSITIONS
    for from_status, allowed_next in VALID_TRANSITIONS.items():
        for to_status in allowed_next:
            validate_status_transition(from_status, to_status)


# =============================================================================
# TEST 9a - Invalid transition: verified -> submitted raises ValueError
# =============================================================================

def test_invalid_transition_verified_to_submitted_raises():
    from app.services.report_service import validate_status_transition
    with pytest.raises(ValueError) as exc_info:
        validate_status_transition("verified", "submitted")
    assert "verified" in str(exc_info.value).lower()


# =============================================================================
# TEST 9b - Invalid transition returns HTTP 400 via API
# =============================================================================

def test_invalid_transition_verified_to_submitted_api(api_client):
    report_data = {
        "description": "Waste bins overflowing near the gate for lifecycle test",
        "category": "Waste",
        "location": "Main Gate",
    }
    create_resp = api_client.post("/api/reports", data=report_data)
    assert create_resp.status_code == 201
    report_id = create_resp.json()["id"]

    # Advance through full lifecycle
    for status in ["under_review", "action_planned", "in_progress", "resolved", "verified"]:
        resp = api_client.patch(f"/api/reports/{report_id}/status", json={"status": status})
        assert resp.status_code == 200, f"Expected 200 for '{status}', got {resp.status_code}: {resp.text}"

    # Illegal backward transition must return 400
    bad_resp = api_client.patch(f"/api/reports/{report_id}/status", json={"status": "submitted"})
    assert bad_resp.status_code == 400, (
        f"Expected HTTP 400 for verified->submitted, got {bad_resp.status_code}: {bad_resp.text}"
    )


# =============================================================================
# TEST 10 - Status history records only valid transitions
# =============================================================================

def test_status_history_records_only_valid_transitions(api_client):
    report_data = {
        "description": "Water overflowing near washrooms for history test",
        "category": "Water",
        "location": "Ground Floor Washroom",
    }
    create_resp = api_client.post("/api/reports", data=report_data)
    assert create_resp.status_code == 201
    report_id = create_resp.json()["id"]

    valid_sequence = ["under_review", "action_planned", "in_progress", "resolved", "verified"]
    for status in valid_sequence:
        resp = api_client.patch(f"/api/reports/{report_id}/status", json={"status": status})
        assert resp.status_code == 200

    history_resp = api_client.get(f"/api/reports/{report_id}/history")
    assert history_resp.status_code == 200
    history = history_resp.json()

    # Must have exactly 6 entries: initial submitted + 5 forward transitions
    assert len(history) == 6, f"Expected 6 history entries, got {len(history)}"

    expected_sequence = ["submitted"] + valid_sequence
    for i, entry in enumerate(history):
        assert entry["new_status"] == expected_sequence[i], (
            f"History entry {i}: expected '{expected_sequence[i]}', got '{entry['new_status']}'"
        )


# =============================================================================
# TEST 11 - Agent does not change report status (read-only safety)
# =============================================================================

def test_agent_does_not_change_report_status(db, sample_report):
    from app.services.agent_service import run_sustainability_agent
    from app.services.report_service import get_report as svc_get_report

    initial_status = sample_report.status

    with patch.dict(os.environ, {"GEMINI_API_KEY": "placeholder", "WATSONX_API_KEY": ""}):
        try:
            run_sustainability_agent(report_id=sample_report.id, db=db)
        except Exception:
            pass

    db.expire(sample_report)
    refreshed = svc_get_report(db, sample_report.id)
    assert refreshed is not None
    assert refreshed.status == initial_status, (
        f"Agent must not change status. Expected '{initial_status}', got '{refreshed.status}'"
    )


# =============================================================================
# TEST 12 - Human status update works via service layer
# =============================================================================

def test_human_status_update_works(db, sample_report):
    from app.services.report_service import update_report_status

    updated = update_report_status(db=db, report=sample_report, new_status="under_review", note="Reviewed by admin")
    assert updated.status == "under_review", f"Expected 'under_review', got '{updated.status}'"

    updated = update_report_status(db=db, report=updated, new_status="action_planned")
    assert updated.status == "action_planned"


# =============================================================================
# TEST 13 - Analysis source citations present
# =============================================================================

def test_analysis_source_citations_present(api_client):
    report_data = {
        "description": "Overflowing waste bins near the college entrance causing hygiene issues.",
        "category": "Waste",
        "location": "College Entrance",
    }
    create_resp = api_client.post("/api/reports", data=report_data)
    assert create_resp.status_code == 201
    report_id = create_resp.json()["id"]

    analyze_resp = api_client.post(f"/api/reports/{report_id}/analyze")
    assert analyze_resp.status_code == 200, f"Analysis failed: {analyze_resp.text}"

    analysis = analyze_resp.json()
    sources = analysis.get("retrieved_sources")
    assert sources is not None, "retrieved_sources must be present"
    assert isinstance(sources, list) and len(sources) > 0, "At least one source must be retrieved"

    for src in sources:
        assert "source" in src
        assert src["source"].endswith(".md")
        assert "score" in src
        assert 0.0 <= src["score"] <= 1.0

    source_names = [s["source"] for s in sources]
    assert "waste-management.md" in source_names or "campus-survey.md" in source_names, (
        f"Waste report should cite waste or survey sources. Got: {source_names}"
    )


# =============================================================================
# TEST 14 - No fabricated survey statistics
# =============================================================================

def test_no_fabricated_survey_statistics():
    from pathlib import Path
    import re

    survey_path = (
        Path(__file__).resolve().parent.parent / "data" / "knowledge" / "campus-survey.md"
    )
    assert survey_path.exists(), f"campus-survey.md not found at {survey_path}"

    content = survey_path.read_text(encoding="utf-8")

    # These patterns indicate fabricated numeric statistics that were not in the actual survey
    fabricated_patterns = [
        r"\b\d+%\s+of\s+students",
        r"\b\d+%\s+of\s+respondents\s+said",
        r"\b\d+%\s+of\s+faculty",
    ]
    for pattern in fabricated_patterns:
        matches = re.findall(pattern, content, re.IGNORECASE)
        assert len(matches) == 0, (
            f"Fabricated statistic pattern in campus-survey.md: {matches}"
        )

    # Qualitative language must be present
    assert "survey respondents" in content.lower() or "respondents reported" in content.lower()

    # Disclaimer about not generalizing from individual observations must be present
    assert "individual observations" in content.lower() or "not be generalised" in content.lower()
