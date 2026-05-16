import logging
from fastapi import FastAPI, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
import socketio

# --- THE IMPORTS (Connecting the Team) ---
from database import save_telemetry_event, get_user_history      # Person 3
from processor import analyze_session, decide_intervention         # ML + Behavior + Decision Engine
from brain import generate_intervention                          # Person 4
from notifications import trigger_priority_cascade               # Person 4
from auth import router as auth_router                           # JWT Auth

# Bridge function: adapts our telemetry data to Manaswini's brain.py format
async def generate_gemini_nudge(data: dict, history: dict, session_analysis: dict) -> dict:
    telemetry = data.get('behavioral_telemetry', {})
    friction = telemetry.get('friction_signals', {})
    hesitation_zones = [h['element_id'] for h in telemetry.get('hesitation_zones', [])]

    context = {
        "behavior_type":     session_analysis.get('behavior_type', 'UNKNOWN'),
        "stage":             session_analysis.get('stage', 'Unknown'),
        "churn_probability": session_analysis.get('churn_probability', 0.0),
        "urgency":           session_analysis.get('urgency', 'MEDIUM'),
        "friction_score":    (friction.get('rage_clicks', 0) * 10) + (telemetry.get('total_time_seconds', 0) / 2),
        "confusion_score":   friction.get('scroll_thrash_count', 0) * 25,
        "recent_actions":    hesitation_zones,
        "last_rage_element": telemetry.get('last_rage_element', 'None'),
        "history":           f"User has {history.get('total_events', 0)} past visits."
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
app = FastAPI(title="Fidelity Smart-Engine Backend")

# Allow the frontend to talk to us (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow everything for hackathon demo
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router)  # Mounts /api/auth/register and /api/auth/consumer-login

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

    # 3. ML + BEHAVIOR: Single call — churn probability, behavior type, stage, urgency
    session_analysis = analyze_session(
        data,
        past_events=user_history.get('total_events', 0),
        unique_pages=user_history.get('unique_pages', 1)
    )

    # 4. DECISION ENGINE: behavior × churn × stage → strategy + notification flags
    intervention = decide_intervention(
        behavior_type=session_analysis['behavior_type'],
        churn_probability=session_analysis['churn_probability'],
        stage=session_analysis['stage'],
        telemetry_data=data,
    )
    session_analysis['intervention'] = intervention

    if intervention['show_popup'] or intervention['send_email'] or intervention['send_whatsapp']:
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
        contact_info = None
        if data.get("user_phone"):
            contact_info = {
                "phone":              data.get("user_phone"),
                "email":              data.get("user_email"),
                "name":               data.get("user_name", ""),
                "send_email":         intervention["send_email"],
                "send_whatsapp":      intervention["send_whatsapp"],
                "email_delay_seconds":intervention["email_delay_seconds"],
                "behavior_type":      session_analysis["behavior_type"],
                "strategy":           intervention["strategy"],
            }
            logger.info(
                f"[CASCADE] Strategy={intervention['strategy']} | "
                f"email={intervention['send_email']} | "
                f"whatsapp={intervention['send_whatsapp']} | "
                f"email_delay={intervention['email_delay_seconds']}s"
            )
        background_tasks.add_task(trigger_priority_cascade, session_id, nudge_package["message"], contact_info)

    return {"status": "success", "session_id": session_id}

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting Fidelity Smart-Engine on port 8080...")
    uvicorn.run("main:socket_app", host="0.0.0.0", port=8080, reload=True)
