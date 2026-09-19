"""
AI Analysis Service for AI Sustainability Discovery with RAG Integration.

Architecture:
1. Calls RAG service to retrieve relevant sustainability knowledge chunks from `Backend/data/knowledge/`.
2. Formats a grounded prompt combining the user report and retrieved context.
3. Attempts Gemini API if `GEMINI_API_KEY` is configured in environment.
4. Attempts IBM watsonx if `WATSONX_API_KEY` is configured in environment.
5. Falls back to structured rule-based simulation if live providers are unconfigured/unavailable.
6. Returns validated `AnalysisResult` containing report metrics and source attribution.

Security:
- Credentials are read from environment variables only (backend side).
- No secrets are hardcoded or exposed to the browser.
"""

import os
import json
import re
import logging
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field

from app.services.rag_service import retrieve_context

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────
# Structured Output Data Class
# ──────────────────────────────────────────────

@dataclass
class AnalysisResult:
    category: str
    priority_score: int              # 1–10
    confidence: float                # 0.0–1.0
    root_cause: str
    recommended_action: str
    impact_estimate: str
    model_name: str
    # Provenance fields — always set so frontend can distinguish live vs simulated
    provider: str = "Structured Fallback"   # e.g. "Google Gemini", "IBM watsonx", "Structured Fallback"
    is_live: bool = False                   # True only when a real AI API call succeeded
    priority_level: str = "MEDIUM"          # LOW / MEDIUM / HIGH / CRITICAL
    retrieved_sources: List[Dict[str, Any]] = field(default_factory=list)


def _priority_level(score: int) -> str:
    """Convert 1–10 priority score to human-readable level label."""
    if score >= 9:
        return "CRITICAL"
    elif score >= 7:
        return "HIGH"
    elif score >= 4:
        return "MEDIUM"
    else:
        return "LOW"


# ──────────────────────────────────────────────
# Grounded Prompt Construction
# ──────────────────────────────────────────────

def _build_grounded_prompt(
    description: str,
    category: str,
    location: Optional[str],
    retrieved_sources: List[Dict[str, Any]],
) -> str:
    loc_part = f"Location: {location}" if location else "Location: Not specified"

    campus_survey_blocks = []
    general_knowledge_blocks = []
    source_names = []

    for src in retrieved_sources:
        source_name = src['source']
        title = src.get('title', '')
        content = src.get('content', '')
        score = src.get('score', 0.0)
        block = f"--- SOURCE: {source_name} (Section: {title}, Relevance: {round(score * 100)}%) ---\n{content}"
        if source_name == "campus-survey.md":
            campus_survey_blocks.append(block)
        else:
            general_knowledge_blocks.append(block)
        source_names.append(source_name)

    if campus_survey_blocks:
        campus_text = "\n\n".join(campus_survey_blocks)
    else:
        campus_text = "No campus survey evidence matched this query."

    if general_knowledge_blocks:
        general_text = "\n\n".join(general_knowledge_blocks)
    else:
        general_text = "No general sustainability guidance matched this query."

    sources_text = ", ".join(source_names) if source_names else "None"

    return f"""SYSTEM — RESPONSIBLE AI SUSTAINABILITY ANALYST:

You are an AI Sustainability Analyst. Your role is to assist human reviewers by analysing
sustainability reports. You must follow these grounding rules strictly:

GROUNDING RULES:
1. Use campus survey evidence (campus-survey.md) when it is relevant to the report — cite it as
   evidence from campus survey respondents, not as verified operational fact.
2. Use general sustainability knowledge documents to provide SDG context and mitigation strategies.
3. Do NOT invent survey statistics or claim numeric measurements that are not in the retrieved sources.
4. Do NOT claim a problem exists across the entire campus based on a single observation.
5. Clearly distinguish: (A) campus survey evidence, (B) general sustainability guidance, (C) your AI inference.
6. If retrieved evidence is weak or not directly relevant, say so and lower your confidence score.
7. Treat priority_score and confidence as AI-assisted estimates, not objective measurements.
8. Human reviewers remain responsible for all operational decisions.

USER REPORT:
- Category: {category}
- {loc_part}
- Description: {description}

A. CAMPUS SURVEY EVIDENCE (from campus-survey.md — respondent-reported observations):
{campus_text}

B. GENERAL SUSTAINABILITY KNOWLEDGE (SDG guidance, best practices):
{general_text}

SOURCE DOCUMENTS USED: {sources_text}

Using the above context, generate a structured analysis. In root_cause, reference campus survey
evidence only if it is genuinely relevant. In recommended_action, combine campus-specific
observations with general best practice. In impact_estimate, keep qualitative — do not cite
numbers not present in the retrieved sources.

Respond ONLY with a valid JSON object matching this schema (no markdown fences, no explanation):
{{
  "category": "{category}",
  "priority_score": <integer between 1 and 10>,
  "confidence": <float between 0.0 and 1.0>,
  "root_cause": "<probable root cause grounded in evidence; note if campus survey evidence is relevant>",
  "recommended_action": "<specific actionable recommendation in 1-2 sentences>",
  "impact_estimate": "<estimated qualitative environmental impact>"
}}"""


