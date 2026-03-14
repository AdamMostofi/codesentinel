import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings:
    PROJECT_NAME: str = "CodeSentinel"
    API_VERSION: str = "v1"

    DATABASE_URL: str = f"sqlite:///{BASE_DIR}/codesentinel.db"

    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")

    TEMP_UPLOAD_DIR: str = str(BASE_DIR / "uploads")

    MAX_UPLOAD_SIZE: int = 50 * 1024 * 1024

    ALLOWED_EXTENSIONS: list = [".zip"]


settings = Settings()
