from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ReportResponse(BaseModel):
    id: int
    description: str
    category: str
    location: str | None
    photo_path: str | None
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)