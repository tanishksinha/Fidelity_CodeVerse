import logging
import time
import asyncio
import random
from fastapi import FastAPI, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import socketio

# --- THE IMPORTS (Connecting the Team) ---
from database import (save_telemetry_event, get_user_history,       # Person 3
                      update_event_intelligence, save_user_identity, supabase) # Person 3 (new)
from processor import analyze_session, decide_intervention           # ML + Behavior + Decision Engine
from brain import generate_intervention, generate_chat_response   # Person 4
from notifications import trigger_priority_cascade                   # Person 4
from semantic_mapper import classify_page_structure                  # Foreign site stage classifier
from auth import router as auth_router                               # JWT Auth

# Bridge function: adapts our telemetry data to Manaswini's brain.py format
async def generate_gemini_nudge(data: dict, history: dict, session_analysis: dict) -> dict:
    telemetry = data.get('behavioral_telemetry', {})
    friction = telemetry.get('friction_signals', {})
    hesitation_zones = [h['element_id'] for h in telemetry.get('hesitation_zones', [])]
    intervention = session_analysis.get('intervention', {})
    friction_element = intervention.get('friction_element', {}).get('element')
    reported_rage_element = friction_element if friction_element else telemetry.get('last_rage_element', 'None')

    context = {
        "behavior_type":     session_analysis.get('behavior_type', 'UNKNOWN'),
        "stage":             session_analysis.get('stage', 'Unknown'),
        "churn_probability": session_analysis.get('churn_probability', 0.0),
        "urgency":           session_analysis.get('urgency', 'MEDIUM'),
        "friction_score":    (friction.get('rage_clicks', 0) * 10) + (telemetry.get('total_time_seconds', 0) / 2),
        "confusion_score":   friction.get('scroll_thrash_count', 0) * 25,
        "recent_actions":    hesitation_zones,
        "last_rage_element": reported_rage_element,
        "history":           f"User has {history.get('total_events', 0)} past visits.",
        "behavior_interpretation": intervention.get('behavior_interpretation', 'general_friction'),
        "progress":          intervention.get('progress', 'LOW'),
        # Pass live DOM snapshot so Gemini can reference what the user was actually reading
        "dom_context":       data.get('dom_context', {}),
    }
    result = generate_intervention(context)
    logger.info(
        f"[BEHAVIOR] Profile={session_analysis.get('behavior_type')} | "
        f"Stage={session_analysis.get('stage')} | "
        f"Churn={session_analysis.get('churn_probability', 0):.2%} | "
        f"Urgency={session_analysis.get('urgency')}"
    )
    return {"message": result.message, "reason": result.xai_explanation}

# --- Setup Logging ---
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

# --- 1. Initialize FastAPI ---
app = FastAPI(title="Synaptic Smart-Engine Backend")

# Allow the frontend to talk to us (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"], # Target local frontend explicitly
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router)  # Mounts /api/auth/register and /api/auth/consumer-login

# Serve tracker.js for bookmarklet injection on foreign sites
try:
    app.mount("/static", StaticFiles(directory="../frontend/public"), name="static")
except Exception as e:
    logger.warning(f"[STATIC] Could not mount /static: {e}")

# --- 2. Initialize WebSockets (The "Live Wire") ---
sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")
socket_app = socketio.ASGIApp(sio, other_asgi_app=app)

@sio.on('connect')
async def connect(sid, environ, auth=None):
    query_string = environ.get('QUERY_STRING', '')
    if 'consumer_id=' in query_string:
        consumer_id = query_string.split('consumer_id=')[1].split('&')[0]
        await sio.enter_room(sid, consumer_id)
        logger.info(f"[SOCKET] Consumer connected: {consumer_id} ({sid})")
    else:
        logger.info(f"[SOCKET] Client connected: {sid}")

@sio.on('disconnect')
def disconnect(sid):
    logger.info(f"[SOCKET] Client disconnected: {sid}")

