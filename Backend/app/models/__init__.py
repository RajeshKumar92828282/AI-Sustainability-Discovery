# Import all models so SQLAlchemy registers them with Base.metadata
# This ensures create_all() creates all tables
from app.models.report import Report
from app.models.status_history import ReportStatusHistory
from app.models.analysis import ReportAnalysis

__all__ = ["Report", "ReportStatusHistory", "ReportAnalysis"]