from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.report import ReportCreate, ReportResponse
from app.services.report_service import (
    create_report,
    get_reports,
    get_report
)

router = APIRouter(
    prefix="/api/reports",
    tags=["Reports"]
)


@router.post(
    "",
    response_model=ReportResponse
)
def submit_report(
    report_data: ReportCreate,
    db: Session = Depends(get_db)
):
    return create_report(db, report_data)


@router.get(
    "",
    response_model=list[ReportResponse]
)
def list_reports(
    db: Session = Depends(get_db)
):
    return get_reports(db)


@router.get(
    "/{report_id}",
    response_model=ReportResponse
)
def read_report(
    report_id: int,
    db: Session = Depends(get_db)
):
    report = get_report(db, report_id)

    if not report:
        raise HTTPException(
            status_code=404,
            detail="Report not found"
        )

    return report