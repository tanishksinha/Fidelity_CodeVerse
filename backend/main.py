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
import httpx
from contextlib import asynccontextmanager
import socketio
import yfinance as yf
from datetime import datetime, timezone
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail as SendGridMail
from twilio.rest import Client as TwilioClient

from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware

from auth import create_access_token, verify_admin
from config import get_settings
from supabase_client import supabase
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

# ─── Initialize External Clients ───
sg_client = SendGridAPIClient(settings.SENDGRID_API_KEY) if settings.SENDGRID_API_KEY else None
twilio_client = TwilioClient(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN) if settings.TWILIO_ACCOUNT_SID else None
supabase_headers = {
    "apikey": settings.SUPABASE_KEY,
    "Authorization": f"Bearer {settings.SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}


# ─── Application Lifecycle ───
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize Supabase demo data on startup."""
    logger.info("=" * 60)
    logger.info("  FIDELITY BEHAVIORAL RE-ENGAGEMENT ENGINE")
    logger.info("  Status: INITIALIZING (DEMO MODE)")
    logger.info("=" * 60)
    
    try:
        import hashlib
        # Check if users exist in Supabase
        existing_users = await supabase.select("users")
        if not existing_users:
            logger.info("[STARTUP] Seeding 5 registered consumer accounts to Supabase...")
            dummy_pw = hashlib.sha256("demo123".encode()).hexdigest()
            demo_users = [
                {"name": "Arjun Mehta", "email": "arjun.mehta@demo.com", "password_hash": dummy_pw, "role": "consumer"},
                {"name": "Priya Sharma", "email": "priya.sharma@demo.com", "password_hash": dummy_pw, "role": "consumer"},
                {"name": "Rahul Desai", "email": "rahul.desai@demo.com", "password_hash": dummy_pw, "role": "consumer"},
                {"name": "Sneha Iyer", "email": "sneha.iyer@demo.com", "password_hash": dummy_pw, "role": "consumer"},
                {"name": "Vikram Patel", "email": "vikram.patel@demo.com", "password_hash": dummy_pw, "role": "consumer"},
            ]
            await supabase.insert_many("users", demo_users)
            logger.info("[STARTUP] ✓ 5 dummy users created in Supabase (password: demo123)")

        # Seed sessions if empty
        existing_sessions = await supabase.select("sessions")
        if not existing_sessions:
            logger.info("[STARTUP] Note: Sessions and Events table are empty. Waiting for live telemetry.")
            
    except Exception as e:
        logger.error(f"[STARTUP] Could not seed demo data to Supabase: {e}")

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
        # Check if users exist in Supabase
        users = await supabase.select("users", params={"email": f"eq.{payload.user_id}"})
        if not users:
            logger.warning(f"[INGESTION] User {payload.user_id} not found in DB. Storing as anonymous.")
            db_user_id = None
        else:
            db_user_id = users[0]["id"]
            
        # The frontend provides string session_id, but the events table supports string session_id.
        telemetry = payload.behavioral_telemetry
        is_bounce = telemetry.exit_condition == "bounced"
        
        session_record = {
            "user_id": db_user_id,
            "is_bounce": is_bounce,
            "device_type": "unknown",
            "browser": "unknown",
            "ip_address": "0.0.0.0"
        }
        
        # Insert into sessions to get integer ID if needed, but we don't strictly need the return ID 
        # since our events table links via string session_id. Wait, we should get the ID.
        try:
            # We don't have a specific ID returned reliably unless we do it correctly, 
            # but we can insert the events tied to the string session_id anyway.
            await supabase.insert("sessions", session_record)
        except Exception as insert_err:
            logger.warning(f"[INGESTION] Failed to insert session record: {insert_err}")

        # Insert multiple events
        events_to_insert = []
        
        # Click Events
        for click in telemetry.click_events:
            events_to_insert.append({
                "session_id": payload.session_id,
                "user_id": str(db_user_id) if db_user_id else payload.user_id,
                "event_type": "click",
                "page_url": click.page_url,
                "element_name": click.element_id,
                "x_position": 0,
                "y_position": 0,
                "scroll_depth": telemetry.max_scroll_depth_percent
            })
            
        # Hesitation Events
        for hesitation in telemetry.hesitation_zones:
            events_to_insert.append({
                "session_id": payload.session_id,
                "user_id": str(db_user_id) if db_user_id else payload.user_id,
                "event_type": "hesitation",
                "page_url": payload.page_url,
                "element_name": hesitation.element_id,
                "event_value": str(hesitation.time_spent_ms),
                "x_position": 0,
                "y_position": 0,
                "scroll_depth": telemetry.max_scroll_depth_percent
            })
            
        # Erratic Mouse Movement as an event
        if telemetry.friction_signals.erratic_mouse_movements > 0:
             events_to_insert.append({
                "session_id": payload.session_id,
                "user_id": str(db_user_id) if db_user_id else payload.user_id,
                "event_type": "erratic_mouse",
                "page_url": payload.page_url,
                "element_name": "viewport",
                "event_value": str(telemetry.friction_signals.erratic_mouse_movements),
                "x_position": 0,
                "y_position": 0,
                "scroll_depth": telemetry.max_scroll_depth_percent
             })

        if events_to_insert:
            await supabase.insert_many("events", events_to_insert)

        logger.info(
            f"[INGESTION] ✓ Secured {len(events_to_insert)} events for session: {payload.session_id} "
            f"(time: {telemetry.total_time_seconds}s)"
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
                risk_amount = random.choice([5000, 10000, 15000, 25000])
                await sio.emit('revenue_at_risk', {"amount": risk_amount, "session_id": payload.session_id})
                logger.info(f"[ML] ⚠ Revenue at risk: ₹{risk_amount} for {payload.session_id}")
        except Exception as ml_err:
            logger.warning(f"[ML] Predictor unavailable: {ml_err}")

    except Exception as e:
        logger.error(f"[INGESTION] ✗ Supabase write failed: {e}")


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

    # Fetch all bounced sessions that haven't been processed yet
    # We use final_intent_score IS NULL as a proxy for "unprocessed"
    sessions = await supabase.select("sessions", params={"is_bounce": "eq.true", "final_intent_score": "is.null"})

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
            # We don't have the string session_id reliably mapped in sessions table if we didn't insert it,
            # but we assume the user_id exists. Let's fetch events by user_id for this simple mapping.
            # In a true normalized schema we would use a proper session_id foreign key.
            events = await supabase.select("events", params={"user_id": f"eq.{session.get('user_id')}"})
            
            click_events = []
            hesitation_zones = []
            erratic_mouse = 0
            page_url = "/"
            
            for e in events:
                if e.get("page_url"): page_url = e.get("page_url")
                
                if e.get("event_type") == "click":
                    click_events.append({"element_id": e.get("element_name"), "page_url": e.get("page_url")})
                elif e.get("event_type") == "hesitation":
                    hesitation_zones.append({"element_id": e.get("element_name"), "time_spent_ms": int(e.get("event_value", 0))})
                elif e.get("event_type") == "erratic_mouse":
                    erratic_mouse += int(e.get("event_value", 0))

            telemetry_data = {
                "session_id": "Session_" + str(session.get("id")),
                "page_url": page_url,
                "funnel_stage": _infer_funnel_stage(page_url),
                "total_time_seconds": 120, # Placeholder since started_at/ended_at might be null
                "max_scroll_depth_percent": 100,
                "exit_condition": "bounced",
                "exit_velocity": 0,
                "erratic_mouse_movements": erratic_mouse,
                "highlighted_text": None,
                "hesitation_zones": hesitation_zones,
                "click_events": click_events
            }

            # Send to LLM
            analysis = await analyze_session(telemetry_data)

            # Insert into nudges table
            nudge_data = {
                "user_id": session.get("user_id"),
                "session_id": session.get("id"),
                "nudge_type": "email",
                "delivery_channel": "email",
                "message": f"SUBJECT: {analysis['email_subject']}\\n\\n{analysis['email_body']}",
                "status": "pending",
                "clicked": False,
                "converted": False
            }
            await supabase.insert("nudges", nudge_data)
            
            # Update the session to mark it processed
            await supabase.update("sessions", 
                match_params={"id": f"eq.{session.get('id')}"},
                data={"final_intent_score": int(analysis['confidence'] * 100)}
            )

            processed += 1
            logger.info(
                f"[ENGINE] ✓ Session {session.get('id')} → "
                f"{analysis['intent']} ({analysis['confidence']:.0%})"
            )

        except Exception as e:
            skipped += 1
            error_msg = f"Session {session.get('id')}: {str(e)}"
            errors.append(error_msg)
            logger.error(f"[ENGINE] ✗ {error_msg}")

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
async def register_consumer(body: RegisterRequest):
    """Register a new consumer user."""
    import hashlib
    existing = await supabase.select("users", params={"email": f"eq.{body.email}"})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered.")

    pw_hash = hashlib.sha256(body.password.encode()).hexdigest()
    user_data = {"name": body.name, "email": body.email, "password_hash": pw_hash}
    await supabase.insert("users", user_data)
    logger.info(f"[AUTH] ✓ New consumer registered: {body.email}")
    return {"status": "registered", "email": body.email}


# ─── Consumer Login ───
@app.post("/api/auth/consumer-login", tags=["Auth"])
async def consumer_login(body: ConsumerLoginRequest):
    """Authenticate a consumer user and issue JWT."""
    import hashlib
    users = await supabase.select("users", params={"email": f"eq.{body.email}"})
    if not users:
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    
    user = users[0]
    pw_hash = hashlib.sha256(body.password.encode()).hexdigest()
    if user.get("password_hash") != pw_hash:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = create_access_token(user.get("email"), role="consumer")
    logger.info(f"[AUTH] ✓ Consumer login: {user.get('email')}")
    return {"access_token": token, "token_type": "bearer", "role": "consumer", "name": user.get("name"), "email": user.get("email")}


# ─── Admin: All Users with Behavior Stats ───
@app.get("/api/admin/users", response_model=list[UserDetail], tags=["War Room"])
async def get_all_users(
    admin: dict = Depends(verify_admin),
):
    """Returns all registered users with aggregated behavior statistics."""
    users = await supabase.select("users")

    user_details = []
    for u in users:
        # Aggregate telemetry for this user
        sessions = await supabase.select("sessions", params={"user_id": f"eq.{u.get('id')}"})
        events = await supabase.select("events", params={"user_id": f"eq.{u.get('id')}"})
        nudges = await supabase.select("nudges", params={"user_id": f"eq.{u.get('id')}"})

        total_clicks = sum(1 for e in events if e.get("event_type") == "click")
        pages = set(e.get("page_url") for e in events if e.get("page_url"))

        last_visit = sessions[-1].get("started_at") if sessions else None
        rules_triggered = len(nudges)
        emails_sent = sum(1 for n in nudges if n.get("status") == "dispatched")

        user_details.append(UserDetail(
            id=u.get("id"),
            name=u.get("name"),
            email=u.get("email"),
            created_at=u.get("created_at"),
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
    admin: dict = Depends(verify_admin),
):
    """
    Returns aggregate session counts for each funnel stage.
    Powers the Live Funnel Node Graph in the dashboard.
    """
    events = await supabase.select("events")
    
    counts = {}
    for e in events:
        page_url = e.get("page_url", "")
        stage = _infer_funnel_stage(page_url)
        if stage != "unknown":
            counts[stage] = counts.get(stage, 0) + 1

    total = sum(counts.values())
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
    admin: dict = Depends(verify_admin),
):
    """
    Returns detailed logs for all captured sessions.
    Powers the Dispatch Queue and Intent Inspector panels.
    """
    sessions = await supabase.select("sessions", params={"is_bounce": "eq.true"})

    details = []
    for s in sessions:
        session_id = s.get("id")
        # Fetch related events and nudge
        events = await supabase.select("events", params={"session_id": f"eq.Session_{session_id}"})
        nudges = await supabase.select("nudges", params={"session_id": f"eq.{session_id}"})
        nudge = nudges[0] if nudges else None
        
        page_url = "/"
        erratic_mouse = 0
        hesitation = []
        for e in events:
            if e.get("page_url"): page_url = e.get("page_url")
            if e.get("event_type") == "erratic_mouse":
                erratic_mouse += int(e.get("event_value", 0))
            if e.get("event_type") == "hesitation":
                hesitation.append({"element_id": e.get("element_name"), "time_spent_ms": int(e.get("event_value", 0))})

        details.append(
            SessionDetail(
                id=f"Session_{session_id}",
                stage=_infer_funnel_stage(page_url),
                page_url=page_url,
                total_time_seconds=120, # Placeholder
                scroll_depth="100%",
                exit_velocity=0,
                erratic_mouse=erratic_mouse,
                highlighted_text=None,
                hesitation_zones=hesitation,
                intent="Needs Help" if nudge else None,
                confidence=float(s.get("final_intent_score") or 0) / 100.0 if s.get("final_intent_score") else 0,
                profile="User hesitated during checkout." if nudge else None,
                email_subject="Can we help?" if nudge else None,
                email_body=nudge.get("message") if nudge else None,
                status="processed" if nudge else "abandoned",
                dispatch_status=nudge.get("status") if nudge else "pending",
            )
        )

    logger.info(f"[WAR ROOM] Served {len(details)} session records to dashboard.")
    return details


@app.post(
    "/api/admin/dispatch",
    tags=["War Room"],
)
async def dispatch_emails(
    admin: dict = Depends(verify_admin),
):
    """
    Mark all processed sessions as 'dispatched'.
    Simulates sending the AI-generated re-engagement emails.
    """
    nudges = await supabase.select("nudges", params={"status": "eq.pending"})

    for n in nudges:
        user_id = n.get("user_id")
        users = await supabase.select("users", params={"id": f"eq.{user_id}"})
        email_address = users[0].get("email") if users else None

        # 1. Send Real Email via SendGrid
        if sg_client and email_address and n.get("message"):
            try:
                message = SendGridMail(
                    from_email='compliance@fidelity-reengage.demo', # Change to a verified sender for production
                    to_emails=email_address,
                    subject="Fidelity Update",
                    plain_text_content=n.get("message")
                )
                sg_client.send(message)
                logger.info(f"[DISPATCH] ✓ SendGrid email sent to {email_address}")
            except Exception as e:
                logger.error(f"[DISPATCH] ✗ SendGrid failed for {email_address}: {e}")

        # 2. Send Real WhatsApp via Twilio
        if twilio_client and settings.TWILIO_WHATSAPP_NUMBER:
            try:
                # In a real app, we'd have the user's phone number. 
                # For this demo, we'll send a notification to a "concierge" or placeholder.
                twilio_client.messages.create(
                    from_=settings.TWILIO_WHATSAPP_NUMBER,
                    body=f"Fidelity Re-Engagement: Nudge dispatched for {email_address}.",
                    to='whatsapp:+919876543210' # Placeholder: In prod, this would be the user's verified WhatsApp
                )
                logger.info(f"[DISPATCH] ✓ Twilio WhatsApp notification triggered.")
            except Exception as e:
                logger.error(f"[DISPATCH] ✗ Twilio failed: {e}")

        await supabase.update("nudges", match_params={"id": f"eq.{n.get('id')}"}, data={"status": "dispatched"})

    logger.info(f"[DISPATCH] ✓ {len(nudges)} interventions marked as dispatched.")
    return {
        "dispatched_count": len(nudges),
        "message": f"{len(nudges)} re-engagement emails dispatched.",
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

@app.get("/api/market-data", tags=["Market Data"])
def get_live_market_data():
    """
    Returns actual live market data by securely scraping Google Finance.
    (Bypasses yfinance API blocking).
    """
    import requests
    from bs4 import BeautifulSoup
    import time
    
    data = []
    tickers = [
        ("NIFTY 50", "NIFTY_50:INDEXNSE"),
        ("S&P 500", ".INX:INDEXSP"),
        ("USD/INR", "USD-INR")
    ]
    
    for label, ticker in tickers:
        try:
            r = requests.get(f'https://www.google.com/finance/quote/{ticker}', timeout=3)
            soup = BeautifulSoup(r.text, 'html.parser')
            
            price_div = soup.find('div', class_='YMlKec fxKbKc')
            price = price_div.text if price_div else "Unavailable"
            
            # Google Finance stores percentage change in this class
            change_div = soup.find('div', class_='JwB6zf')
            change = change_div.text if change_div else ""
            
            data.append([label, price, change])
        except Exception as e:
            logger.error(f"[MARKET_DATA] Failed to fetch {label}: {e}")
            data.append([label, "Unavailable", ""])
            
    return {
        "status": "success", 
        "data": data
    }


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