# ──────────────────────────────────────────────
# Parser & Validator
# ──────────────────────────────────────────────

def _parse_model_response(text: str, fallback_category: str) -> AnalysisResult:
    """Extracts and validates JSON from LLM output."""
    match = re.search(r'\{.*?\}', text, re.DOTALL)
    if not match:
        raise ValueError("No JSON object found in model response.")

    data = json.loads(match.group())

    priority = int(data.get("priority_score", 5))
    priority = max(1, min(10, priority))

    confidence = float(data.get("confidence", 0.75))
    confidence = max(0.0, min(1.0, confidence))

    return AnalysisResult(
        category=str(data.get("category", fallback_category)),
        priority_score=priority,
        priority_level=_priority_level(priority),
        confidence=confidence,
        root_cause=str(data.get("root_cause", "Unable to determine root cause.")),
        recommended_action=str(data.get("recommended_action", "Further investigation required.")),
        impact_estimate=str(data.get("impact_estimate", "Qualitative impact assessment required.")),
        model_name="AI Provider",
        # provider/is_live are set by the calling provider function after parsing
        provider="Structured Fallback",
        is_live=False,
        retrieved_sources=[],
    )


# ──────────────────────────────────────────────
# Gemini API Provider
# ──────────────────────────────────────────────

def _analyze_with_gemini(
    description: str,
    category: str,
    location: Optional[str],
    retrieved_sources: List[Dict[str, Any]],
    api_key: str,
) -> Optional[AnalysisResult]:
    """Call Google Gemini API via REST endpoint."""
    try:
        import httpx
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
        prompt = _build_grounded_prompt(description, category, location, retrieved_sources)

        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 800,
            }
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
                    result.model_name = "Google Gemini 1.5 Flash (RAG Grounded)"
                    result.provider = "Google Gemini"
                    result.is_live = True
                    result.priority_level = _priority_level(result.priority_score)
                    result.retrieved_sources = retrieved_sources
                    logger.info("Gemini API analysis succeeded — is_live=True, provider=Google Gemini")
                    return result
        else:
            logger.warning(f"Gemini API returned status code {response.status_code}: {response.text[:300]}")
    except Exception as exc:
        logger.warning(f"Gemini API analysis failed: {exc}")

    return None


# ──────────────────────────────────────────────
# Watsonx Provider (if configured)
# ──────────────────────────────────────────────

def _analyze_with_watsonx(
    description: str,
    category: str,
    location: Optional[str],
    retrieved_sources: List[Dict[str, Any]],
) -> Optional[AnalysisResult]:
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
        prompt = _build_grounded_prompt(description, category, location, retrieved_sources)
        response_text = model.generate_text(prompt=prompt)
        result = _parse_model_response(response_text, category)
        result.model_name = "IBM Granite 3 8B Instruct (watsonx.ai - RAG Grounded)"
        result.provider = "IBM watsonx"
        result.is_live = True
        result.priority_level = _priority_level(result.priority_score)
        result.retrieved_sources = retrieved_sources
        return result
    except Exception as exc:
        logger.warning(f"watsonx analysis failed: {exc}")
        return None


