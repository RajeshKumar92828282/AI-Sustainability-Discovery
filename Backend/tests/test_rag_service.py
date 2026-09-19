"""
Unit tests for RAG Retrieval Service.

Includes original 5 tests and 4 new campus-survey.md specific tests.
"""

import pytest
from app.services.rag_service import initialize_knowledge_base, retrieve_context, get_retrieval_engine_name


@pytest.fixture(scope="module", autouse=True)
def init_kb():
    # force_rebuild=True ensures campus-survey.md is indexed even if the module was cached
    success = initialize_knowledge_base(force_rebuild=True)
    assert success is True, "Knowledge base failed to initialize."


# ─── Original Tests (preserved) ─────────────────────────────────────────────

def test_rag_waste_query():
    query = "overflowing waste bins near college entrance"
    results = retrieve_context(query, top_k=3)
    assert len(results) > 0, "No results returned for waste query"
    sources = [r["source"] for r in results]
    assert "waste-management.md" in sources, f"Expected waste-management.md in {sources}"


def test_rag_energy_query():
    query = "save electricity in buildings and reduce power loss"
    results = retrieve_context(query, top_k=3)
    assert len(results) > 0, "No results returned for energy query"
    sources = [r["source"] for r in results]
    assert "energy-efficiency.md" in sources, f"Expected energy-efficiency.md in {sources}"


def test_rag_water_query():
    query = "water wastage due to leaking tap and pipe rupture"
    results = retrieve_context(query, top_k=3)
    assert len(results) > 0, "No results returned for water query"
    sources = [r["source"] for r in results]
    assert "water-conservation.md" in sources, f"Expected water-conservation.md in {sources}"


def test_rag_air_query():
    query = "air pollution from heavy vehicle exhaust and smoke"
    results = retrieve_context(query, top_k=3)
    assert len(results) > 0, "No results returned for air quality query"
    sources = [r["source"] for r in results]
    assert "air-quality.md" in sources, f"Expected air-quality.md in {sources}"


def test_rag_unrelated_query():
    query = "quantum electrodynamics perturbation theory"
    results = retrieve_context(query, top_k=3)
    # System should return results without crashing and assign lower confidence/score
    assert isinstance(results, list)
    if results:
        top_score = results[0]["score"]
        assert top_score <= 0.6, f"Expected low relevance score for unrelated query, got {top_score}"


# ─── Campus Survey RAG Tests (new) ───────────────────────────────────────────

def test_campus_survey_water_washroom_query():
    """
    RAG should retrieve campus-survey.md for water wastage near washrooms.
    campus-survey.md contains direct observations about taps left running near washrooms.
    """
    query = "Water wastage from running taps near washrooms"
    results = retrieve_context(query, top_k=5)
    assert len(results) > 0, "No results returned for campus water washroom query"

    sources = [r["source"] for r in results]
    assert "campus-survey.md" in sources, (
        f"Expected campus-survey.md in results for water/washroom query. Got: {sources}"
    )

    # Verify score and excerpt are present in result
    campus_result = next(r for r in results if r["source"] == "campus-survey.md")
    assert campus_result["score"] >= 0.0, "Score should be a non-negative float"
    assert isinstance(campus_result["content"], str) and len(campus_result["content"]) > 0, (
        "Content/excerpt should be a non-empty string"
    )
    assert campus_result["source"] == "campus-survey.md", "Source filename must be preserved"


def test_campus_survey_electricity_classroom_query():
    """
    RAG should retrieve campus-survey.md for electricity wastage in classrooms.
    campus-survey.md contains observations about AC, fans, and lights in empty classrooms.
    """
    query = "Electricity wasted by AC, fans and lights in empty classrooms"
    results = retrieve_context(query, top_k=5)
    assert len(results) > 0, "No results returned for campus electricity classroom query"

    sources = [r["source"] for r in results]
    assert "campus-survey.md" in sources, (
        f"Expected campus-survey.md in results for electricity/classroom query. Got: {sources}"
    )

    campus_result = next(r for r in results if r["source"] == "campus-survey.md")
    assert campus_result["score"] >= 0.0
    assert isinstance(campus_result["content"], str) and len(campus_result["content"]) > 0


def test_campus_survey_plastic_canteen_query():
    """
    RAG should retrieve campus-survey.md for plastic waste near the canteen.
    campus-survey.md contains observations about single-use plastic accumulation near canteen.
    """
    query = "Plastic waste accumulating around the canteen"
    results = retrieve_context(query, top_k=5)
    assert len(results) > 0, "No results returned for campus plastic canteen query"

    sources = [r["source"] for r in results]
    assert "campus-survey.md" in sources, (
        f"Expected campus-survey.md in results for plastic/canteen query. Got: {sources}"
    )

    campus_result = next(r for r in results if r["source"] == "campus-survey.md")
    assert campus_result["score"] >= 0.0
    assert isinstance(campus_result["content"], str) and len(campus_result["content"]) > 0


def test_campus_survey_food_wastage_mess_query():
    """
    RAG should retrieve campus-survey.md for food wastage in the mess.
    campus-survey.md contains observations about food waste at campus mess/cafeteria.
    """
    query = "Food wastage in the mess and cafeteria"
    results = retrieve_context(query, top_k=5)
    assert len(results) > 0, "No results returned for campus food mess query"

    sources = [r["source"] for r in results]
    assert "campus-survey.md" in sources, (
        f"Expected campus-survey.md in results for food/mess query. Got: {sources}"
    )

    campus_result = next(r for r in results if r["source"] == "campus-survey.md")
    assert campus_result["score"] >= 0.0
    assert isinstance(campus_result["content"], str) and len(campus_result["content"]) > 0


# ─── Retrieval Engine Test ────────────────────────────────────────────────────

def test_retrieval_engine_name():
    """Retrieval engine name should be set and non-empty after initialization."""
    name = get_retrieval_engine_name()
    assert isinstance(name, str) and len(name) > 0, f"Unexpected retrieval engine: '{name}'"
    assert name != "uninitialized", "Retrieval engine should be initialized"


def test_result_schema():
    """Every result must contain source, title, content, and score fields."""
    query = "water leakage in campus washrooms"
    results = retrieve_context(query, top_k=3)
    assert len(results) > 0, "No results for schema validation query"
    for r in results:
        assert "source" in r, f"Missing 'source' in result: {r}"
        assert "title" in r, f"Missing 'title' in result: {r}"
        assert "content" in r, f"Missing 'content' in result: {r}"
        assert "score" in r, f"Missing 'score' in result: {r}"
        assert isinstance(r["score"], float), f"Score must be a float, got: {type(r['score'])}"
        assert 0.0 <= r["score"] <= 1.0, f"Score must be between 0 and 1, got: {r['score']}"
        assert r["source"].endswith(".md"), f"Source should be a .md filename, got: {r['source']}"

