from pydantic import BaseModel
from datetime import datetime


class ReportCreate(BaseModel):
    description: str
    category: str
    location: str | None = None


class ReportResponse(BaseModel):
    id: int
    description: str
    category: str
    location: str | None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True