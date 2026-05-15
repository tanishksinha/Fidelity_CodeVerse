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
import asyncio
import random
from contextlib import asynccontextmanager
import socketio

from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import create_access_token, verify_admin
from config import get_settings
from database import TelemetrySession, User, get_db, init_db
from engine import analyze_session
from models import (
    ConsumerLoginRequest,
    EngineRunResponse,
    FunnelStats,
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    SessionDetail,
    TelemetryPayload,
    UserDetail,
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
    """Initialize database tables and seed demo data on startup."""
    logger.info("=" * 60)
    logger.info("  FIDELITY BEHAVIORAL RE-ENGAGEMENT ENGINE")
    logger.info("  Status: INITIALIZING (DEMO MODE)")
    logger.info("=" * 60)
    await init_db()
    
    # ─── Seed Demo Data ───
    import hashlib
    from database import AsyncSessionLocal
    async with AsyncSessionLocal() as session:
        # Seed 5 dummy users
        result = await session.execute(select(func.count(User.id)))
        user_count = result.scalar()
        if user_count == 0:
            logger.info("[STARTUP] Seeding 5 registered consumer accounts...")
            dummy_pw = hashlib.sha256("demo123".encode()).hexdigest()
            demo_users = [
                User(name="Arjun Mehta", email="arjun.mehta@demo.com", password_hash=dummy_pw),
                User(name="Priya Sharma", email="priya.sharma@demo.com", password_hash=dummy_pw),
                User(name="Rahul Desai", email="rahul.desai@demo.com", password_hash=dummy_pw),
                User(name="Sneha Iyer", email="sneha.iyer@demo.com", password_hash=dummy_pw),
                User(name="Vikram Patel", email="vikram.patel@demo.com", password_hash=dummy_pw),
            ]
            session.add_all(demo_users)
            await session.flush()
            logger.info("[STARTUP] ✓ 5 dummy users created (password: demo123)")

        # Seed telemetry sessions linked to users
        result = await session.execute(select(func.count(TelemetrySession.id)))
        count = result.scalar()
        if count == 0:
            logger.info("[STARTUP] Seeding robust demo suite...")
            demo_sessions = [
                TelemetrySession(
                    session_id="USR_ALPHA_99", user_id="arjun.mehta@demo.com",
                    page_url="http://localhost:3000/investments",
                    total_time_seconds=342, max_scroll_depth_percent=92,
                    exit_condition="tab_hidden", exit_velocity=0.4,
                    erratic_mouse_movements=1, highlighted_text="Tax-Loss Harvesting",
                    click_events_json='[{"element_id":"btn_know_more_axis","page_url":"/investments"},{"element_id":"hero_explore_sips_cta","page_url":"/"}]',
                    funnel_stage="investments", status="processed",
                    dispatch_status="dispatched",
                    ai_intent="HESITATING_ON_RISK", ai_intent_confidence=0.94,
                    ai_profile="User is highly engaged with SIP charts but hesitated at the risk disclosure.",
                    ai_email_subject="Tailoring your portfolio's risk profile",
                    ai_email_body="We noticed you were reviewing our SIP strategies and wanted to offer a custom risk-parity assessment..."
                ),
                TelemetrySession(
                    session_id="USR_BETA_22", user_id="priya.sharma@demo.com",
                    page_url="http://localhost:3000/checkout",
                    total_time_seconds=125, max_scroll_depth_percent=60,
                    exit_condition="bounced", exit_velocity=2.8,
                    erratic_mouse_movements=8, highlighted_text="PAN Verification",
                    click_events_json='[{"element_id":"checkout_pan_ssn_sensitive_field","page_url":"/checkout"},{"element_id":"checkout_continue_to_kyc_button","page_url":"/checkout"}]',
                    funnel_stage="checkout", status="processed",
                    dispatch_status="dispatched",
                    ai_intent="FRICTION_POINT_KYC", ai_intent_confidence=0.88,
                    ai_profile="User showed significant mouse erraticism on the PAN input field.",
                    ai_email_subject="Need help with your KYC?",
                    ai_email_body="Our concierge team is available to help you complete your account setup..."
                ),
                TelemetrySession(
                    session_id="USR_GAMMA_07", user_id="rahul.desai@demo.com",
                    page_url="http://localhost:3000/retirement",
                    total_time_seconds=420, max_scroll_depth_percent=100,
                    exit_condition="tab_hidden", exit_velocity=0.1,
                    erratic_mouse_movements=0, highlighted_text="Inflation Hedging",
                    click_events_json='[{"element_id":"btn_start_retirement_sip","page_url":"/retirement"},{"element_id":"card_inflation_hedge","page_url":"/retirement"}]',
                    funnel_stage="retirement", status="processed",
                    dispatch_status="pending",
                    ai_intent="RETIREMENT_PLANNING", ai_intent_confidence=0.98,
                    ai_profile="High-value prospect exploring long-term inflation protection strategies.",
                    ai_email_subject="Building your 30-year legacy",
                    ai_email_body="Based on your interest in inflation hedging, here is our latest whitepaper..."
                ),
                TelemetrySession(
                    session_id="USR_DELTA_14", user_id="sneha.iyer@demo.com",
                    page_url="http://localhost:3000/insurance",
                    total_time_seconds=180, max_scroll_depth_percent=75,
                    exit_condition="bounced", exit_velocity=3.2,
                    erratic_mouse_movements=5, highlighted_text="Waiting Period: 30 days",
                    click_events_json='[{"element_id":"btn_get_quote_term_life","page_url":"/insurance"},{"element_id":"btn_get_quote_health","page_url":"/insurance"}]',
                    funnel_stage="insurance", status="processed",
                    dispatch_status="pending",
                    ai_intent="FEE_SENSITIVITY", ai_intent_confidence=0.82,
                    ai_profile="User compared multiple insurance products but abandoned on the exclusions fine print.",
                    ai_email_subject="Let us simplify your insurance decision",
                    ai_email_body="We noticed you were comparing term life and health coverage. Here is a side-by-side matrix that cuts through the fine print..."
                ),
                TelemetrySession(
                    session_id="USR_EPSILON_31", user_id="vikram.patel@demo.com",
                    page_url="http://localhost:3000/planning",
                    total_time_seconds=45, max_scroll_depth_percent=20,
                    exit_condition="bounced", exit_velocity=4.5,
                    erratic_mouse_movements=12, highlighted_text=None,
                    funnel_stage="landing", status="abandoned",
                )
            ]
            session.add_all(demo_sessions)
            await session.commit()
            logger.info(f"[STARTUP] ✓ {len(demo_sessions)} robust demo records live.")

    # ─── Auto-Start Simulation ───
    global simulation_running
    simulation_running = True
    asyncio.create_task(demo_simulation_loop())
    
    logger.info("[STARTUP] Engine is ONLINE. Auto-Simulation: ACTIVE.")
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

# ─── Socket.IO Server ───
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=[
        settings.FRONTEND_ORIGIN,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
)
socket_app = socketio.ASGIApp(sio, other_asgi_app=app)

@sio.on('connect')
async def connect(sid, environ, auth):
    query_string = environ.get('QUERY_STRING', '')
    if 'consumer_id=' in query_string:
        consumer_id = query_string.split('consumer_id=')[1].split('&')[0]
        await sio.enter_room(sid, consumer_id)
        logger.info(f"[SOCKET] Consumer {consumer_id} connected ({sid})")
    else:
        logger.info(f"[SOCKET] Admin connected ({sid})")

@sio.on('disconnect')
def disconnect(sid):
    logger.info(f"[SOCKET] Client disconnected ({sid})")

@sio.on('manual_nudge')
async def handle_manual_nudge(sid, data):
    """Admin triggers an Ultra-Nudge, route it to the specific consumer's room."""
    user_id = data.get('userId')
    logger.info(f"[SOCKET] Admin {sid} sent manual nudge to {user_id}")
    await sio.emit('receive_nudge', data, room=user_id)
    # Also pulse the admin's screen for confirmation
    await sio.emit('intervention_sent', {'user_id': user_id, 'type': 'manual'})


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
    elif "/insurance" in url:
        return "insurance"
    elif "/retirement" in url:
        return "retirement"
    elif "/planning" in url:
        return "planning"
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
                user_id=payload.user_id,
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
                click_events_json=json.dumps(
                    [c.model_dump() for c in telemetry.click_events]
                ),
                form_completed=1 if telemetry.form_completed else 0,
                funnel_stage=_infer_funnel_stage(payload.page_url),
                status="abandoned",
            )
            session.add(record)
            await session.commit()

            logger.info(
                f"[INGESTION] ✓ Payload secured for session: {payload.session_id} "
                f"(stage: {record.funnel_stage}, time: {telemetry.total_time_seconds}s)"
            )

            # ─── ML Churn Prediction (Real-Time) ───
            try:
                from processor import should_we_nudge
                ml_input = {
                    "duration": telemetry.total_time_seconds,
                    "clicks": telemetry.friction_signals.erratic_mouse_movements,
                    "past_visits": 1,
                }
                is_churning = should_we_nudge(ml_input)
                logger.info(f"[ML] Session {payload.session_id} → churn={is_churning}")

                if is_churning:
                    import random
                    risk_amount = random.choice([5000, 10000, 15000, 25000])
                    await sio.emit('revenue_at_risk', {"amount": risk_amount, "session_id": payload.session_id})
                    logger.info(f"[ML] ⚠ Revenue at risk: ₹{risk_amount} for {payload.session_id}")
            except Exception as ml_err:
                logger.warning(f"[ML] Predictor unavailable: {ml_err}")

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


