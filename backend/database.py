"""
FIDELITY BEHAVIORAL ENGINE — Database Layer
Async SQLAlchemy engine with SQLite for hackathon portability.
Schema designed for zero-friction migration to PostgreSQL.
"""

import logging
from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    DateTime,
    Float,
    Integer,
    String,
    Text,
    create_engine,
)
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from config import get_settings

logger = logging.getLogger("fidelity.database")

settings = get_settings()

# ─── Async Engine ───
async_engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True,
)

AsyncSessionLocal = sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# ─── Base Model ───
class Base(DeclarativeBase):
    pass


# ─── Telemetry Session Table ───
class TelemetrySession(Base):
    """
    Each row represents one user visit that the Ghost SDK captured.
    Stores raw behavioral payload + AI-generated analysis after processing.
    """

    __tablename__ = "telemetry_sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(64), unique=True, nullable=False, index=True)
    user_id = Column(String(128), nullable=True, index=True)  # linked registered user
    page_url = Column(String(512), nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # ─── Raw Behavioral Telemetry (stored as JSON text) ───
    total_time_seconds = Column(Float, default=0)
    max_scroll_depth_percent = Column(Float, default=0)
    exit_condition = Column(String(64), nullable=True)
    exit_velocity = Column(String(16), default="normal")
    erratic_mouse_movements = Column(Integer, default=0)
    highlighted_text = Column(Text, nullable=True)

    # Hesitation zones stored as JSON string
    hesitation_zones_json = Column(Text, default="[]")

    # ─── Click Events + Form Completion ───
    click_events_json = Column(Text, default="[]")
    form_completed = Column(Integer, default=0)  # 0 or 1

    # ─── Derived Funnel Stage ───
    funnel_stage = Column(String(32), default="unknown")

    # ─── Processing Status ───
    status = Column(String(16), default="abandoned", index=True)

    # ─── AI-Generated Fields (populated by the Nightly Brain) ───
    ai_intent = Column(String(128), nullable=True)
    ai_intent_confidence = Column(Float, nullable=True)
    ai_profile = Column(Text, nullable=True)
    ai_email_subject = Column(String(256), nullable=True)
    ai_email_body = Column(Text, nullable=True)

    # ─── Dispatch Status ───
    dispatch_status = Column(String(16), default="pending")

    def __repr__(self):
        return f"<TelemetrySession(session_id={self.session_id}, status={self.status})>"


# ─── Registered User Table ───
class User(Base):
    """Consumer user accounts for JWT-based authentication."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(128), nullable=False)
    email = Column(String(256), unique=True, nullable=False, index=True)
    password_hash = Column(String(256), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


# ─── Database Lifecycle ───
async def init_db():
    """Create all tables if they don't exist."""
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("[DATABASE] Tables initialized successfully.")


async def get_db() -> AsyncSession:
    """FastAPI dependency: yields an async database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
