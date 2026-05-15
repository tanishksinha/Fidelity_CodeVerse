"""
FIDELITY BEHAVIORAL ENGINE — Configuration
Centralized settings loaded from environment variables.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # ─── Database ───
    DATABASE_URL: str = "sqlite+aiosqlite:///./telemetry.db"

    # ─── OpenAI ───
    OPENAI_API_KEY: str = ""

    # ─── JWT Auth ───
    JWT_SECRET: str = "dev-secret-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24

    # ─── Admin Credentials ───
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "fidelity2024"

    # ─── CORS ───
    FRONTEND_ORIGIN: str = "http://localhost:3000"

    # ─── Supabase ───
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""

    # ─── Multi-LLM API Keys ───
    GEMINI_API_KEY: str = ""
    GROQ_API_KEY: str = ""

    # ─── Dispatch Integrations ───
    SENDGRID_API_KEY: str = ""
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_WHATSAPP_NUMBER: str = ""

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


@lru_cache()
def get_settings() -> Settings:
    return Settings()
