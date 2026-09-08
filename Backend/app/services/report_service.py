from sqlalchemy.orm import Session

from app.models.report import Report


def create_report(
    db: Session,
    description: str,
    category: str,
    location: str | None = None,
    photo_path: str | None = None,
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

    return report


def get_reports(db: Session):
    return (
        db.query(Report)
        .order_by(Report.created_at.desc())
        .all()
    )


def get_report(db: Session, report_id: int):
    return (
        db.query(Report)
        .filter(Report.id == report_id)
        .first()
    )