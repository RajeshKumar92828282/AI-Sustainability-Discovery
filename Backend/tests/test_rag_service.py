"""
Unit tests for RAG Retrieval Service.
"""

import pytest
from app.services.rag_service import initialize_knowledge_base, retrieve_context, get_retrieval_engine_name


@pytest.fixture(scope="module", autouse=True)
def init_kb():
    success = initialize_knowledge_base()
    assert success is True, "Knowledge base failed to initialize."


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
