import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent.parent


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
