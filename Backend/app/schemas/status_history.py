from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class StatusHistoryResponse(BaseModel):
    id: int
    report_id: int
    old_status: Optional[str]
    new_status: str
    changed_at: datetime
    note: Optional[str]

    model_config = ConfigDict(from_attributes=True)