# ──────────────────────────────────────────────
# Rule-Based Simulated Analysis (Fallback)
# ──────────────────────────────────────────────

_CATEGORY_RULES: dict = {
    "Waste": {
        "priority_base": 7,
        "root_cause": "Insufficient waste collection frequency or inadequate segregation bin capacity contributing to localized waste accumulation.",
        "recommended_action": "Increase waste collection frequency, install 3-bin source segregation units, and coordinate with campus sanitation managers.",
        "impact_estimate": "Improved public hygiene, reduced odor and health risks, and alignment with SDG 11 (Sustainable Cities) and SDG 12 (Responsible Consumption).",
        "confidence_base": 0.82,
    },
    "Water": {
        "priority_base": 8,
        "root_cause": "Water infrastructure leakage, pipeline deterioration, or missing automatic shutoff controls causing resource loss.",
        "recommended_action": "Inspect water pipelines, repair leaky valves, and install automated float switches on storage tanks.",
        "impact_estimate": "Conserving potable water resources, preventing structural dampness, and supporting SDG 6 (Clean Water and Sanitation).",
        "confidence_base": 0.80,
    },
    "Energy": {
        "priority_base": 6,
        "root_cause": "Inefficient lighting fixtures, idle equipment power draw, or lack of automated occupancy controls.",
        "recommended_action": "Upgrade to LED lighting fixtures with occupancy sensors, conduct building energy audits, and shut off standby loads.",
        "impact_estimate": "Reduced electrical energy consumption, lower carbon emissions, and support for SDG 7 (Affordable and Clean Energy).",
        "confidence_base": 0.75,
    },
    "Food": {
        "priority_base": 6,
        "root_cause": "Cafeteria food waste over-procurement and lack of localized composting or food recovery systems.",
        "recommended_action": "Implement food surplus redistribution, set up organic composting, and launch student awareness initiatives.",
        "impact_estimate": "Diverting organic waste from landfills, reducing methane emissions, and addressing SDG 12 (Responsible Consumption).",
        "confidence_base": 0.73,
    },
    "Transport": {
        "priority_base": 5,
        "root_cause": "Overreliance on single-occupancy fossil fuel vehicles and insufficient active transport infrastructure.",
        "recommended_action": "Expand pedestrian pathways, launch campus bicycle sharing, and promote carpooling or electric shuttle buses.",
        "impact_estimate": "Decreased tailpipe emissions, improved local air quality, and alignment with SDG 11 (Sustainable Cities).",
        "confidence_base": 0.70,
    },
    "Air Quality": {
        "priority_base": 8,
        "root_cause": "Vehicle idling near entrance gates, uncontained construction dust, or localized biomass burning.",
        "recommended_action": "Enforce no-vehicle-idling rules, deploy dust suppression water sprays, and plant green bio-filter tree belts.",
        "impact_estimate": "Reduced airborne particulate matter (PM2.5/PM10), enhanced respiratory health, and support for SDG 3 (Good Health).",
        "confidence_base": 0.78,
    },
}

_DEFAULT_RULE = {
    "priority_base": 5,
    "root_cause": "The probable root cause could not be fully determined from available inputs. Field investigation is recommended.",
    "recommended_action": "Document environmental observations, escalate to local facility managers, and monitor for recurring patterns.",
    "impact_estimate": "Addressing this issue will support local environmental quality and community sustainability.",
    "confidence_base": 0.65,
}


