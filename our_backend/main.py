import logging
from fastapi import FastAPI, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import socketio

# --- THE IMPORTS (Connecting the Team) ---
from database import (save_telemetry_event, get_user_history,       # Person 3
                      update_event_intelligence, save_user_identity) # Person 3 (new)
from processor import analyze_session, decide_intervention           # ML + Behavior + Decision Engine
from brain import generate_intervention                              # Person 4
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
    allow_origins=["*"], # Allow everything for hackathon demo
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

    session_analysis = analyze_session(data, past_events=1, unique_pages=1, dom_stage=dom_stage)
    intervention = decide_intervention(
        behavior_type=session_analysis['behavior_type'],
        churn_probability=session_analysis['churn_probability'],
        stage=session_analysis['stage'],
        telemetry_data=data,
    )
    session_analysis['intervention'] = intervention

    if intervention['show_popup']:
        nudge_package = await generate_gemini_nudge(data, {}, session_analysis)
        return {"status": "success", "nudge": nudge_package["message"], "intensity": intervention["popup_intensity"]}
    
    return {"status": "ignored"}

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
    _own_site_keywords = ['localhost', 'synaptic', '/kyc', '/invest', '/checkout', '/payment']
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

    # --- COOLDOWN CHECK ---
    import time
    if not hasattr(app, "intervention_cooldowns"):
        app.intervention_cooldowns = {}
        
    now = time.time()
    last_time = app.intervention_cooldowns.get(session_id, 0)
    
    if intervention['show_popup'] or intervention['send_email'] or intervention['send_whatsapp']:
        if now - last_time < 30:
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
            toast_data = {
                "message":      nudge_package["message"],
                "type":         intervention["popup_intensity"],    # gentle / standard / urgent
                "offerLabel":   f"AI Insight — {session_analysis['behavior_type'].title()}",
                "offerAdvisor": intervention["offer_advisor"],       # show "Talk to advisor" button
                "delayMs":      intervention["popup_delay_ms"],      # frontend delays the popup
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

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting Synaptic Smart-Engine on port 8080...")
    uvicorn.run("main:socket_app", host="0.0.0.0", port=8080, reload=True)


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
