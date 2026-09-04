from sqlalchemy.orm import Session

from app.models.report import Report
from app.schemas.report import ReportCreate


def create_report(
    db: Session,
    report_data: ReportCreate
):
    report = Report(
        description=report_data.description,
        category=report_data.category,
        location=report_data.location,
        status="submitted"
    )

    db.add(report)
    db.commit()
    db.refresh(report)

    return report


def get_reports(db: Session):
    return (
        db.query(Report)
        .order_by(Report.created_at.desc())
        .all()
    )


def get_report(
    db: Session,
    report_id: int
):
    return (
        db.query(Report)
        .filter(Report.id == report_id)
        .first()
    )