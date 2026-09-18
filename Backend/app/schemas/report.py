from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict

# Allowed report lifecycle statuses
ALLOWED_STATUSES = Literal[
    "submitted",
    "under_review",
    "action_planned",
    "in_progress",
    "resolved",
    "verified",
]


class ReportCreate(BaseModel):
    description: str
    category: str
    location: str | None = None


class StatusUpdateRequest(BaseModel):
    status: ALLOWED_STATUSES
    note: Optional[str] = None


class ReportResponse(BaseModel):
    id: int
    description: str
    category: str
    location: str | None
    photo_path: str | None
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)