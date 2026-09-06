import os
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.report import ReportResponse
from app.services.report_service import (
    create_report,
    get_all_reports,
    get_report_by_id,
)

router = APIRouter(
    prefix="/api/reports",
    tags=["Reports"],
)

UPLOAD_DIR = "uploads/reports"

os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post(
    "",
    response_model=ReportResponse,
    status_code=201,
)
async def submit_report(
    description: str = Form(...),
    category: str = Form(...),
    location: str | None = Form(None),
    photo: UploadFile | None = File(None),
    db: Session = Depends(get_db),
):
    photo_path = None

    if photo:
        allowed_types = {
            "image/jpeg",
            "image/png",
        }

        if photo.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail="Only JPG and PNG images are allowed.",
            )

        contents = await photo.read()

        if len(contents) > 5 * 1024 * 1024:
            raise HTTPException(
                status_code=400,
                detail="Image must be smaller than 5 MB.",
            )

        extension = ".jpg"

        if photo.content_type == "image/png":
            extension = ".png"

        filename = f"{uuid.uuid4()}{extension}"

        photo_path = os.path.join(
            UPLOAD_DIR,
            filename,
        )

        with open(photo_path, "wb") as file:
            file.write(contents)

    return create_report(
        db=db,
        description=description,
        category=category,
        location=location,
        photo_path=photo_path,
    )


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