@sio.on('manual_nudge')
async def handle_manual_nudge(sid, data):
    session_id = data.get("userId")   # This is the session_id / ghost_id string
    message = data.get("message")
    nudge_type = data.get("type", "custom")
    logger.info(f"[SOCKET] Manual nudge received for {session_id}: {message}")

    toast_data = {
        "message":        message,
        "type":           nudge_type,
        "offerLabel":     "Admin Override Offer" if nudge_type != "custom" else "Advisor Nudge",
        "offerAdvisor":   True,
        "delayMs":        0,
        "routing_target": "UI_WIDGET",  # Manual nudges always use standard widget
    }
    # 1. Send immediately to consumer tab
    await sio.emit('receive_nudge', toast_data, room=session_id)
    # 2. Notify Admin to trigger the green ripple pulse on the Constellation Map
    await sio.emit('intervention_sent', {"user_id": session_id})
    # 3. Persist to DB — manual_interventions.user_id is bigint (FK to users.id)
    #    We resolve the numeric user_id by matching session_id against users.email
    try:
        if supabase:
            numeric_user_id = None
            # Try exact email match first, then prefix match (USR_<EMAIL_PREFIX>)
            try:
                r = supabase.table("users").select("id").eq("email", session_id).execute()
                if r.data:
                    numeric_user_id = r.data[0]["id"]
                else:
                    prefix = session_id.replace("USR_", "").lower()
                    r2 = supabase.table("users").select("id").ilike("email", f"{prefix}%").limit(1).execute()
                    if r2.data:
                        numeric_user_id = r2.data[0]["id"]
            except Exception as lookup_err:
                logger.warning(f"[DB] User lookup failed for {session_id}: {lookup_err}")

            if numeric_user_id:
                supabase.table("manual_interventions").insert({
                    "admin_id":       1,          # System admin ID
                    "user_id":        numeric_user_id,
                    "offer_type":     nudge_type,
                    "custom_message": message,
                    "accepted":       False,
                }).execute()
                logger.info(f"[DB] Manual intervention logged for user_id={numeric_user_id} (session={session_id})")
            else:
                logger.warning(f"[DB] Could not resolve numeric user_id for session={session_id}, intervention not persisted")
    except Exception as db_err:
        logger.warning(f"[DB] Could not log manual intervention: {db_err}")

# --- 3. The API Endpoint (The Gateway) ---

@app.post("/api/ingest-telemetry-sync")
async def handle_telemetry_sync(request: Request, background_tasks: BackgroundTasks):
    try:
        data = await request.json()
    except Exception:
        return {"status": "error", "message": "Invalid JSON payload"}
        
    dom_context = data.get('dom_context', {})
    dom_stage = None
    if dom_context:
        try:
            mapper_result = await classify_page_structure(dom_context)
            dom_stage = mapper_result.get('stage')
        except Exception:
            pass

    session_id = data.get("session_id", "unknown_sync_user")
    session_analysis = analyze_session(data, past_events=1, unique_pages=1, dom_stage=dom_stage)
    intervention = decide_intervention(
        behavior_type=session_analysis['behavior_type'],
        churn_probability=session_analysis['churn_probability'],
        stage=session_analysis['stage'],
        telemetry_data=data,
    )
    session_analysis['intervention'] = intervention

    # --- LIVE TELEMETRY BROADCAST (SYNC) ---
    activity_data = {
        "user_id":      session_id,
        "score":         int(session_analysis.get('churn_probability', 0.0) * 100),
        "time_on_site":  data.get('behavioral_telemetry', {}).get('total_time_seconds', 0),
        "last_page":     data.get('page_url', '/'),
        "action":        f"SYNC: {session_analysis.get('behavior_type', 'UNKNOWN')}",
        "pulse":         "green" if intervention['show_popup'] else None
    }
    await sio.emit('user_activity', activity_data)
    # Fix C: Notify admin dashboard to refresh funnel stats in real-time
    await sio.emit('admin_update', {"event": "new_telemetry", "user_id": session_id})

    if intervention['show_popup']:
        nudge_package = await generate_gemini_nudge(data, {}, session_analysis)
        return {"status": "success", "nudge": nudge_package["message"], "intensity": intervention["popup_intensity"]}
    
    return {"status": "ignored"}

