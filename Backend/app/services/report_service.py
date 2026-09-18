from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.models.report import Report
from app.models.status_history import ReportStatusHistory

ALLOWED_STATUSES = [
    "submitted",
    "under_review",
    "action_planned",
    "in_progress",
    "resolved",
    "verified",
]


def create_report(
    db: Session,
    description: str,
    category: str,
    location: Optional[str] = None,
    photo_path: Optional[str] = None,
) -> Report:
    report = Report(
        description=description,
        category=category,
        location=location,
        photo_path=photo_path,
        status="submitted",
    )

    db.add(report)
    db.commit()
    db.refresh(report)

    # Record initial status in history
    _record_status_history(
        db=db,
        report_id=report.id,
        old_status=None,
        new_status="submitted",
        note="Report submitted",
    )

    return report


def get_reports(db: Session):
    return (
        db.query(Report)
        .order_by(Report.created_at.desc())
        .all()
    )


def get_report(db: Session, report_id: int) -> Optional[Report]:
    return (
        db.query(Report)
        .filter(Report.id == report_id)
        .first()
    )


def update_report_status(
    db: Session,
    report: Report,
    new_status: str,
    note: Optional[str] = None,
) -> Report:
    """Update the status of a report and record the change in history."""
    if new_status not in ALLOWED_STATUSES:
        raise ValueError(f"Invalid status: {new_status}")

    old_status = report.status

    report.status = new_status
    report.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(report)

    # Record history entry
    _record_status_history(
        db=db,
        report_id=report.id,
        old_status=old_status,
        new_status=new_status,
        note=note,
    )

    return report


def get_report_status_history(db: Session, report_id: int):
    return (
        db.query(ReportStatusHistory)
        .filter(ReportStatusHistory.report_id == report_id)
        .order_by(ReportStatusHistory.changed_at.asc())
        .all()
    )


def get_dashboard_stats(db: Session) -> dict:
    """Return aggregate stats for the impact dashboard."""
    all_reports = db.query(Report).all()
    total = len(all_reports)

    stats = {
        "total": total,
        "submitted": 0,
        "under_review": 0,
        "action_planned": 0,
        "in_progress": 0,
        "resolved": 0,
        "verified": 0,
        "with_photo": 0,
        "by_category": {},
    }

    for report in all_reports:
        status = report.status
        if status in stats:
            stats[status] += 1  # type: ignore

        if report.photo_path:
            stats["with_photo"] += 1  # type: ignore

        cat = report.category or "Other"
        stats["by_category"][cat] = stats["by_category"].get(cat, 0) + 1  # type: ignore

    return stats


# ──────────────────────────────────────────────
# Internal helpers
# ──────────────────────────────────────────────

def _record_status_history(
    db: Session,
    report_id: int,
    old_status: Optional[str],
    new_status: str,
    note: Optional[str] = None,
) -> None:
    entry = ReportStatusHistory(
        report_id=report_id,
        old_status=old_status,
        new_status=new_status,
        changed_at=datetime.utcnow(),
        note=note,
    )
    db.add(entry)
    db.commit()