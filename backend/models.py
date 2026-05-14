"""
FIDELITY BEHAVIORAL ENGINE — Pydantic Schemas
Request/Response models for API validation.
"""

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


# ═══════════════════════════════════════════════════════
# INGESTION MODELS (Ghost SDK Payload)
# ═══════════════════════════════════════════════════════

class HesitationZone(BaseModel):
    element_id: str
    hover_duration_ms: float


class FrictionSignals(BaseModel):
    erratic_mouse_movements: int = 0
    highlighted_text: Optional[str] = None


class BehavioralTelemetry(BaseModel):
    total_time_seconds: float = 0
    max_scroll_depth_percent: float = 0
    hesitation_zones: list[HesitationZone] = []
    friction_signals: FrictionSignals = FrictionSignals()
    exit_condition: Optional[str] = None
    exit_velocity: str = "normal"


class TelemetryPayload(BaseModel):
    """
    Exact shape of the JSON fired by the Ghost SDK's navigator.sendBeacon().
    """
    session_id: str
    timestamp: Optional[str] = None
    page_url: Optional[str] = None
    behavioral_telemetry: BehavioralTelemetry = BehavioralTelemetry()


# ═══════════════════════════════════════════════════════
# AUTH MODELS
# ═══════════════════════════════════════════════════════

class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str = "admin"


# ═══════════════════════════════════════════════════════
# WAR ROOM RESPONSE MODELS
# ═══════════════════════════════════════════════════════

class FunnelStats(BaseModel):
    landing: int = 0
    investments: int = 0
    checkout: int = 0
    bounced: int = 0
    total: int = 0


class SessionDetail(BaseModel):
    id: str
    stage: str
    page_url: Optional[str] = None
    total_time_seconds: float = 0
    scroll_depth: str = "0%"
    exit_velocity: str = "normal"
    erratic_mouse: int = 0
    highlighted_text: Optional[str] = None
    hesitation_zones: list[dict] = []

    # AI fields (null until processed)
    intent: Optional[str] = None
    confidence: Optional[float] = None
    profile: Optional[str] = None
    email_subject: Optional[str] = None
    email_body: Optional[str] = None
    status: str = "abandoned"
    dispatch_status: str = "pending"


class EngineRunResponse(BaseModel):
    processed_count: int
    skipped_count: int
    errors: list[str] = []
    message: str