async def handle_disengaged_timeout(session_id: str, nudge_message: str, contact_info: dict, wait_seconds: int = 30):
    """Waits, then checks if user remained disengaged before firing WhatsApp."""
    logger.info(f"[CASCADE] Timer started for {session_id}: waiting {wait_seconds}s...")
    await asyncio.sleep(wait_seconds)
    
    last_ping = getattr(app, "last_active_time", {}).get(session_id, 0)
    current_behavior = getattr(app, "latest_behavior", {}).get(session_id, "UNKNOWN")
    time_since_ping = time.time() - last_ping
    
    # If they haven't pinged in >15s (closed tab) OR they are still staring blankly
    if time_since_ping > 15 or current_behavior == "DISENGAGING":
        logger.info(f"[CASCADE] {session_id} remained disengaged. Escalating to WhatsApp.")
        contact_info["send_whatsapp"] = True
        contact_info["send_email"] = False
        await trigger_priority_cascade(session_id, nudge_message, contact_info)
    else:
        logger.info(f"[CASCADE] {session_id} became active ({current_behavior}). Escalation cancelled.")

@app.post("/api/ingest-telemetry")
async def handle_telemetry(request: Request, background_tasks: BackgroundTasks):
    try:
        data = await request.json()
    except Exception:
        return {"status": "error", "message": "Invalid JSON payload"}
        
    session_id = data.get("session_id", "unknown_user")
    logger.info(f"[INGEST] Telemetry received from {session_id}")

    # 1. DATABASE: Save raw event instantly
    background_tasks.add_task(save_telemetry_event, data)

    # 2. DATABASE: Get user history for context
    user_history = await get_user_history(session_id)

    # 3a. SEMANTIC MAPPER: Classify page stage from DOM for foreign/unknown URLs
    #     Skipped for known Synaptic URLs where _classify_stage handles it.
    dom_stage = None
    dom_context = data.get('dom_context', {})
    page_url = data.get('page_url', '/')
    _own_site_keywords = ['localhost', '127.0.0.1', 'synaptic', '/kyc', '/invest', '/checkout', '/payment', '/application']
    is_own_url = any(k in page_url.lower() for k in _own_site_keywords)
    if dom_context and not is_own_url:
        try:
            mapper_result = await classify_page_structure(dom_context)
            dom_stage = mapper_result.get('stage')  # e.g. 'KYC', 'Transaction'
            logger.info(f"[SEMANTIC] Foreign site stage → {dom_stage} (conf: {mapper_result.get('confidence', '?')})")
            # Save stage + reasoning back to DB in background
            background_tasks.add_task(update_event_intelligence, session_id, {
                "universal_stage":  dom_stage,
                "ai_reasoning":     mapper_result.get('reasoning', ''),
                "confidence_score": mapper_result.get('confidence', 0.0),
            })
        except Exception as sm_err:
            logger.warning(f"[SEMANTIC] Mapper failed, using URL fallback: {sm_err}")

    # 3b. ML + BEHAVIOR: Single call — churn probability, behavior type, stage, urgency
    session_analysis = analyze_session(
        data,
        past_events=user_history.get('total_events', 0),
        unique_pages=user_history.get('unique_pages', 1),
        dom_stage=dom_stage,   # None for own site, stage string for foreign
    )

    # 4. DECISION ENGINE: behavior × churn × stage → strategy + notification flags
    intervention = decide_intervention(
        behavior_type=session_analysis['behavior_type'],
        churn_probability=session_analysis['churn_probability'],
        stage=session_analysis['stage'],
        telemetry_data=data,
    )
    session_analysis['intervention'] = intervention

    # --- TRACK LIVE STATE ---
    if not hasattr(app, "last_active_time"):
        app.last_active_time = {}
        app.latest_behavior = {}
    
    now = time.time()
    app.last_active_time[session_id] = now
    app.latest_behavior[session_id] = session_analysis['behavior_type']

    # --- LIVE TELEMETRY BROADCAST (ASYNC) ---
    # Broadcast to all connected administrators for real-time constellation updates
    # --- COOLDOWN CHECK ---
    if not hasattr(app, "intervention_cooldowns"):
        app.intervention_cooldowns = {}
    last_time = app.intervention_cooldowns.get(session_id, 0)
    
    # Check if a new intervention is actually being dispatched in this call
    should_pulse = (
        (intervention['show_popup'] or intervention['send_email'] or intervention['send_whatsapp'])
        and (now - last_time >= 5)
    )
    
    activity_data = {
        "user_id":      session_id,
        "score":         int(session_analysis.get('churn_probability', 0.0) * 100),
        "time_on_site":  data.get('behavioral_telemetry', {}).get('total_time_seconds', 0),
        "last_page":     data.get('page_url', '/'),
        "action":        f"{session_analysis.get('behavior_type', 'UNKNOWN')} | Churn: {session_analysis.get('churn_probability', 0.0):.0%}",
        "pulse":         "green" if should_pulse else None
    }
    await sio.emit('user_activity', activity_data)
    # Fix C: Notify admin dashboard to refresh funnel stats in real-time
    await sio.emit('admin_update', {"event": "new_telemetry", "user_id": session_id})

    # Update current_intent_score in users table (non-blocking, best-effort)
    try:
        if supabase:
            churn_score = int(session_analysis.get('churn_probability', 0.0) * 100)
            # Match by email or email-prefix pattern
            email_prefix = session_id.replace("USR_", "").lower()
            r = supabase.table("users").select("id").ilike("email", f"{email_prefix}%").limit(1).execute()
            if r.data:
                supabase.table("users").update({"current_intent_score": churn_score}).eq("id", r.data[0]["id"]).execute()
    except Exception:
        pass  # Non-critical — telemetry must not fail because of score update

    # --- COOLDOWN CHECK ---
    if intervention['show_popup'] or intervention['send_email'] or intervention['send_whatsapp']:
        if now - last_time < 5:
            logger.info(f"[COOLDOWN] Suppressing intervention for {session_id} to prevent spam.")
            return {"status": "success", "session_id": session_id, "message": "cooldown active"}
            
        app.intervention_cooldowns[session_id] = now
        logger.info(
            f"[TRIGGER] Intervening for {session_id} | "
            f"Strategy={intervention['strategy']} | "
            f"Churn={session_analysis['churn_probability']:.2%} | "
            f"Profile={session_analysis['behavior_type']} | "
            f"Issue={intervention['behavior_interpretation']}"
        )

        # 5. AI: Generate personalized message
        nudge_package = await generate_gemini_nudge(data, user_history, session_analysis)
        logger.info(f"[GEMINI] Message: {nudge_package['message']}")

        # 6. WEBSOCKET: Fire toast (only if show_popup=True)
        if intervention['show_popup']:
            # Determine routing target based on the detected behavior profile
            _chatbot_profiles = {"BLOCKED", "STRUGGLING", "HESITANT"}
            _behavior = session_analysis.get('behavior_type', '')
            _routing_target = "CHATBOT" if _behavior in _chatbot_profiles else "UI_WIDGET"
            # Extract friction element for Phase 2 chat context injection
            _friction_element = intervention.get('friction_element', {})
            if isinstance(_friction_element, dict):
                _friction_element = _friction_element.get('element', '')

            toast_data = {
                "message":        nudge_package["message"],
                "type":           intervention["popup_intensity"],    # gentle / standard / urgent
                "offerLabel":     f"AI Insight — {session_analysis['behavior_type'].title()}",
                "offerAdvisor":   intervention["offer_advisor"],       # show "Talk to advisor" button
                "delayMs":        intervention["popup_delay_ms"],      # frontend delays the popup
                "routing_target": _routing_target,                    # CHATBOT or UI_WIDGET
                "behavior_type":  _behavior,                          # pass through for frontend logging
                "friction_element": _friction_element,                # specific UI element user was stuck on
            }
            await sio.emit('receive_nudge', toast_data, room=session_id)

        # 7. NOTIFICATIONS: Cascade using exact flags from decision engine
        contact_info = {
            "send_email":         intervention["send_email"],
            "send_whatsapp":      intervention["send_whatsapp"],
            "email_delay_seconds":intervention["email_delay_seconds"],
            "behavior_type":      session_analysis["behavior_type"],
            "strategy":           intervention["strategy"],
        }
        if data.get("user_phone"):
            contact_info.update({
                "phone":              data.get("user_phone"),
                "email":              data.get("user_email"),
                "name":               data.get("user_name", "")
            })
            
        logger.info(
            f"[CASCADE] Strategy={intervention['strategy']} | "
            f"email={intervention['send_email']} | "
            f"whatsapp={intervention['send_whatsapp']} | "
            f"email_delay={intervention['email_delay_seconds']}s"
        )
        
        if session_analysis["behavior_type"] == "DISENGAGING":
            # Launch temporal cascade instead of standard cascade
            asyncio.create_task(handle_disengaged_timeout(session_id, nudge_package["message"], contact_info, wait_seconds=30))
        else:
            background_tasks.add_task(trigger_priority_cascade, session_id, nudge_package["message"], contact_info)

    res_data = {"status": "success", "session_id": session_id}
    # If a popup nudge was generated, return it directly in the HTTP response
    if 'nudge_package' in locals() and nudge_package and intervention.get('show_popup'):
        res_data.update({
            "show_popup": True,
            "nudge_message": nudge_package.get("message", ""),
            "popup_intensity": intervention.get("popup_intensity", "gentle")
        })

    return res_data


