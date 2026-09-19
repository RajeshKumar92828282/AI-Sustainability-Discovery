"""
Sustainability Agent Service — AI Sustainability Discovery.

Architecture:
    Report → Agent Planner (tool selection) → Tool Execution → Grounded Analysis

The agent has access to 4 read-only tools:
    1. retrieve_knowledge  — Search RAG knowledge base (wraps rag_service.py)
    2. get_report          — Load report details from DB
    3. get_report_history  — Load report status history from DB
    4. get_dashboard_stats — Load aggregate campus statistics from DB

Tool selection:
    • If Gemini API is configured: LLM selects tools via a structured JSON prompt.
    • Otherwise:          deterministic rule-based selection.

The agent NEVER performs write operations or status changes.
Human reviewers remain responsible for all operational decisions.
"""

import os
import json
import re
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional

from sqlalchemy.orm import Session

from app.services.rag_service import retrieve_context
from app.services.ai_service import (
    AnalysisResult,
    _parse_model_response,
    _simulated_analysis,
)

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────
# Tool Definitions (all read-only)
# ──────────────────────────────────────────────

AVAILABLE_TOOLS = [
    {
        "name": "get_report",
        "description": "Retrieve current report details (description, category, location, status).",
    },
    {
        "name": "retrieve_knowledge",
        "description": "Search the sustainability RAG knowledge base for relevant evidence.",
    },
    {
        "name": "get_report_history",
        "description": "Retrieve the status change history of this report for lifecycle context.",
    },
    {
        "name": "get_dashboard_stats",
        "description": "Retrieve campus-wide aggregate sustainability statistics for community context.",
    },
]


def _tool_retrieve_knowledge(query: str) -> Dict[str, Any]:
    """Tool 1: Search the existing RAG knowledge base. Wraps rag_service.retrieve_context."""
    try:
        raw_results = retrieve_context(query, top_k=5)
        # Deduplicate by source, keep best score
        seen: dict = {}
        for r in raw_results:
            src = r["source"]
            if src not in seen or r["score"] > seen[src]["score"]:
                seen[src] = r
        results = sorted(seen.values(), key=lambda x: x["score"], reverse=True)[:3]

        return {
            "tool": "retrieve_knowledge",
            "status": "success",
            "result_summary": f"Retrieved {len(results)} knowledge source(s) from RAG index.",
            "results": [
                {
                    "source": r["source"],
                    "section": r.get("title", ""),
                    "score": r.get("score", 0.0),
                    "excerpt": r.get("content", "")[:300],
                    "content": r.get("content", ""),
                }
                for r in results
            ],
        }
    except Exception as exc:
        logger.error(f"Tool retrieve_knowledge failed: {exc}")
        return {
            "tool": "retrieve_knowledge",
            "status": "error",
            "result_summary": f"Knowledge retrieval failed: {exc}",
            "results": [],
        }


def _tool_get_report(report_id: int, db: Session) -> Dict[str, Any]:
    """Tool 2: Retrieve report details from the database."""
    try:
        from app.services.report_service import get_report
        report = get_report(db, report_id)
        if report is None:
            return {
                "tool": "get_report",
                "status": "not_found",
                "result_summary": f"Report {report_id} not found.",
                "data": None,
            }
        return {
            "tool": "get_report",
            "status": "success",
            "result_summary": f"Report #{report.id} loaded (category: {report.category}, status: {report.status}).",
            "data": {
                "id": report.id,
                "description": report.description,
                "category": report.category,
                "location": report.location,
                "status": report.status,
                "photo_path": report.photo_path,
                "created_at": report.created_at.isoformat() if report.created_at else None,
            },
        }
    except Exception as exc:
        logger.error(f"Tool get_report failed: {exc}")
        return {"tool": "get_report", "status": "error", "result_summary": str(exc), "data": None}


def _tool_get_report_history(report_id: int, db: Session) -> Dict[str, Any]:
    """Tool 3: Retrieve report status history from the database."""
    try:
        from app.services.report_service import get_report_status_history
        history = get_report_status_history(db, report_id)
        entries = []
        for h in history:
            entries.append({
                "old_status": h.old_status,
                "new_status": h.new_status,
                "note": h.note,
                "changed_at": h.changed_at.isoformat() if h.changed_at else None,
            })
        return {
            "tool": "get_report_history",
            "status": "success",
            "result_summary": f"Retrieved {len(entries)} status history entries.",
            "data": entries,
        }
    except Exception as exc:
        logger.error(f"Tool get_report_history failed: {exc}")
        return {"tool": "get_report_history", "status": "error", "result_summary": str(exc), "data": []}


