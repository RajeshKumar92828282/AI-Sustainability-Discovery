# ── Environment loading MUST happen before any os.getenv() calls ──────────────
# python-dotenv is installed (python-dotenv==1.2.2 in requirements.txt).
# Without load_dotenv() here, .env values are NOT loaded into the process,
# causing GEMINI_API_KEY to appear as None even when set in .env.
import os
from dotenv import load_dotenv

load_dotenv()  # Loads .env from cwd (Backend/) into os.environ
# ─────────────────────────────────────────────────────────────────────────────

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.db.database import Base, engine

# Import ALL models to ensure tables are created
import app.models  # noqa: F401 — side-effect: registers Report, ReportStatusHistory, ReportAnalysis

from app.api.routes.reports import router as reports_router


# Create all database tables
Base.metadata.create_all(bind=engine)


def _ensure_schema_migrations():
    """Apply lightweight ALTER TABLE migrations for new columns added after initial schema creation."""
    try:
        from sqlalchemy import inspect, text
        inspector = inspect(engine)
        if "report_analysis" in inspector.get_table_names():
            columns = [c["name"] for c in inspector.get_columns("report_analysis")]
            with engine.connect() as conn:
                # Original RAG column
                if "retrieved_sources" not in columns:
                    conn.execute(text("ALTER TABLE report_analysis ADD COLUMN retrieved_sources TEXT;"))
                # Agent columns
                for agent_col in ("agent_selected_tools", "agent_reasoning", "agent_tool_results"):
                    if agent_col not in columns:
                        conn.execute(text(f"ALTER TABLE report_analysis ADD COLUMN {agent_col} TEXT;"))
                # AI provider provenance columns (Task 3 — response contract)
                if "provider" not in columns:
                    conn.execute(text("ALTER TABLE report_analysis ADD COLUMN provider TEXT;"))
                if "is_live" not in columns:
                    conn.execute(text("ALTER TABLE report_analysis ADD COLUMN is_live INTEGER;"))
                conn.commit()
    except Exception as e:
        print("Migration notice:", e)


_ensure_schema_migrations()


app = FastAPI(
    title="AI Sustainability Discovery API",
    description="AI-powered sustainability problem reporting and action platform",
    version="2.0.0",
)

app.mount(
    "/uploads",
    StaticFiles(directory="uploads"),
    name="uploads",
)

# Allow Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routes
app.include_router(reports_router)


@app.get("/")
def root():
    return {
        "message": "AI Sustainability Discovery API is running",
        "status": "online",
        "version": "2.0.0",
    }