def _simulated_analysis(
    description: str,
    category: str,
    location: Optional[str],
    retrieved_sources: List[Dict[str, Any]],
) -> AnalysisResult:
    """
    Structured rule-based analysis used when live AI provider is unconfigured.
    Integrates retrieved RAG knowledge chunks directly into recommendations.
    """
    rule = _CATEGORY_RULES.get(category, _DEFAULT_RULE)

    desc_lower = description.lower()
    priority_adjust = 0

    urgency_keywords = ["overflow", "leak", "flooding", "dangerous", "severe", "critical", "urgent", "broken", "hazardous"]
    for word in urgency_keywords:
        if word in desc_lower:
            priority_adjust += 1
            break

    mild_keywords = ["minor", "small", "slight", "occasional"]
    for word in mild_keywords:
        if word in desc_lower:
            priority_adjust -= 1
            break

    priority = max(1, min(10, rule["priority_base"] + priority_adjust))
    confidence = rule["confidence_base"]

    # Adjust confidence based on RAG retrieval scores
    if retrieved_sources:
        max_score = max(s.get("score", 0.0) for s in retrieved_sources)
        if max_score > 0.6:
            confidence = min(0.95, round(confidence + 0.08, 2))
        elif max_score < 0.2:
            confidence = max(0.40, round(confidence - 0.15, 2))
    else:
        confidence = 0.50

    location_note = f" (Reported at: {location})" if location else ""
    rec_action = rule["recommended_action"]

    # Incorporate top retrieved recommendation if available
    if retrieved_sources:
        top_source = retrieved_sources[0]
        rec_action = f"{rec_action} Grounded in project knowledge ({top_source['source']})."

    return AnalysisResult(
        category=category,
        priority_score=priority,
        priority_level=_priority_level(priority),
        confidence=confidence,
        root_cause=rule["root_cause"],
        recommended_action=rec_action,
        impact_estimate=rule["impact_estimate"] + location_note,
        model_name="AI-Assisted Analysis (Simulated — Live AI provider not configured)",
        provider="Structured Fallback",
        is_live=False,
        retrieved_sources=retrieved_sources,
    )


# ──────────────────────────────────────────────
# Public API Entry Point
# ──────────────────────────────────────────────

def analyze_report(
    description: str,
    category: str,
    location: Optional[str] = None,
) -> AnalysisResult:
    """
    Main RAG AI analysis entrypoint.
    1. Retrieves relevant sustainability knowledge from `Backend/data/knowledge/`.
    2. Builds grounded prompt.
    3. Calls Gemini API if GEMINI_API_KEY is configured.
    4. Calls watsonx if WATSONX_API_KEY is configured.
    5. Falls back to structured RAG simulation.
    """
    # Step 1: Perform RAG retrieval — build query from category + location + description
    location_part = f" at {location}" if location else ""
    query_text = f"{category}{location_part}: {description}"
    retrieved_sources = retrieve_context(query_text, top_k=5)
    # Deduplicate: keep best score per source file, then take top 3
    seen_sources: dict = {}
    for src in retrieved_sources:
        src_name = src["source"]
        if src_name not in seen_sources or src["score"] > seen_sources[src_name]["score"]:
            seen_sources[src_name] = src
    retrieved_sources = sorted(seen_sources.values(), key=lambda x: x["score"], reverse=True)[:3]
    logger.info(f"RAG retrieved {len(retrieved_sources)} deduplicated sources for report query: '{query_text[:80]}'")

    # Step 2: Check Gemini API Key
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
    if gemini_key and gemini_key not in ("your_gemini_api_key_here", "placeholder", ""):
        logger.info("Attempting Google Gemini API analysis...")
        res = _analyze_with_gemini(description, category, location, retrieved_sources, gemini_key)
        if res:
            logger.info("Gemini API analysis succeeded.")
            return res

    # Step 3: Check Watsonx Credentials
    res = _analyze_with_watsonx(description, category, location, retrieved_sources)
    if res:
        logger.info("watsonx.ai analysis succeeded.")
        return res

    # Step 4: Fallback to structured simulation
    logger.info("Using structured RAG simulated analysis (Live AI provider not configured).")
    return _simulated_analysis(description, category, location, retrieved_sources)
