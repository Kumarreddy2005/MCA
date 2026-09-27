"""VCGIS AI Service — Configuration."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Service
    service_name: str = "vcgis-ai-service"
    debug: bool = False
    host: str = "0.0.0.0"
    port: int = 8000

    # CORS
    cors_origins: list[str] = ["http://localhost:5001", "http://localhost:5173"]

    # Backend API (for callbacks if needed)
    backend_url: str = "http://localhost:5001"

    # AI Model settings (Phase 7+)
    # model_name: str = "sentence-transformers/all-MiniLM-L6-v2"
    # spacy_model: str = "en_core_web_sm"
    # confidence_threshold: float = 0.6

    model_config = {"env_prefix": "AI_", "env_file": ".env", "extra": "ignore"}


settings = Settings()
