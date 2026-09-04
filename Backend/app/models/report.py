from sqlalchemy import Column, Integer, String, Text, DateTime
from datetime import datetime

from app.db.database import Base


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)

    description = Column(Text, nullable=False)

    category = Column(String(100), nullable=False)

    location = Column(String(255), nullable=True)

    status = Column(String(50), default="submitted")

    created_at = Column(DateTime, default=datetime.utcnow)