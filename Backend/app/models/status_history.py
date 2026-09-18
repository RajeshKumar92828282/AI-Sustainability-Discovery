from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.db.database import Base


class ReportStatusHistory(Base):
    __tablename__ = "report_status_history"

    id = Column(Integer, primary_key=True, index=True)

    report_id = Column(
        Integer,
        ForeignKey("reports.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    old_status = Column(String(50), nullable=True)  # None on initial creation

    new_status = Column(String(50), nullable=False)

    changed_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )

    note = Column(Text, nullable=True)

    # Relationship
    report = relationship("Report", back_populates="status_history")
