from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String, Text

from app.db.database import Base


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)

    description = Column(Text, nullable=False)

    category = Column(String(100), nullable=False)

    location = Column(String(255), nullable=True)

    photo_path = Column(String(500), nullable=True)

    status = Column(
        String(50),
        nullable=False,
        default="submitted"
    )

    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow
    )