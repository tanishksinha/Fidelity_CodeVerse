import logging
from fastapi import FastAPI, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
import socketio

# --- THE IMPORTS (Connecting the Team) ---
from database import save_telemetry_event, get_user_history, update_event_intelligence, save_user_identity # Person 3/4
from processor import should_we_nudge                            # Person 2
from brain import generate_intervention                          # Person 4
from notifications import trigger_priority_cascade               # Person 4
from semantic_mapper import classify_page_structure              # Person 4
from auth import router as auth_router                           # JWT Auth

# Bridge function: adapts our telemetry data to Manaswini's brain.py format
async def generate_gemini_nudge(data: dict, history: dict) -> dict:
    telemetry = data.get('behavioral_telemetry', {})
    friction = telemetry.get('friction_signals', {})
    hesitation_zones = [h['element_id'] for h in telemetry.get('hesitation_zones', [])]
    
    # NEW: Get the classified stage from the most recent event in history
    current_stage = "Unknown"
    if history.get('past_events'):
        # Sort by id or just take the last one added
        latest_event = history['past_events'][-1]
        current_stage = latest_event.get('universal_stage', 'Exploration')

    context = {
        "friction_score": (friction.get('rage_clicks', 0) * 10) + (telemetry.get('total_time_seconds', 0) / 2),
        "confusion_score": friction.get('scroll_thrash_count', 0) * 25,
        "recent_actions": hesitation_zones,
        "last_rage_element": telemetry.get('last_rage_element', 'None'),
        "history": f"User has {history.get('total_events', 0)} past visits.",
        "current_page_stage": current_stage
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
        
    # IDENTITY SYNC: Prioritize the Ghost ID from Person 2's SDK
    session_id = data.get("fidelity_ghost_id") or data.get("session_id", "unknown_user")
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
        
        # 6. NOTIFICATIONS (Person 4): Pass contact info directly from beacon (no DB lookup needed)
        contact_info = None
        if data.get("user_phone"):
            contact_info = {
                "phone": data.get("user_phone"),
                "email": data.get("user_email"),
                "name": data.get("user_name", "")
            }
            logger.info(f"[IDENTIFIED] User has phone on file: {data.get('user_email')} — full cascade enabled")
        background_tasks.add_task(trigger_priority_cascade, session_id, nudge_package["message"], contact_info)
        
    return {"status": "success", "session_id": session_id}

@app.post("/api/register-identity")
async def register_identity(request: Request, background_tasks: BackgroundTasks):
    """
    Person 2/4 - Identity Sync:
    Captures user details from the 'Unstoppable SDK' popup.
    """
    try:
        data = await request.json()
        ghost_id = data.get("fidelity_ghost_id")
        
        if not ghost_id:
            return {"status": "error", "message": "Missing fidelity_ghost_id"}
            
        logger.info(f"👤 Identity Sync request for {ghost_id}")
        
        # Save to Supabase in the background
        background_tasks.add_task(save_user_identity, data)
        
        return {"status": "success", "message": "Identity synced"}
    except Exception as e:
        logger.error(f"Error in register_identity: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/api/analyze-page")
async def analyze_page(request: Request, background_tasks: BackgroundTasks):
    """
    Person 4 - Step 2: Semantic Mapper Endpoint
    Receives DOM summary, classifies page stage, and updates DB.
    """
    try:
        data = await request.json()
        session_id = data.get("session_id", "unknown")
        dom_summary = data.get("dom_summary", {})
        
        # 1. Classify the page using Gemini
        analysis = await classify_page_structure(dom_summary)
        
        # 2. Update the database in the background
        intelligence = {
            "universal_stage": analysis.get("stage"),
            "ai_reasoning": analysis.get("reasoning"),
            "confidence_score": analysis.get("confidence")
        }
        background_tasks.add_task(update_event_intelligence, session_id, intelligence)
        
        logger.info(f"[SEMANTIC] Session {session_id} mapped to stage: {analysis.get('stage')}")
        return {"status": "success", "stage": analysis.get("stage"), "reasoning": analysis.get("reasoning")}
        
    except Exception as e:
        logger.error(f"[SEMANTIC] Error in analyze_page: {e}")
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    import uvicorn
    logger.info("🚀 Starting Fidelity Smart-Engine on port 8080...")
    # Notice we run 'main:socket_app' so WebSockets and FastAPI run together
    uvicorn.run("main:socket_app", host="0.0.0.0", port=8080, reload=True)