def _tool_get_dashboard_stats(db: Session) -> Dict[str, Any]:
    """Tool 4: Retrieve campus-wide aggregate sustainability statistics."""
    try:
        from app.services.report_service import get_dashboard_stats
        stats = get_dashboard_stats(db)
        return {
            "tool": "get_dashboard_stats",
            "status": "success",
            "result_summary": f"Campus stats: {stats.get('total', 0)} total reports, {stats.get('resolved', 0)} resolved.",
            "data": stats,
        }
    except Exception as exc:
        logger.error(f"Tool get_dashboard_stats failed: {exc}")
        return {"tool": "get_dashboard_stats", "status": "error", "result_summary": str(exc), "data": {}}


# ──────────────────────────────────────────────
# Agent Planner — Tool Selection
# ──────────────────────────────────────────────

def _select_tools_deterministic(
    report_data: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Rule-based tool selection (used when no live LLM is configured).

    Rules:
      - Always: get_report, retrieve_knowledge
      - get_report_history: if status has advanced past 'submitted' OR description >= 20 words
      - get_dashboard_stats: if category is Waste/Water/Energy OR description mentions campus-community keywords
    """
    selected: List[str] = ["get_report", "retrieve_knowledge"]
    reasons: List[str] = [
        "Report details are always required for analysis.",
        "RAG knowledge retrieval provides evidence-based sustainability grounding.",
    ]

    category = (report_data.get("category") or "").strip().lower()
    description = (report_data.get("description") or "").strip().lower()
    status = (report_data.get("status") or "submitted").strip()

    advanced_statuses = {"under_review", "action_planned", "in_progress", "resolved", "verified"}
    word_count = len(description.split())

    if status in advanced_statuses or word_count >= 20:
        selected.append("get_report_history")
        reasons.append(
            "Status history provides lifecycle context for this report."
            if status in advanced_statuses
            else "Report description is detailed — status history adds context."
        )

    high_community_categories = {"waste", "water", "energy", "food", "air quality", "transport"}
    community_keywords = {"campus", "community", "widespread", "multiple", "everywhere", "general", "whole", "all"}
    desc_words = set(description.split())

    if category in high_community_categories or bool(desc_words & community_keywords):
        selected.append("get_dashboard_stats")
        reasons.append(
            "Campus-wide statistics provide broader impact context for this category."
        )

    return {
        "selected_tools": selected,
        "reasoning_summary": " ".join(reasons),
        "planner": "deterministic",
    }


def _select_tools_with_gemini(
    report_data: Dict[str, Any],
    api_key: str,
) -> Optional[Dict[str, Any]]:
    """
    LLM-based tool selection via Gemini API.
    Sends a structured prompt and parses the JSON tool selection response.
    Returns None on failure (caller falls back to deterministic).
    """
    try:
        import httpx

        tool_list = "\n".join(
            f"  - {t['name']}: {t['description']}" for t in AVAILABLE_TOOLS
        )
        category = report_data.get("category", "")
        location = report_data.get("location") or "Not specified"
        description = report_data.get("description", "")
        status = report_data.get("status", "submitted")

        planner_prompt = f"""You are an AI agent planner for a campus sustainability platform.
Select which tools to execute for analyzing this sustainability report.

REPORT:
- Category: {category}
- Location: {location}
- Status: {status}
- Description: {description}

AVAILABLE TOOLS:
{tool_list}

SELECTION RULES:
1. Always include "get_report" and "retrieve_knowledge".
2. Include "get_report_history" if the report has complex lifecycle context or non-submitted status.
3. Include "get_dashboard_stats" if campus-wide statistics would meaningfully enrich the analysis.
4. Never select tools that modify data.

Respond ONLY with valid JSON (no markdown, no explanation):
{{
  "selected_tools": ["get_report", "retrieve_knowledge"],
  "reasoning_summary": "One or two sentences explaining tool selection."
}}"""

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
        payload = {
            "contents": [{"parts": [{"text": planner_prompt}]}],
            "generationConfig": {"temperature": 0.1, "maxOutputTokens": 300},
        }

        response = httpx.post(url, json=payload, timeout=15.0)
        if response.status_code != 200:
            logger.warning(f"Gemini tool selection returned {response.status_code}")
            return None

        res_data = response.json()
        candidates = res_data.get("candidates", [])
        if not candidates:
            return None
        parts = candidates[0].get("content", {}).get("parts", [])
        if not parts:
            return None
        text = parts[0].get("text", "")

        # Parse JSON from response
        match = re.search(r"\{.*?\}", text, re.DOTALL)
        if not match:
            return None
        parsed = json.loads(match.group())

        raw_tools = parsed.get("selected_tools", [])
        valid_names = {t["name"] for t in AVAILABLE_TOOLS}

        # Always include the mandatory pair and filter to valid tool names
        selected = list(dict.fromkeys(
            ["get_report", "retrieve_knowledge"]
            + [t for t in raw_tools if t in valid_names]
        ))

        return {
            "selected_tools": selected,
            "reasoning_summary": str(parsed.get("reasoning_summary", "Gemini selected tools for analysis.")),
            "planner": "gemini",
        }

    except Exception as exc:
        logger.warning(f"Gemini tool selection failed ({exc}). Falling back to deterministic.")
        return None


# ──────────────────────────────────────────────
# Agent Prompt Builder
# ──────────────────────────────────────────────

def _build_agent_prompt(
    description: str,
    category: str,
    location: Optional[str],
    knowledge_results: List[Dict[str, Any]],
    history_data: Optional[List[Dict[str, Any]]],
    stats_data: Optional[Dict[str, Any]],
    selected_tools: List[str],
    reasoning_summary: str,
) -> str:
    """Build an enriched grounded prompt for the agent analysis call."""
    loc_part = f"Location: {location}" if location else "Location: Not specified"

    # Split knowledge by source type
    campus_blocks = []
    general_blocks = []
    for r in knowledge_results:
        src = r.get("source", "")
        title = r.get("section") or r.get("title", "")
        content = r.get("content", r.get("excerpt", ""))
        score = r.get("score", 0.0)
        block = f"--- SOURCE: {src} (Section: {title}, Relevance: {round(score * 100)}%) ---\n{content}"
        if src == "campus-survey.md":
            campus_blocks.append(block)
        else:
            general_blocks.append(block)

    campus_text = "\n\n".join(campus_blocks) if campus_blocks else "No campus survey evidence matched this query."
    general_text = "\n\n".join(general_blocks) if general_blocks else "No general knowledge matched this query."

    # History context
    history_text = "Not retrieved."
    if history_data is not None:
        if history_data:
            history_text = "\n".join(
                f"  {i+1}. {e.get('old_status', 'Initial')} → {e['new_status']}"
                f"{' (' + e['note'] + ')' if e.get('note') else ''}"
                f" at {e.get('changed_at', '')}"
                for i, e in enumerate(history_data)
            )
        else:
            history_text = "No status transitions yet."

    # Stats context
    stats_text = "Not retrieved."
    if stats_data is not None:
        total = stats_data.get("total", 0)
        resolved = stats_data.get("resolved", 0)
        by_cat = stats_data.get("by_category", {})
        cat_str = ", ".join(f"{k}: {v}" for k, v in list(by_cat.items())[:5]) if by_cat else "none"
        stats_text = (
            f"Total campus reports: {total}. Resolved: {resolved}. "
            f"By category: {cat_str}."
        )

    tools_str = ", ".join(selected_tools)

    return f"""SYSTEM — RESPONSIBLE AI SUSTAINABILITY AGENT:

You are an AI Sustainability Agent. You have run the following tools to gather evidence:
Tools used: {tools_str}
Tool selection reasoning: {reasoning_summary}

RESPONSIBLE AI GROUNDING RULES:
1. Use campus survey evidence as respondent-reported observations — NOT verified operational facts.
2. Clearly distinguish: (A) Campus survey evidence, (B) General sustainability guidance, (C) AI inference.
3. Do NOT invent statistics or claim numbers not present in the retrieved context.
4. Do NOT claim a single observation represents the entire campus.
5. If evidence is weak or insufficient, lower your confidence score and say so.
6. Priority score and confidence are AI-assisted estimates — not objective measurements.
7. Human reviewers make all operational decisions. The agent cannot change report status.
8. Do NOT expose internal chain-of-thought. Recommendations only.

USER REPORT:
- Category: {category}
- {loc_part}
- Description: {description}

A. CAMPUS SURVEY EVIDENCE (respondent-reported observations from campus-survey.md):
{campus_text}

B. GENERAL SUSTAINABILITY KNOWLEDGE (SDG guidance, best practices):
{general_text}

C. REPORT STATUS HISTORY:
{history_text}

D. CAMPUS COMMUNITY STATISTICS:
{stats_text}

Using the above evidence, generate a structured sustainability analysis.
In root_cause: reference campus survey evidence if relevant; state if evidence is limited.
In recommended_action: combine campus-specific observations with general best practice.
In impact_estimate: qualitative only — do not cite numbers not in the retrieved context.
Set confidence lower if retrieved evidence is weak.

Respond ONLY with valid JSON (no markdown, no explanation):
{{
  "category": "{category}",
  "priority_score": <integer 1-10>,
  "confidence": <float 0.0-1.0>,
  "root_cause": "<probable root cause grounded in evidence>",
  "recommended_action": "<specific actionable recommendation>",
  "impact_estimate": "<qualitative environmental impact estimate>"
}}"""


# ──────────────────────────────────────────────
# Agent AI Provider Calls
# ──────────────────────────────────────────────

def _agent_call_gemini(prompt: str, api_key: str, category: str) -> Optional[AnalysisResult]:
    """Call Gemini API with the agent-enriched prompt."""
    try:
        import httpx
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.2, "maxOutputTokens": 800},
        }
        response = httpx.post(url, json=payload, timeout=25.0)
        if response.status_code == 200:
            res_data = response.json()
            candidates = res_data.get("candidates", [])
            if candidates:
                parts = candidates[0].get("content", {}).get("parts", [])
                if parts:
                    text = parts[0].get("text", "")
                    result = _parse_model_response(text, category)
                    result.model_name = "Google Gemini 1.5 Flash (Agentic RAG)"
                    return result
        else:
            logger.warning(f"Gemini agent call returned {response.status_code}: {response.text[:200]}")
    except Exception as exc:
        logger.warning(f"Gemini agent analysis failed: {exc}")
    return None


def _agent_call_watsonx(
    prompt: str,
    category: str,
    location: Optional[str],
    retrieved_sources: List[Dict[str, Any]],
) -> Optional[AnalysisResult]:
    """Call watsonx if configured."""
    api_key = os.getenv("WATSONX_API_KEY", "").strip()
    project_id = os.getenv("WATSONX_PROJECT_ID", "").strip()
    url = os.getenv("WATSONX_URL", "https://us-south.ml.cloud.ibm.com").strip()

    if not api_key or api_key in ("your_ibm_watsonx_api_key_here", "placeholder"):
        return None
    if not project_id or project_id in ("your_project_id_here", "placeholder"):
        return None

    try:
        from ibm_watsonx_ai import APIClient, Credentials
        from ibm_watsonx_ai.foundation_models import ModelInference
        from ibm_watsonx_ai.metanames import GenTextParamsMetaNames as GenParams

        creds = Credentials(url=url, api_key=api_key)
        client = APIClient(credentials=creds, project_id=project_id)
        model = ModelInference(
            model_id="ibm/granite-3-8b-instruct",
            api_client=client,
            params={GenParams.MAX_NEW_TOKENS: 500, GenParams.TEMPERATURE: 0.2},
        )
        response_text = model.generate_text(prompt=prompt)
        result = _parse_model_response(response_text, category)
        result.model_name = "IBM Granite 3 8B Instruct (Agentic watsonx.ai)"
        result.retrieved_sources = retrieved_sources
        return result
    except Exception as exc:
        logger.warning(f"watsonx agent analysis failed: {exc}")
        return None


# ──────────────────────────────────────────────
# Main Agent Entry Point
# ──────────────────────────────────────────────

def run_sustainability_agent(
    report_id: int,
    db: Session,
) -> Dict[str, Any]:
    """
    Run the sustainability agent for a given report.

    Flow:
    1. Load report data (minimal pre-read for planner)
    2. Agent planner selects tools (LLM or deterministic)
    3. Execute only the selected tools
    4. Build enriched grounded prompt
    5. Call AI provider (Gemini → watsonx → deterministic fallback)
    6. Return structured result with agent metadata

    The agent NEVER modifies any data or changes report status.
    """
    # ── Step 1: Minimal pre-read for the planner ──────────────────────────
    from app.services.report_service import get_report as svc_get_report

    report = svc_get_report(db, report_id)
    if report is None:
        raise ValueError(f"Report {report_id} not found.")

    report_data_for_planner = {
        "id": report.id,
        "description": report.description,
        "category": report.category,
        "location": report.location,
        "status": report.status,
    }

    # ── Step 2: Agent planner — tool selection ────────────────────────────
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
    has_gemini = bool(gemini_key) and gemini_key not in ("your_gemini_api_key_here", "placeholder", "")

    tool_plan: Optional[Dict[str, Any]] = None
    if has_gemini:
        tool_plan = _select_tools_with_gemini(report_data_for_planner, gemini_key)

    if tool_plan is None:
        tool_plan = _select_tools_deterministic(report_data_for_planner)

    selected_tools: List[str] = tool_plan["selected_tools"]
    reasoning_summary: str = tool_plan["reasoning_summary"]
    planner_used: str = tool_plan.get("planner", "deterministic")

    logger.info(
        f"Agent planner ({planner_used}) selected tools for report {report_id}: {selected_tools}"
    )

    # ── Step 3: Execute selected tools ────────────────────────────────────
    tool_results: List[Dict[str, Any]] = []
    knowledge_results: List[Dict[str, Any]] = []
    history_data: Optional[List[Dict[str, Any]]] = None
    stats_data: Optional[Dict[str, Any]] = None

    for tool_name in selected_tools:
        if tool_name == "get_report":
            result = _tool_get_report(report_id, db)
            tool_results.append(result)

        elif tool_name == "retrieve_knowledge":
            # Build rich query: category + location + description
            location_part = f" at {report.location}" if report.location else ""
            query = f"{report.category}{location_part}: {report.description}"
            result = _tool_retrieve_knowledge(query)
            knowledge_results = result.get("results", [])
            tool_results.append({
                "tool": result["tool"],
                "status": result["status"],
                "result_summary": result["result_summary"],
            })

        elif tool_name == "get_report_history":
            result = _tool_get_report_history(report_id, db)
            history_data = result.get("data", [])
            tool_results.append({
                "tool": result["tool"],
                "status": result["status"],
                "result_summary": result["result_summary"],
            })

        elif tool_name == "get_dashboard_stats":
            result = _tool_get_dashboard_stats(db)
            stats_data = result.get("data", {})
            tool_results.append({
                "tool": result["tool"],
                "status": result["status"],
                "result_summary": result["result_summary"],
            })

    # ── Step 4: Build enriched prompt ────────────────────────────────────
    agent_prompt = _build_agent_prompt(
        description=report.description,
        category=report.category,
        location=report.location,
        knowledge_results=knowledge_results,
        history_data=history_data,
        stats_data=stats_data,
        selected_tools=selected_tools,
        reasoning_summary=reasoning_summary,
    )

    # Build retrieved_sources list (for storage and frontend display)
    retrieved_sources: List[Dict[str, Any]] = [
        {
            "source": r["source"],
            "title": r.get("section") or r.get("title", ""),
            "score": r.get("score", 0.0),
            "content": r.get("content", r.get("excerpt", "")),
        }
        for r in knowledge_results
    ]

    # ── Step 5: Call AI provider ──────────────────────────────────────────
    analysis_result: Optional[AnalysisResult] = None

    if has_gemini:
        analysis_result = _agent_call_gemini(agent_prompt, gemini_key, report.category)

    if analysis_result is None:
        analysis_result = _agent_call_watsonx(
            agent_prompt, report.category, report.location, retrieved_sources
        )

    if analysis_result is None:
        # Deterministic fallback — still uses the enriched context
        analysis_result = _simulated_analysis(
            description=report.description,
            category=report.category,
            location=report.location,
            retrieved_sources=retrieved_sources,
        )
        analysis_result.model_name = (
            "AI Sustainability Agent (Deterministic Fallback — Live API not configured)"
        )

    # Attach retrieved sources to result
    analysis_result.retrieved_sources = retrieved_sources

    # ── Step 6: Return structured agent output ────────────────────────────
    return {
        "analysis": analysis_result,
        "agent_selected_tools": selected_tools,
        "agent_reasoning": reasoning_summary,
        "agent_tool_results": tool_results,
        "planner_used": planner_used,
    }
