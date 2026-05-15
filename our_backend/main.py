import logging
from fastapi import FastAPI, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
import socketio

# --- THE IMPORTS (Connecting the Team) ---
from database import save_telemetry_event, get_user_history      # Person 3
from processor import should_we_nudge                            # Person 2
from brain import generate_intervention                          # Person 4
from notifications import trigger_priority_cascade               # Person 4

# Bridge function: adapts our telemetry data to Manaswini's brain.py format
async def generate_gemini_nudge(data: dict, history: dict) -> dict:
    telemetry = data.get('behavioral_telemetry', {})
    friction = telemetry.get('friction_signals', {})
    hesitation_zones = [h['element_id'] for h in telemetry.get('hesitation_zones', [])]
    
    context = {
        "friction_score": (friction.get('rage_clicks', 0) * 10) + (telemetry.get('total_time_seconds', 0) / 2),
        "confusion_score": friction.get('scroll_thrash_count', 0) * 25,
        "recent_actions": hesitation_zones,
        "history": f"User has {history.get('total_events', 0)} past visits."
    }
    result = generate_intervention(context)
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
    logger.info(f"📥 Received telemetry from {session_id}")
    
    # 1. DATABASE (Person 3): Save raw event instantly in the background
    background_tasks.add_task(save_telemetry_event, data)
    
    # 2. MATH/ML (Person 2): Check if they are about to leave
    if should_we_nudge(data):
        logger.info(f"🚨 High Friction detected for {session_id}. Triggering AI...")
        
        # 3. DATABASE (Person 3): Get context for the AI
        user_history = await get_user_history(session_id)
        
        # 4. AI (Person 4): Ask Gemini what to say
        nudge_package = await generate_gemini_nudge(data, user_history)
        logger.info(f"🧠 Gemini Decision: {nudge_package['message']}")
        
        # 5. WEBSOCKET (Person 1): Fire Toast Instantly to the specific user's room
        toast_data = {
            "message": nudge_package["message"],
            "type": "custom",
            "offerLabel": "AI Insight"
        }
        await sio.emit('receive_nudge', toast_data, room=session_id)
        
        # 6. NOTIFICATIONS (Person 4): Start the priority cascade (email/whatsapp if they don't come back)
        background_tasks.add_task(trigger_priority_cascade, session_id, nudge_package["message"])
        
    return {"status": "success", "session_id": session_id}

if __name__ == "__main__":
    import uvicorn
    logger.info("🚀 Starting Fidelity Smart-Engine on port 8080...")
    # Notice we run 'main:socket_app' so WebSockets and FastAPI run together
    uvicorn.run("main:socket_app", host="0.0.0.0", port=8080, reload=True)
