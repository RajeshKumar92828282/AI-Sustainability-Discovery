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

# Defines the only valid forward transitions in the report lifecycle.
# verified has no valid next state — the report is closed unless explicitly reopened.
VALID_TRANSITIONS: dict[str, list[str]] = {
    "submitted":      ["under_review"],
    "under_review":   ["action_planned"],
    "action_planned": ["in_progress"],
    "in_progress":    ["resolved"],
    "resolved":       ["verified"],
    "verified":       [],  # No further automatic transitions
}


def validate_status_transition(current_status: str, new_status: str) -> None:
    """
    Validate that a status transition follows the defined lifecycle order.

    Raises:
        ValueError: with a descriptive message if the transition is not allowed.
    """
    allowed_next = VALID_TRANSITIONS.get(current_status, [])
    if new_status not in allowed_next:
        if current_status == new_status:
            raise ValueError(
                f"Report is already in '{current_status}' status. No change needed."
            )
        if current_status == "verified":
            raise ValueError(
                "Report is 'verified' and closed. No further status transitions are permitted. "
                "If reopening is required, please use a dedicated reopen action."
            )
        from_label = current_status.replace("_", " ").title()
        to_label = new_status.replace("_", " ").title()
        allowed_labels = [s.replace("_", " ").title() for s in allowed_next]
        raise ValueError(
            f"Invalid status transition: '{from_label}' \u2192 '{to_label}'. "
            f"Allowed next status from '{from_label}': "
            f"{allowed_labels if allowed_labels else 'None (report is closed)'}."
        )


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
    """
    Update the lifecycle status of a report with transition validation.

    Validates that:
    1. new_status is one of the 6 allowed statuses.
    2. The transition from current_status → new_status follows the defined lifecycle order.

    Raises:
        ValueError: for unknown statuses or invalid lifecycle transitions (caller returns HTTP 400).
    """
    if new_status not in ALLOWED_STATUSES:
        raise ValueError(f"Unknown status '{new_status}'. Allowed values: {ALLOWED_STATUSES}")

    # Enforce lifecycle ordering — e.g. verified → submitted is forbidden
    validate_status_transition(report.status, new_status)

    old_status = report.status

    report.status = new_status
    report.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(report)

    # Record history entry only after a successful valid transition
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