import os
import logging
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent.parent

KNOWN_GROQ_MODELS = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "mixtral-8x7b-32768",
]


class Settings:
    PROJECT_NAME: str = "CodeSentinel"
    API_VERSION: str = "v1"

    DATABASE_URL: str = f"sqlite:///{BASE_DIR}/codesentinel.db"

    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

    TEMP_UPLOAD_DIR: str = str(BASE_DIR / "uploads")

    MAX_UPLOAD_SIZE: int = 50 * 1024 * 1024

    ALLOWED_EXTENSIONS: list = [".zip"]


settings = Settings()


def validate_config() -> list[str]:
    warnings = []

    if not settings.GROQ_API_KEY:
        warnings.append(
            "GROQ_API_KEY is not set. AI remediation will be disabled. "
            "Get a free API key at https://console.groq.com/keys"
        )
    else:
        if settings.GROQ_MODEL not in KNOWN_GROQ_MODELS:
            warnings.append(
                f"GROQ_MODEL '{settings.GROQ_MODEL}' is not in the known list: {KNOWN_GROQ_MODELS}. "
                "This may still work — check https://console.groq.com/docs/models for available models."
            )
        logging.getLogger(__name__).info(
            f"GROQ model configured: {settings.GROQ_MODEL}"
        )

    if not os.path.exists(settings.TEMP_UPLOAD_DIR):
        os.makedirs(settings.TEMP_UPLOAD_DIR, exist_ok=True)

    return warnings