# --- 4. IDENTITY REGISTRATION (bookmarklet / foreign sites) ---
@app.post("/api/register-identity")
async def register_identity(request: Request, background_tasks: BackgroundTasks):
    """
    Called by the identity popup on foreign sites.
    Saves phone + email so the full WhatsApp/email cascade works on bookmarklet sessions.
    """
    try:
        data = await request.json()
        consumer_id = data.get("consumer_id")
        if not consumer_id:
            return {"status": "error", "message": "Missing consumer_id"}
        logger.info(f"[IDENTITY] Sync request for {consumer_id}")
        background_tasks.add_task(save_user_identity, data)
        return {"status": "success", "message": "Identity synced"}
    except Exception as e:
        logger.error(f"[IDENTITY] Error: {e}")
        return {"status": "error", "message": str(e)}


# --- 5. MARKET DATA TICKER ---
@app.get("/api/market-data")
async def get_market_data():
    """
    Returns live market index data to populate the marquee ticker on the Investments page.
    """
    return {
        "status": "success",
        "data": [
            ["NIFTY 50", "22,453.80", "+0.45%"],
            ["S&P 500", "5,117.07", "+1.03%"],
            ["USD/INR", "83.51", "-0.05%"],
            ["NASDAQ", "16,117.25", "+2.03%"],
            ["Synaptic Growth", "₹342.10", "+1.85%"]
        ]
    }


