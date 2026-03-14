import logging
from logging.handlers import RotatingFileHandler
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import routes
from app.core.config import settings
from app.database import engine, Base

# Setup logging
if not os.path.exists("logs"):
    os.makedirs("logs")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(),
        RotatingFileHandler("logs/app.log", maxBytes=5_000_000, backupCount=3),
    ],
)

logger = logging.getLogger(__name__)

# Create database tables on startup
Base.metadata.create_all(bind=engine)
logger.info("Database tables initialized")

app = FastAPI(
    title="CodeSentinel API",
    description="Automated Security Vulnerability Scanner",
    version="1.0.0",
)

logger.info("Starting CodeSentinel API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(routes.router, prefix="/api")


@app.get("/")
async def root():
    logger.info("Root endpoint accessed")
    return {"message": "CodeSentinel API", "status": "running"}


@app.get("/health")
async def health_check():
    logger.info("Health check endpoint accessed")
    return {"status": "healthy", "service": "CodeSentinel API"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
