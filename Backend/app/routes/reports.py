from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.report import ReportCreate, ReportResponse
from app.services.report_service import (
    create_report,
    get_all_reports,
    get_report_by_id,
)

router = APIRouter(
    prefix="/api/reports",
    tags=["Reports"],
)


@router.post(
    "",
    response_model=ReportResponse,
    status_code=201,
)
def submit_report(
    report_data: ReportCreate,
    db: Session = Depends(get_db),
):
    return create_report(db, report_data)


@router.get(
    "",
    response_model=list[ReportResponse],
)
def list_reports(
    db: Session = Depends(get_db),
):
    return get_all_reports(db)


@router.get(
    "/{report_id}",
    response_model=ReportResponse,
)
def read_report(
    report_id: int,
    db: Session = Depends(get_db),
):
    report = get_report_by_id(db, report_id)

    if report is None:
        raise HTTPException(
            status_code=404,
            detail="Report not found",
        )

    return report