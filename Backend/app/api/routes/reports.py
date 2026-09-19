import os
import uuid
import json
import logging

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.analysis import ReportAnalysis
from app.schemas.report import ReportResponse, StatusUpdateRequest
from app.schemas.analysis import ReportAnalysisResponse
from app.schemas.status_history import StatusHistoryResponse
from app.services.report_service import (
    create_report,
    get_reports,
    get_report,
    update_report_status,
    get_report_status_history,
    get_dashboard_stats,
)
from app.services.ai_service import analyze_report
from app.services.agent_service import run_sustainability_agent

logger = logging.getLogger(__name__)


router = APIRouter(prefix="/api/reports", tags=["Reports"])

UPLOAD_DIR = "uploads/reports"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ──────────────────────────────────────────────
# Stats (must be before /{report_id} to avoid routing conflict)
# ──────────────────────────────────────────────

@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    """Return aggregate dashboard statistics from real database data."""
    return get_dashboard_stats(db)


# ──────────────────────────────────────────────
# Gemini Diagnostic (Task 2)
# ──────────────────────────────────────────────

@router.get("/gemini-status")
def gemini_status():
    """
    Diagnostic endpoint: verifies Gemini API key is loaded and optionally tests connectivity.
    Does NOT expose the actual key value.
    """
    import os
    key = os.getenv("GEMINI_API_KEY", "").strip()
    placeholder_values = {"your_gemini_api_key_here", "placeholder", ""}
    configured = bool(key) and key not in placeholder_values

    key_hint = f"{key[:6]}...{key[-4:]}" if configured and len(key) >= 10 else "not set"

    if not configured:
        return {
            "gemini_configured": False,
            "key_hint": key_hint,
            "message": "GEMINI_API_KEY is not set or is a placeholder. Set it in Backend/.env.",
        }

    # Attempt a minimal live test (list models probe)
    try:
        import httpx
        probe_url = (
            f"https://generativelanguage.googleapis.com/v1beta/models"
            f"?key={key}&pageSize=1"
        )
        resp = httpx.get(probe_url, timeout=10.0)
        if resp.status_code == 200:
            return {
                "gemini_configured": True,
                "key_hint": key_hint,
                "gemini_request": "SUCCESS",
                "message": "Gemini API key is valid and connectivity confirmed.",
            }
        else:
            return {
                "gemini_configured": True,
                "key_hint": key_hint,
                "gemini_request": "FAILED",
                "status_code": resp.status_code,
                "error_category": "API_ERROR",
                "message": f"Key loaded but Gemini returned HTTP {resp.status_code}. Check key validity.",
            }
    except Exception as exc:
        err_type = type(exc).__name__
        return {
            "gemini_configured": True,
            "key_hint": key_hint,
            "gemini_request": "FAILED",
            "error_category": err_type,
            "message": f"Key loaded but connectivity test failed: {err_type}.",
        }


# ──────────────────────────────────────────────
# Create Report
# ──────────────────────────────────────────────

@router.post("", response_model=ReportResponse, status_code=201)
async def submit_report(
    description: str = Form(...),
    category: str = Form(...),
    location: str | None = Form(None),
    photo: UploadFile | None = File(None),
    db: Session = Depends(get_db),
):
    if not description.strip():
        raise HTTPException(status_code=400, detail="Description cannot be empty.")

    if not category.strip():
        raise HTTPException(status_code=400, detail="Category cannot be empty.")

    photo_path = None

    if photo is not None:
        content_type = (photo.content_type or "").lower()
        filename_lower = (photo.filename or "").lower()

        is_jpg = content_type in ("image/jpeg", "image/jpg") or filename_lower.endswith((".jpg", ".jpeg"))
        is_png = content_type == "image/png" or filename_lower.endswith(".png")

        if not (is_jpg or is_png):
            raise HTTPException(status_code=400, detail="Only JPG and PNG images are allowed.")

        contents = await photo.read()

        if len(contents) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Image must be smaller than 5 MB.")

        extension = ".png" if is_png else ".jpg"
        filename = f"{uuid.uuid4()}{extension}"
        photo_path = f"{UPLOAD_DIR}/{filename}"

        with open(photo_path, "wb") as file:
            file.write(contents)

    return create_report(
        db=db,
        description=description.strip(),
        category=category.strip(),
        location=location.strip() if location else None,
        photo_path=photo_path,
    )


# ──────────────────────────────────────────────
# List Reports
# ──────────────────────────────────────────────

@router.get("", response_model=list[ReportResponse])
def list_reports(db: Session = Depends(get_db)):
    return get_reports(db)


# ──────────────────────────────────────────────
# Get Single Report
# ──────────────────────────────────────────────