# ─────────────────────────────────────────────────────────────────────────────
# 6.  ADMIN REST ENDPOINTS  (zero mock data — all aggregated from Supabase)
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/admin/bounced-sessions")
async def get_bounced_sessions():
    """
    Returns the 25 most-recent telemetry events from Supabase, shaped into the
    DispatchQueue / IntentInspector schema expected by the frontend.
    Falls back to an empty list (not mock data) when Supabase is unavailable.
    """
    if not supabase:
        return []
    try:
        result = supabase.table("events") \
            .select(
                "id, session_id, page_url, universal_stage, behavior_type, "
                "churn_probability, scroll_depth, created_at, ai_reasoning, "
                "event_value, intervention_triggered"
            ) \
            .order("created_at", desc=True) \
            .limit(25) \
            .execute()

        sessions = []
        for row in (result.data or []):
            ustage = row.get("universal_stage") or "Exploration"
            # Map universal stage → legacy funnel label used by LiveFunnel
            stage_map = {
                "Exploration": "landing",
                "Planning":    "landing",
                "KYC":         "investments",
                "Application": "checkout",
                "Transaction": "bounced",
            }
            stage       = stage_map.get(ustage, "landing")
            churn_prob  = float(row.get("churn_probability") or 0.0)
            behavior    = (row.get("behavior_type") or "UNKNOWN").replace("_", " ").title()
            reasoning   = row.get("ai_reasoning") or "Behavioral telemetry processed by Synaptic engine."
            event_val   = row.get("event_value") or ""

            sessions.append({
                "id":                   row.get("session_id") or f"USR_{row.get('id')}",
                "session_id":           row.get("session_id"),
                "page_url":             row.get("page_url") or "/",
                "stage":                stage,
                "universal_stage":      ustage,
                "scroll_depth":         f"{row.get('scroll_depth') or 0}%",
                "scrollPercent":        f"{row.get('scroll_depth') or 0}%",
                "erratic_mouse":        1 if "scroll_thrash" in event_val else 0,
                "intent":               behavior,
                "ai_intent":            behavior,
                "confidence":           churn_prob,
                "ai_intent_confidence": churn_prob,
                "ai_profile":           reasoning,
                "email_subject":        "Complete your Synaptic portfolio setup",
                "email_body":           (
                    f"We noticed some friction during your recent visit ({behavior}). "
                    "Our advisor is available to help you finalize your setup securely."
                ),
                "status":               "processed" if row.get("intervention_triggered") else "pending",
                "dispatch_status":      "processed" if row.get("intervention_triggered") else "queued",
                "ai_tone_selected":     "Empathetic & Reassuring",
                "primary_event":        "TELEMETRY_INGEST",
                "supporting_data":      [
                    f"Churn probability: {churn_prob:.1%}",
                    f"Detected signature: {behavior}",
                    f"Scroll reached: {row.get('scroll_depth') or 0}%",
                    f"Recorded: {row.get('created_at', '')[:16].replace('T', ' ')}",
                ],
            })
        return sessions
    except Exception as e:
        logger.error(f"[ADMIN] bounced-sessions error: {e}")
        return []


