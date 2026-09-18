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
        raise HTTPException(status_code=422, detail=str(exc))
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
