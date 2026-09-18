import json
from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, ConfigDict, Field, field_validator


class ReportAnalysisResponse(BaseModel):
    id: int
    report_id: int
    category: Optional[str] = None
    priority_score: Optional[int] = Field(None, ge=1, le=10)
    confidence: Optional[float] = Field(None, ge=0.0, le=1.0)
    root_cause: Optional[str] = None
    recommended_action: Optional[str] = None
    impact_estimate: Optional[str] = None
    model_name: Optional[str] = None
    retrieved_sources: Optional[Any] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_validator("retrieved_sources", mode="before")
    @classmethod
    def parse_retrieved_sources(cls, v: Any) -> Any:
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return v
        return v
