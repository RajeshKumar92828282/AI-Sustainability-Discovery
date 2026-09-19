"""
Tests for the Sustainability Agent Service.

8 tests covering:
1.  Waste report → tool selection includes get_report + retrieve_knowledge
2.  Water report → tool selection includes get_report + retrieve_knowledge
3.  Advanced-status report → get_report_history is selected
4.  Community-level category → get_dashboard_stats is selected
5.  Agent never changes report status (read-only safety check)
6.  RAG source is present in analysis context
7.  Fallback agent works without any external API credentials
8.  Existing RAG tests still pass (imported and run here as regression check)
"""

import os
import pytest
from unittest.mock import patch, MagicMock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# ── In-memory DB setup ───────────────────────────────────────────────────────

from app.db.database import Base
import app.models  # noqa: registers all models

TEST_DB_URL = "sqlite:///:memory:"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="module")
def db():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="module")
def sample_report(db):
    """Create a minimal in-memory report for agent tests."""
    from app.models.report import Report
    from datetime import datetime
    r = Report(
        description="Overflowing waste bins near the college entrance causing hygiene issues",
        category="waste",
        location="College Entrance",
        status="submitted",
        created_at=datetime.utcnow(),
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return r


@pytest.fixture(scope="module")
def advanced_report(db):
    """Report with an advanced status to trigger get_report_history selection."""
    from app.models.report import Report
    from datetime import datetime
    r = Report(
        description="Water leaking from a tap in the second floor washroom",
        category="water",
        location="Second Floor Washroom",
        status="under_review",
        created_at=datetime.utcnow(),
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return r


# ── Helper: build report_data dict ───────────────────────────────────────────

def _rd(description: str, category: str, location: str = "Campus", status: str = "submitted") -> dict:
    return {"description": description, "category": category, "location": location, "status": status}


# ── Tests ─────────────────────────────────────────────────────────────────────

# Test 1 ─ Waste report tool selection
def test_waste_report_tool_selection():
    """
    A simple waste report should always select get_report and retrieve_knowledge.
    """
    from app.services.agent_service import _select_tools_deterministic

    report_data = _rd(
        description="Overflowing waste bins near the college entrance",
        category="waste",
    )
    result = _select_tools_deterministic(report_data)

    assert "get_report" in result["selected_tools"], "get_report must always be selected"
    assert "retrieve_knowledge" in result["selected_tools"], "retrieve_knowledge must always be selected"
    assert isinstance(result["reasoning_summary"], str) and len(result["reasoning_summary"]) > 0
    assert result.get("planner") == "deterministic"


# Test 2 ─ Water report tool selection
def test_water_report_tool_selection():
    """
    A water report should select get_report and retrieve_knowledge,
    and get_dashboard_stats because water is a high-community category.
    """
    from app.services.agent_service import _select_tools_deterministic

    report_data = _rd(
        description="Taps left running in washrooms",
        category="water",
    )
    result = _select_tools_deterministic(report_data)

    assert "get_report" in result["selected_tools"]
    assert "retrieve_knowledge" in result["selected_tools"]
    # water is in high_community_categories → should include dashboard stats
    assert "get_dashboard_stats" in result["selected_tools"], (
        "Water category is in high_community_categories — get_dashboard_stats expected"
    )


# Test 3 ─ Advanced-status report triggers get_report_history
def test_advanced_status_includes_history():
    """
    A report with status 'under_review' (non-submitted) should trigger
    get_report_history selection.
    """
    from app.services.agent_service import _select_tools_deterministic

    report_data = _rd(
        description="Lights left on in empty classrooms",
        category="energy",
        status="under_review",
    )
    result = _select_tools_deterministic(report_data)

    assert "get_report_history" in result["selected_tools"], (
        "Under_review status should trigger get_report_history selection"
    )


# Test 4 ─ Community keywords trigger get_dashboard_stats
def test_community_context_includes_dashboard_stats():
    """
    A report mentioning campus-wide context should include get_dashboard_stats.
    """
    from app.services.agent_service import _select_tools_deterministic

    report_data = _rd(
        description="Plastic waste is everywhere across the whole campus community",
        category="plastic",
        status="submitted",
    )
    result = _select_tools_deterministic(report_data)

    assert "get_dashboard_stats" in result["selected_tools"], (
        "Community keyword 'everywhere' or 'campus' should trigger get_dashboard_stats"
    )


# Test 5 ─ Agent never changes report status (read-only safety)
def test_agent_does_not_change_report_status(db, sample_report):
    """
    After running the agent, the report's status must remain 'submitted'.
    The agent must not perform any status-changing operations.
    """
    from app.services.agent_service import run_sustainability_agent
    from app.services.report_service import get_report as svc_get_report

    initial_status = sample_report.status

    # Patch the AI provider to avoid real API calls
    with patch("app.services.agent_service.has_gemini", False, create=True):
        try:
            run_sustainability_agent(report_id=sample_report.id, db=db)
        except Exception:
            pass  # Even if agent errors, status must be unchanged

    # Reload from DB and verify status is unchanged
    db.expire(sample_report)
    refreshed = svc_get_report(db, sample_report.id)
    assert refreshed is not None
    assert refreshed.status == initial_status, (
        f"Agent must not change report status. Expected '{initial_status}', got '{refreshed.status}'"
    )


# Test 6 ─ RAG source appears in agent output
def test_rag_source_in_agent_context(sample_report):
    """
    retrieve_knowledge tool should return at least one knowledge source
    with source filename, score, and content fields.
    """
    from app.services.agent_service import _tool_retrieve_knowledge

    query = f"{sample_report.category} at {sample_report.location}: {sample_report.description}"
    result = _tool_retrieve_knowledge(query)

    assert result["tool"] == "retrieve_knowledge"
    assert result["status"] == "success"
    assert isinstance(result["results"], list)
    assert len(result["results"]) > 0, "RAG should return at least one knowledge chunk"

    first = result["results"][0]
    assert "source" in first, "Each result must have 'source'"
    assert "score" in first, "Each result must have 'score'"
    assert "excerpt" in first or "content" in first, "Each result must have 'excerpt' or 'content'"
    assert first["source"].endswith(".md"), f"Source should be a .md file, got: {first['source']}"


# Test 7 ─ Fallback agent works without external API credentials
def test_fallback_agent_without_api_credentials(db, sample_report):
    """
    The agent must produce a valid AnalysisResult even when no external API
    is configured (Gemini key absent or placeholder).
    """
    from app.services.agent_service import run_sustainability_agent
    from app.services.ai_service import AnalysisResult

    # Override environment to ensure no API is used
    with patch.dict(os.environ, {
        "GEMINI_API_KEY": "placeholder",
        "WATSONX_API_KEY": "",
    }):
        output = run_sustainability_agent(report_id=sample_report.id, db=db)

    # Validate agent output structure
    assert "analysis" in output
    assert "agent_selected_tools" in output
    assert "agent_reasoning" in output
    assert "agent_tool_results" in output

    analysis = output["analysis"]
    assert isinstance(analysis, AnalysisResult)
    assert 1 <= analysis.priority_score <= 10, "Priority score must be between 1 and 10"
    assert 0.0 <= analysis.confidence <= 1.0, "Confidence must be between 0.0 and 1.0"
    assert isinstance(analysis.root_cause, str) and len(analysis.root_cause) > 0
    assert isinstance(analysis.recommended_action, str) and len(analysis.recommended_action) > 0
    assert isinstance(analysis.retrieved_sources, list)

    selected = output["agent_selected_tools"]
    assert "get_report" in selected
    assert "retrieve_knowledge" in selected

    # Verify the model name clearly indicates fallback (no false live-AI claims)
    assert "Fallback" in analysis.model_name or "Deterministic" in analysis.model_name or \
           "Simulated" in analysis.model_name or "Agent" in analysis.model_name, (
        f"Model name should indicate fallback, got: '{analysis.model_name}'"
    )


# Test 8 ─ Existing RAG tests still pass (regression)
def test_existing_rag_tests_still_pass():
    """
    Regression: ensure original RAG retrieval is unbroken by agent additions.
    Tests all 4 core RAG categories.
    """
    from app.services.rag_service import initialize_knowledge_base, retrieve_context

    # KB should already be initialised from prior module scope — but ensure it's ready
    ok = initialize_knowledge_base()
    assert ok is True, "Knowledge base must initialise successfully"

    test_cases = [
        ("overflowing waste bins near college entrance", "waste-management.md"),
        ("save electricity in buildings and reduce power loss", "energy-efficiency.md"),
        ("water wastage leaking tap pipe rupture", "water-conservation.md"),
        ("air pollution vehicle exhaust smoke campus", "air-quality.md"),
    ]

    for query, expected_source in test_cases:
        results = retrieve_context(query, top_k=5)
        assert len(results) > 0, f"No results for query: '{query}'"
        sources = [r["source"] for r in results]
        assert expected_source in sources, (
            f"Expected '{expected_source}' in results for query '{query}'. Got: {sources}"
        )