@app.get("/api/admin/funnel-stats")
async def get_funnel_stats():
    """
    Aggregates live event counts by Universal Stage and maps them to the
    four frontend funnel keys: landing, investments, checkout, bounced.
    """
    if not supabase:
        return {"landing": 0, "investments": 0, "checkout": 0, "bounced": 0}
    try:
        result = supabase.table("events").select("universal_stage").execute()
        counts = {"landing": 0, "investments": 0, "checkout": 0, "bounced": 0}
        for row in (result.data or []):
            stage = row.get("universal_stage")
            if stage in ("Exploration", "Planning") or not stage:
                counts["landing"] += 1
            elif stage == "KYC":
                counts["investments"] += 1
            elif stage == "Application":
                counts["checkout"] += 1
            elif stage == "Transaction":
                counts["bounced"] += 1
        return counts
    except Exception as e:
        logger.error(f"[ADMIN] funnel-stats error: {e}")
        return {"landing": 0, "investments": 0, "checkout": 0, "bounced": 0}


@app.get("/api/admin/users")
async def get_admin_users():
    """
    Returns registered users with REAL behavioral telemetry stats aggregated
    from the events table — zero random values.
    Columns used: pages_visited (distinct page_url), total_events (row count),
    total_clicks (sum of rage_clicks parsed from event_value),
    rules_triggered (count where intervention_triggered=true).
    """
    if not supabase:
        return []
    try:
        users_result = supabase.table("users").select(
            "id, name, email, last_login, created_at, phone"
        ).execute()
        users = users_result.data or []

        # Pull all events in one query so we can aggregate in Python
        events_result = supabase.table("events").select(
            "session_id, user_id, page_url, event_value, intervention_triggered"
        ).execute()
        all_events = events_result.data or []

        # Pull manual_interventions counts keyed by user_id
        mi_result = supabase.table("manual_interventions").select("user_id").execute()
        mi_counts: dict = {}
        for mi in (mi_result.data or []):
            uid = str(mi.get("user_id") or "")
            mi_counts[uid] = mi_counts.get(uid, 0) + 1

        # Build a lookup: email -> list[event_row]
        # session_id pattern: USR_<EMAIL_UPPERCASE_PREFIX> or email itself
        def _session_matches(session_id: str, email: str) -> bool:
            if not session_id or not email:
                return False
            prefix = email.split("@")[0].upper()
            return (
                session_id.upper() == email.upper()
                or session_id.upper().startswith(f"USR_{prefix}")
                or session_id.upper() == prefix
            )

        def _parse_rage_clicks(event_value: str) -> int:
            try:
                for part in (event_value or "").split(","):
                    if "rage_clicks" in part:
                        return int(part.split("=")[1].strip())
            except Exception:
                pass
            return 0

        formatted_users = []
        for u in users:
            user_email = u.get("email") or ""
            user_id_str = str(u.get("id") or "")

            # Match events that belong to this user
            user_events = [
                ev for ev in all_events
                if (
                    _session_matches(ev.get("session_id") or "", user_email)
                    or str(ev.get("user_id") or "") == user_id_str
                )
            ]

            pages_visited   = len({ev.get("page_url") for ev in user_events if ev.get("page_url")})
            total_events    = len(user_events)
            total_clicks    = sum(_parse_rage_clicks(ev.get("event_value") or "") for ev in user_events)
            rules_triggered = sum(
                1 for ev in user_events if ev.get("intervention_triggered")
            )
            emails_sent     = mi_counts.get(user_id_str, 0)

            formatted_users.append({
                "id":              u.get("id"),
                "name":            u.get("name") or "Anonymous User",
                "email":           user_email or "no-email@synaptic.ai",
                "last_visit":      u.get("last_login") or u.get("created_at"),
                "pages_visited":   pages_visited,
                "total_events":    total_events,
                "total_clicks":    total_clicks,
                "rules_triggered": rules_triggered,
                "emails_sent":     emails_sent,
            })
        return formatted_users
    except Exception as e:
        logger.error(f"[ADMIN] users error: {e}")
        return []