@router.get("/{report_id}", response_model=ReportResponse)
def read_report(report_id: int, db: Session = Depends(get_db)):
    report = get_report(db, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found.")
    return report


# ──────────────────────────────────────────────
# Update Status
# ──────────────────────────────────────────────

@router.patch("/{report_id}/status", response_model=ReportResponse)
def update_status(
    report_id: int,
    body: StatusUpdateRequest,
    db: Session = Depends(get_db),
):
    """
    Update the lifecycle status of a report.
    Only the 6 predefined statuses are accepted.
    Creates a status history entry on every change.
    """
    report = get_report(db, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found.")

    try:
        updated = update_report_status(
            db=db,
            report=report,
            new_status=body.status,
            note=body.note,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.error("Status update failed: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to update report status.")

    return updated


# ──────────────────────────────────────────────
# Status History
# ──────────────────────────────────────────────

@router.get("/{report_id}/history", response_model=list[StatusHistoryResponse])
def get_history(report_id: int, db: Session = Depends(get_db)):
    """Return the full status history for a report in chronological order."""
    report = get_report(db, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found.")
    return get_report_status_history(db, report_id)


# ──────────────────────────────────────────────
# AI Analysis
# ──────────────────────────────────────────────

@router.post("/{report_id}/analyze", response_model=ReportAnalysisResponse)
def run_analysis(report_id: int, db: Session = Depends(get_db)):
    """
    Run AI analysis on a sustainability report.
    - Loads the report from the database.
    - Sends description, category, and location to the AI service.
    - Stores the structured result in report_analysis table.
    - Returns the validated analysis.
    Note: Re-running replaces any existing analysis for this report.
    """
    report = get_report(db, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found.")

    try:
        result = analyze_report(
            description=report.description,
            category=report.category,
            location=report.location,
        )
    except Exception as exc:
        logger.error("AI analysis failed for report %d: %s", report_id, exc)
        raise HTTPException(
            status_code=503,
            detail="AI analysis service is temporarily unavailable. Please try again.",
        )

    # Upsert: delete existing analysis and create new one
    existing = db.query(ReportAnalysis).filter(ReportAnalysis.report_id == report_id).first()
    if existing:
        db.delete(existing)
        db.commit()

    analysis = ReportAnalysis(
        report_id=report_id,
        category=result.category,
        priority_score=result.priority_score,
        confidence=result.confidence,
        root_cause=result.root_cause,
        recommended_action=result.recommended_action,
        impact_estimate=result.impact_estimate,
        model_name=result.model_name,
        provider=result.provider,
        is_live=result.is_live,
        retrieved_sources=json.dumps(result.retrieved_sources) if result.retrieved_sources else None,
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    return analysis


@router.get("/{report_id}/analysis", response_model=ReportAnalysisResponse)
def get_analysis(report_id: int, db: Session = Depends(get_db)):
    """Retrieve existing AI analysis for a report (if it has been run)."""
    report = get_report(db, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found.")

    analysis = db.query(ReportAnalysis).filter(ReportAnalysis.report_id == report_id).first()
    if analysis is None:
        raise HTTPException(status_code=404, detail="No AI analysis found for this report. Run analysis first.")

    return analysis


# ──────────────────────────────────────────────
# AI Agent Analysis
# ──────────────────────────────────────────────

@router.post("/{report_id}/agent-analyze", response_model=ReportAnalysisResponse)
def run_agent_analysis(report_id: int, db: Session = Depends(get_db)):
    """
    Run Agentic AI analysis on a sustainability report.

    The agent:
    1. Decides which tools to use (get_report, retrieve_knowledge,
       get_report_history, get_dashboard_stats) based on the report context.
    2. Executes only the selected tools.
    3. Builds a grounded prompt from collected evidence.
    4. Calls the configured AI provider (Gemini → watsonx → deterministic fallback).
    5. Saves analysis + agent metadata in report_analysis table.

    The agent NEVER changes report status — human reviewers control all transitions.
    Existing /analyze endpoint is NOT affected.
    """
    report = get_report(db, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found.")

    try:
        agent_output = run_sustainability_agent(report_id=report_id, db=db)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        logger.error("Agent analysis failed for report %d: %s", report_id, exc)
        raise HTTPException(
            status_code=503,
            detail="AI agent service is temporarily unavailable. Please try again.",
        )

    result = agent_output["analysis"]

    # Upsert: delete existing analysis record and insert fresh one
    existing = db.query(ReportAnalysis).filter(ReportAnalysis.report_id == report_id).first()
    if existing:
        db.delete(existing)
        db.commit()

    analysis = ReportAnalysis(
        report_id=report_id,
        category=result.category,
        priority_score=result.priority_score,
        confidence=result.confidence,
        root_cause=result.root_cause,
        recommended_action=result.recommended_action,
        impact_estimate=result.impact_estimate,
        model_name=result.model_name,
        provider=result.provider,
        is_live=result.is_live,
        retrieved_sources=json.dumps(result.retrieved_sources) if result.retrieved_sources else None,
        # Agent-specific fields
        agent_selected_tools=json.dumps(agent_output["agent_selected_tools"]),
        agent_reasoning=agent_output["agent_reasoning"],
        agent_tool_results=json.dumps(agent_output["agent_tool_results"]),
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    return analysis
