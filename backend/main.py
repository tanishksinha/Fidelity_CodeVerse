"""
FIDELITY BEHAVIORAL RE-ENGAGEMENT ENGINE — Main Application
═══════════════════════════════════════════════════════════════
FastAPI backend serving three architectural pillars:
  A. Zero-Latency Telemetry Ingestion (Ghost SDK → DB)
  B. Nightly Brain LLM Engine (Telemetry → GPT-4o → Intent)
  C. War Room API (DB → Admin Dashboard)
"""

import json
import logging
import sys
from contextlib import asynccontextmanager

from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import create_access_token, verify_admin
from config import get_settings
from database import TelemetrySession, get_db, init_db
from engine import analyze_session
from models import (
    EngineRunResponse,
    FunnelStats,
    LoginRequest,
    LoginResponse,
    SessionDetail,
    TelemetryPayload,
)

# ─── Logging Configuration ───
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)-7s - %(name)s - %(message)s",
    datefmt="%H:%M:%S",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("fidelity.main")
settings = get_settings()


# ─── Application Lifecycle ───
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database tables on startup."""
    logger.info("=" * 60)
    logger.info("  FIDELITY BEHAVIORAL RE-ENGAGEMENT ENGINE")
    logger.info("  Status: INITIALIZING")
    logger.info("=" * 60)
    await init_db()
    logger.info("[STARTUP] Engine is ONLINE. Awaiting telemetry.")
    yield
    logger.info("[SHUTDOWN] Engine going offline.")


# ─── FastAPI App ───
app = FastAPI(
    title="Fidelity Behavioral Re-Engagement Engine",
    description="Backend infrastructure for telemetry ingestion, LLM-driven intent analysis, and re-engagement dispatch.",
    version="1.0.0",
    lifespan=lifespan,
)

# ─── CORS Middleware ───
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_ORIGIN,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ═══════════════════════════════════════════════════════
# HEALTH CHECK
# ═══════════════════════════════════════════════════════

@app.get("/", tags=["Health"])
async def health_check():
    return {
        "status": "online",
        "engine": "Fidelity Behavioral Re-Engagement Engine",
        "version": "1.0.0",
    }


# ═══════════════════════════════════════════════════════
# PILLAR A: ZERO-LATENCY TELEMETRY INGESTION
# ═══════════════════════════════════════════════════════

def _infer_funnel_stage(page_url: str) -> str:
    """Derive the funnel stage from the page URL."""
    if not page_url:
        return "unknown"
    url = page_url.lower()
    if "/checkout" in url:
        return "checkout"
    elif "/investments" in url:
        return "investments"
    elif url == "/" or "/page" in url or url.endswith(":3000"):
        return "landing"
    return "unknown"


async def _persist_telemetry(payload: TelemetryPayload):
    """
    Background task: writes the telemetry payload to the database.
    Runs AFTER the HTTP 200 has already been returned to the client.
    """
    try:
        async with (await anext(get_db.__wrapped__())) as _:
            pass
    except Exception:
        pass

    # We need a fresh session for the background task
    from database import AsyncSessionLocal

    async with AsyncSessionLocal() as session:
        try:
            # Check for duplicate session_id
            existing = await session.execute(
                select(TelemetrySession).where(
                    TelemetrySession.session_id == payload.session_id
                )
            )
            if existing.scalar_one_or_none():
                logger.info(
                    f"[INGESTION] Duplicate session {payload.session_id} — skipping."
                )
                return

            telemetry = payload.behavioral_telemetry
            record = TelemetrySession(
                session_id=payload.session_id,
                page_url=payload.page_url,
                total_time_seconds=telemetry.total_time_seconds,
                max_scroll_depth_percent=telemetry.max_scroll_depth_percent,
                exit_condition=telemetry.exit_condition,
                exit_velocity=telemetry.exit_velocity,
                erratic_mouse_movements=telemetry.friction_signals.erratic_mouse_movements,
                highlighted_text=telemetry.friction_signals.highlighted_text,
                hesitation_zones_json=json.dumps(
                    [z.model_dump() for z in telemetry.hesitation_zones]
                ),
                funnel_stage=_infer_funnel_stage(payload.page_url),
                status="abandoned",
            )
            session.add(record)
            await session.commit()

            logger.info(
                f"[INGESTION] ✓ Payload secured for session: {payload.session_id} "
                f"(stage: {record.funnel_stage}, time: {telemetry.total_time_seconds}s)"
            )
        except Exception as e:
            await session.rollback()
            logger.error(f"[INGESTION] ✗ Database write failed: {e}")


@app.post("/api/ingest-telemetry", status_code=200, tags=["Ingestion"])
async def ingest_telemetry(request: Request, background_tasks: BackgroundTasks):
    """
    Ghost SDK Beacon Endpoint.

    navigator.sendBeacon() can send payloads as text/plain or application/json.
    We handle both by reading raw body bytes and parsing manually.
    Response is returned INSTANTLY — database write happens in background.
    """
    try:
        # Read raw bytes — sendBeacon may use text/plain Content-Type
        body = await request.body()
        if not body:
            return {"status": "ignored", "reason": "empty payload"}

        # Parse the JSON regardless of Content-Type header
        try:
            raw_data = json.loads(body)
        except json.JSONDecodeError:
            logger.warning("[INGESTION] Received non-JSON payload — discarding.")
            return {"status": "ignored", "reason": "invalid json"}

        payload = TelemetryPayload(**raw_data)

        # Enqueue the database write as a background task
        background_tasks.add_task(_persist_telemetry, payload)

        logger.info(
            f"[INGESTION] Beacon received for session: {payload.session_id} — "
            f"queued for persistence."
        )
        return {"status": "received", "session_id": payload.session_id}

    except Exception as e:
        logger.error(f"[INGESTION] Unexpected error: {e}")
        # Still return 200 — we never block the beacon
        return {"status": "error", "detail": str(e)}


# ═══════════════════════════════════════════════════════
# PILLAR B: THE "NIGHTLY BRAIN" LLM ENGINE
# ═══════════════════════════════════════════════════════

@app.post(
    "/api/admin/run-engine",
    response_model=EngineRunResponse,
    tags=["Engine"],
)
async def run_engine(
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(verify_admin),
):
    """
    Simulates the nightly batch process.
    Queries all unprocessed abandoned sessions, sends each to GPT-4o,
    and writes the AI-generated intent + email back to the database.
    """
    logger.info("=" * 50)
    logger.info("[ENGINE] Nightly Brain triggered by admin: %s", admin.get("sub"))
    logger.info("=" * 50)

    # Fetch all abandoned, unprocessed sessions
    result = await db.execute(
        select(TelemetrySession).where(TelemetrySession.status == "abandoned")
    )
    sessions = result.scalars().all()

    if not sessions:
        logger.info("[ENGINE] No unprocessed sessions found. Standing down.")
        return EngineRunResponse(
            processed_count=0,
            skipped_count=0,
            message="No abandoned sessions to process.",
        )

    logger.info(f"[ENGINE] Found {len(sessions)} abandoned sessions. Processing...")

    processed = 0
    skipped = 0
    errors = []

    for session in sessions:
        try:
            # Build the telemetry dict for the LLM
            telemetry_data = {
                "session_id": session.session_id,
                "page_url": session.page_url,
                "funnel_stage": session.funnel_stage,
                "total_time_seconds": session.total_time_seconds,
                "max_scroll_depth_percent": session.max_scroll_depth_percent,
                "exit_condition": session.exit_condition,
                "exit_velocity": session.exit_velocity,
                "erratic_mouse_movements": session.erratic_mouse_movements,
                "highlighted_text": session.highlighted_text,
                "hesitation_zones": json.loads(session.hesitation_zones_json or "[]"),
            }

            # Send to LLM
            analysis = await analyze_session(telemetry_data)

            # Write results back
            session.ai_intent = analysis["intent"]
            session.ai_intent_confidence = analysis["confidence"]
            session.ai_profile = analysis["profile"]
            session.ai_email_subject = analysis["email_subject"]
            session.ai_email_body = analysis["email_body"]
            session.status = "processed"

            processed += 1
            logger.info(
                f"[ENGINE] ✓ Session {session.session_id} → "
                f"{analysis['intent']} ({analysis['confidence']:.0%})"
            )

        except Exception as e:
            skipped += 1
            error_msg = f"Session {session.session_id}: {str(e)}"
            errors.append(error_msg)
            logger.error(f"[ENGINE] ✗ {error_msg}")

    await db.commit()

    summary = (
        f"Engine run complete. Processed: {processed}, Skipped: {skipped}."
    )
    logger.info(f"[ENGINE] {summary}")

    return EngineRunResponse(
        processed_count=processed,
        skipped_count=skipped,
        errors=errors,
        message=summary,
    )


# ═══════════════════════════════════════════════════════
# PILLAR C: WAR ROOM API
# ═══════════════════════════════════════════════════════

@app.post("/api/auth/login", response_model=LoginResponse, tags=["Auth"])
async def login(body: LoginRequest):
    """
    Authenticate admin users and issue a signed JWT.
    """
    if (
        body.username == settings.ADMIN_USERNAME
        and body.password == settings.ADMIN_PASSWORD
    ):
        token = create_access_token(body.username, role="admin")
        logger.info(f"[AUTH] ✓ Admin login successful: {body.username}")
        return LoginResponse(access_token=token)

    logger.warning(f"[AUTH] ✗ Failed login attempt for: {body.username}")
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid credentials.",
    )


@app.get(
    "/api/admin/funnel-stats",
    response_model=FunnelStats,
    tags=["War Room"],
)
async def funnel_stats(
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(verify_admin),
):
    """
    Returns aggregate session counts for each funnel stage.
    Powers the Live Funnel Node Graph in the dashboard.
    """
    result = await db.execute(
        select(
            TelemetrySession.funnel_stage,
            func.count(TelemetrySession.id),
        ).group_by(TelemetrySession.funnel_stage)
    )
    counts = {row[0]: row[1] for row in result.all()}

    total = sum(counts.values())
    # "Bounced" = all sessions that were abandoned (didn't convert)
    bounced = sum(
        v for k, v in counts.items() if k in ("investments", "checkout")
    )

    stats = FunnelStats(
        landing=counts.get("landing", 0),
        investments=counts.get("investments", 0),
        checkout=counts.get("checkout", 0),
        bounced=bounced,
        total=total,
    )

    logger.info(
        f"[WAR ROOM] Funnel stats served — "
        f"L:{stats.landing} I:{stats.investments} C:{stats.checkout} B:{stats.bounced}"
    )
    return stats


@app.get(
    "/api/admin/bounced-sessions",
    response_model=list[SessionDetail],
    tags=["War Room"],
)
async def bounced_sessions(
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(verify_admin),
):
    """
    Returns detailed logs for all captured sessions.
    Powers the Dispatch Queue and Intent Inspector panels.
    """
    result = await db.execute(
        select(TelemetrySession).order_by(TelemetrySession.id.desc()).limit(100)
    )
    sessions = result.scalars().all()

    details = []
    for s in sessions:
        hesitation = json.loads(s.hesitation_zones_json or "[]")
        details.append(
            SessionDetail(
                id=s.session_id,
                stage=s.funnel_stage,
                page_url=s.page_url,
                total_time_seconds=s.total_time_seconds,
                scroll_depth=f"{int(s.max_scroll_depth_percent)}%",
                exit_velocity=s.exit_velocity,
                erratic_mouse=s.erratic_mouse_movements,
                highlighted_text=s.highlighted_text,
                hesitation_zones=hesitation,
                intent=s.ai_intent,
                confidence=s.ai_intent_confidence,
                profile=s.ai_profile,
                email_subject=s.ai_email_subject,
                email_body=s.ai_email_body,
                status=s.status,
                dispatch_status=s.dispatch_status,
            )
        )

    logger.info(f"[WAR ROOM] Served {len(details)} session records to dashboard.")
    return details


@app.post(
    "/api/admin/dispatch",
    tags=["War Room"],
)
async def dispatch_emails(
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(verify_admin),
):
    """
    Mark all processed sessions as 'dispatched'.
    Simulates sending the AI-generated re-engagement emails.
    """
    result = await db.execute(
        select(TelemetrySession).where(
            TelemetrySession.status == "processed",
            TelemetrySession.dispatch_status == "pending",
        )
    )
    sessions = result.scalars().all()

    for s in sessions:
        s.dispatch_status = "dispatched"

    await db.commit()

    logger.info(f"[DISPATCH] ✓ {len(sessions)} interventions marked as dispatched.")
    return {
        "dispatched_count": len(sessions),
        "message": f"{len(sessions)} re-engagement emails dispatched.",
    }


# ═══════════════════════════════════════════════════════
# ENTRY POINT
# ═══════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8080,
        reload=True,
        log_level="info",
    )
