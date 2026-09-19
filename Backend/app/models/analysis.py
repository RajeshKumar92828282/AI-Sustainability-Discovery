from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.db.database import Base


class ReportAnalysis(Base):
    __tablename__ = "report_analysis"

    id = Column(Integer, primary_key=True, index=True)

    report_id = Column(
        Integer,
        ForeignKey("reports.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    # AI-generated fields
    category = Column(String(100), nullable=True)
    priority_score = Column(Integer, nullable=True)   # 1-10
    confidence = Column(Float, nullable=True)          # 0.0-1.0
    root_cause = Column(Text, nullable=True)
    recommended_action = Column(Text, nullable=True)
    impact_estimate = Column(Text, nullable=True)
    retrieved_sources = Column(Text, nullable=True)

    # Provenance — which AI provider generated this analysis
    provider = Column(String(100), nullable=True)      # e.g. "Google Gemini", "Structured Fallback"
    is_live = Column(Boolean, nullable=True)           # True = real API call succeeded

    # Agent fields (nullable — only populated by /agent-analyze endpoint)
    agent_selected_tools = Column(Text, nullable=True)  # JSON array of tool names
    agent_reasoning = Column(Text, nullable=True)        # Short safe reasoning summary
    agent_tool_results = Column(Text, nullable=True)     # JSON array of tool outputs

    # Metadata
    model_name = Column(String(200), nullable=True)
    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )

    # Relationship
    report = relationship("Report", back_populates="analysis")