# ─── Consumer Registration ───
@app.post("/api/auth/register", tags=["Auth"])
async def register_consumer(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register a new consumer user."""
    import hashlib
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered.")

    pw_hash = hashlib.sha256(body.password.encode()).hexdigest()
    user = User(name=body.name, email=body.email, password_hash=pw_hash)
    db.add(user)
    await db.commit()
    logger.info(f"[AUTH] ✓ New consumer registered: {body.email}")
    return {"status": "registered", "email": body.email}


# ─── Consumer Login ───
@app.post("/api/auth/consumer-login", tags=["Auth"])
async def consumer_login(body: ConsumerLoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate a consumer user and issue JWT."""
    import hashlib
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    pw_hash = hashlib.sha256(body.password.encode()).hexdigest()
    if user.password_hash != pw_hash:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = create_access_token(user.email, role="consumer")
    logger.info(f"[AUTH] ✓ Consumer login: {user.email}")
    return {"access_token": token, "token_type": "bearer", "role": "consumer", "name": user.name, "email": user.email}


# ─── Admin: All Users with Behavior Stats ───
@app.get("/api/admin/users", response_model=list[UserDetail], tags=["War Room"])
async def get_all_users(
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(verify_admin),
):
    """Returns all registered users with aggregated behavior statistics."""
    users_result = await db.execute(select(User).order_by(User.id))
    users = users_result.scalars().all()

    user_details = []
    for u in users:
        # Aggregate telemetry for this user
        sessions_result = await db.execute(
            select(TelemetrySession).where(TelemetrySession.user_id == u.email)
        )
        sessions = sessions_result.scalars().all()

        total_clicks = 0
        pages = set()
        for s in sessions:
            pages.add(s.funnel_stage)
            try:
                clicks = json.loads(s.click_events_json or "[]")
                total_clicks += len(clicks)
            except Exception:
                pass

        last_visit = sessions[-1].timestamp.isoformat() if sessions else None
        rules_triggered = sum(1 for s in sessions if s.status == "processed")
        emails_sent = sum(1 for s in sessions if s.dispatch_status == "dispatched")

        user_details.append(UserDetail(
            id=u.id,
            name=u.name,
            email=u.email,
            created_at=u.created_at.isoformat() if u.created_at else None,
            last_visit=last_visit,
            pages_visited=len(pages),
            total_events=len(sessions),
            total_clicks=total_clicks,
            rules_triggered=rules_triggered,
            emails_sent=emails_sent,
        ))

    logger.info(f"[WAR ROOM] Served {len(user_details)} user profiles.")
    return user_details


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
# PILLAR D: DEMO SIMULATION LOOP
# ═══════════════════════════════════════════════════════

simulation_running = False

async def demo_simulation_loop():
    global simulation_running
    logger.info("[SIMULATION] Starting traffic simulation loop...")
    
    # Generate 40 initial "active" users for the constellation map
    active_users = []
    for i in range(40):
        active_users.append({
            "user_id": f"USR_{random.randint(1000, 9999)}",
            "score": random.randint(10, 80),
            "time_on_site": random.randint(10, 120),
            "last_page": random.choice(["/", "/investments", "/insurance", "/retirement", "/checkout", "/planning"])
        })
        
    while simulation_running:
        try:
            # Pick a random user to act
            u = random.choice(active_users)
            
            # Increase their time and intent score slightly
            u["time_on_site"] += 3
            if random.random() > 0.6:
                u["score"] = min(100, u["score"] + random.randint(1, 5))
                
            # Random page movement
            if random.random() > 0.8:
                u["last_page"] = random.choice(["/", "/investments", "/insurance", "/retirement", "/checkout", "/planning"])

            # Emit user activity
            await sio.emit('user_activity', {
                "user_id": u["user_id"],
                "score": u["score"],
                "time_on_site": u["time_on_site"],
                "last_page": u["last_page"],
                "action": "mouse_move" if random.random() > 0.3 else "click"
            })
            
            # Occasionally, simulate an AI trigger or manual override pulse
            if u["score"] > 85 and random.random() > 0.8:
                await sio.emit('intervention_sent', {"user_id": u["user_id"]})
            
            # Simulate a recovered conversion!
            if random.random() > 0.95:
                amt = random.choice([5000, 10000, 25000, 50000])
                await sio.emit('conversion_recovered', {"amount": amt})
                logger.info(f"[SIMULATION] Conversion Recovered: ₹{amt}")
                
                # Replace the user with a new one to keep the board fresh
                active_users.remove(u)
                active_users.append({
                    "user_id": f"USR_{random.randint(1000, 9999)}",
                    "score": random.randint(0, 20),
                    "time_on_site": 0,
                    "last_page": "/"
                })

            # Also occasionally simulate a "normal" conversion or revenue at risk
            if random.random() > 0.98:
                await sio.emit('revenue_at_risk', {"amount": random.choice([5000, 15000])})
            if random.random() > 0.98:
                await sio.emit('normal_conversion', {})

        except Exception as e:
            logger.error(f"[SIMULATION] Loop error: {e}")
            
        await asyncio.sleep(0.5)  # Throttle to 2 events per second

@app.post(
    "/api/admin/simulate-traffic",
    tags=["War Room"],
)
async def toggle_simulation(
    background_tasks: BackgroundTasks
):
    """
    Toggles the background traffic simulation for the dashboard demo.
    Unlocked for ease of presentation.
    """
    global simulation_running
    
    if simulation_running:
        simulation_running = False
        logger.info("[SIMULATION] Stopping...")
        return {"status": "stopped"}
    else:
        simulation_running = True
        background_tasks.add_task(demo_simulation_loop)
        return {"status": "running"}


# ═══════════════════════════════════════════════════════
# ENTRY POINT
# ═══════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:socket_app",
        host="0.0.0.0",
        port=8080,
        reload=True,
        log_level="info",
    )