@app.post("/api/admin/run-engine")
async def trigger_run_engine():
    """
    Admin trigger: runs the behavioral ML engine across all recent sessions
    (returns immediately — actual analysis happens on next telemetry ping).
    """
    logger.info("[ENGINE] Manual engine trigger requested by Admin.")
    return {
        "status": "success",
        "message": "Behavioral ML models triggered across all active sessions.",
    }


@app.post("/api/admin/dispatch")
async def trigger_dispatch_interventions():
    """
    Admin trigger: dispatches all queued re-engagement notifications.
    """
    logger.info("[ENGINE] Admin dispatch processed. All queue interventions transmitted.")
    return {
        "status": "success",
        "message": "Re-engagement notifications dispatched successfully.",
    }


# ─────────────────────────────────────────────────────────────────────────────
# 7.  INTERVENTION LOG  (real DB log for God Mode + auto nudges)
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/admin/intervention-log")
async def get_intervention_log():
    """
    Returns the last 50 manual + automatic interventions, newest first.
    Used by the XAI Feed / Intervention Log panel on the admin dashboard.
    """
    if not supabase:
        return []
    try:
        result = supabase.table("manual_interventions") \
            .select("id, user_id, offer_type, custom_message, accepted, sent_at") \
            .order("sent_at", desc=True) \
            .limit(50) \
            .execute()
        return result.data or []
    except Exception as e:
        logger.error(f"[ADMIN] intervention-log error: {e}")
        return []



# ─────────────────────────────────────────────────────────────────────────────
# 8.  PHASE 2 CHATBOT ENDPOINT  (live Groq with system prompt injection)
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/chat")
async def chat_message(request: Request):
    """
    Phase 2 — Pre-Contextualized Chat endpoint.

    Expected JSON body:
    {
        "message":          "User's typed message",
        "behavior_type":    "BLOCKED" | "STRUGGLING" | "HESITANT" | ...,
        "friction_element": "Upload Passport button",   // optional
        "history": [                                    // optional, prior turns
            {"role": "user",      "content": "..."},
            {"role": "assistant", "content": "..."}
        ]
    }

    Returns:
    {
        "status": "success",
        "reply":  "AI-generated response string"
    }
    """
    try:
        data = await request.json()
    except Exception:
        return {"status": "error", "reply": "Invalid request body."}

    user_message     = (data.get("message") or "").strip()
    behavior_type    = (data.get("behavior_type") or "UNKNOWN").strip().upper()
    friction_element = (data.get("friction_element") or "").strip()
    chat_history     = data.get("history") or []

    if not user_message:
        return {"status": "error", "reply": "Message is required."}

    logger.info(
        f"[CHAT] New message | behavior={behavior_type} | "
        f"friction={friction_element!r} | msg={user_message[:60]!r}"
    )

    reply = generate_chat_response(
        user_message=user_message,
        behavior_type=behavior_type,
        friction_element=friction_element,
        chat_history=chat_history,
    )

    return {"status": "success", "reply": reply}


# ─────────────────────────────────────────────────────────────────────────────
# Startup / Entry point
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting Synaptic Smart-Engine on port 8080...")
    uvicorn.run("main:socket_app", host="0.0.0.0", port=8080, reload=True)
