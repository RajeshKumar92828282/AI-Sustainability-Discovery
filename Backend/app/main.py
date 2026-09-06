from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.db.database import Base, engine
from app.models.report import Report
from app.api.routes.reports import router as reports_router


# Create database tables
Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="AI Sustainability Discovery API",
    description="AI-powered sustainability problem discovery platform",
    version="1.0.0",
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
    }