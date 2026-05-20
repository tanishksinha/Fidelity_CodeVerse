import os
import asyncio
from dotenv import load_dotenv
from supabase import create_client, Client

# Load the environment variables from your .env file
load_dotenv()

# Securely grab the credentials
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")

# Initialize the Supabase client gracefully
# Only connect if real credentials are present (not placeholder text)
supabase: Client = None
if url and key and url.startswith("http"):
    try:
        supabase = create_client(url, key)
        print("[SUCCESS] Supabase connected successfully!")
    except Exception as e:
        print(f"[WARNING] Supabase connection failed: {e}. Running in MOCK mode.")
        supabase = None
else:
    print("[WARNING] Supabase credentials not found in .env. Using MOCK database.")

async def save_telemetry_event(telemetry_data: dict) -> bool:
    """
    Flattens and saves the tracker JSON into the Supabase 'events' table.
    """
    if not supabase:
        print(f"💾 [MOCK DB] Saved event")
        return True

    try:
        # Flatten the nested JSON so Supabase can store it as flat columns
        telemetry = telemetry_data.get('behavioral_telemetry', {})
        friction = telemetry.get('friction_signals', {})
        hesitation = telemetry.get('hesitation_zones', [])

        flat_record = {
            "session_id": telemetry_data.get("session_id"),
            "user_id": telemetry_data.get("session_id"),  # Using session_id as user_id for tracking
            "event_type": "churn_signal",
            "page_url": telemetry_data.get("page_url", "/"),
            "element_name": hesitation[0]["element_id"] if hesitation else None,
            "event_value": f"rage_clicks={friction.get('rage_clicks',0)}, scroll_thrash={friction.get('scroll_thrash_count',0)}, time={telemetry.get('total_time_seconds',0)}s",
            "x_position": 0,
            "y_position": 0,
            "scroll_depth": int(telemetry.get("max_scroll_depth_percent", 0)),
        }

        response = supabase.table("events").insert(flat_record).execute()
        if response.data:
            print(f"💾 Saved event for {flat_record['session_id']}")
            return True
        return False
    except Exception as e:
        print(f"Database Error (save_telemetry_event): {e}")
        return False

async def get_user_history(session_id: str) -> dict:
    """
    Fetches how many times the user visited before and past actions.
    """
    if not supabase:
        return {"session_id": session_id, "total_events": 2, "past_events": []}
        
    try:
        # 🚨 Integration Fix: Searching by 'session_id' instead of 'user_id'
        response = supabase.table("events").select("*").eq("session_id", session_id).execute()
        
        return {
            "session_id": session_id,
            "total_events": len(response.data) if response.data else 0,
            "past_events": response.data if response.data else []
        }
    except Exception as e:
        print(f"Database Error (get_user_history): {e}")
        return {"error": str(e)}


async def update_event_intelligence(session_id: str, intelligence: dict) -> bool:
    """
    Updates the latest event for a session with AI-classified stage and reasoning.
    Called after semantic_mapper classifies the page.
    """
    if not supabase:
        print(f"💾 [MOCK DB] Updated intelligence for {session_id}: {intelligence}")
        return True

    try:
        response = supabase.table("events") \
            .update(intelligence) \
            .eq("session_id", session_id) \
            .execute()

        if response.data:
            print(f"🧠 AI Intelligence saved for {session_id}")
            return True
        return False
    except Exception as e:
        print(f"Database Error (update_event_intelligence): {e}")
        return False


async def save_user_identity(identity_data: dict) -> bool:
    """
    Saves or updates a user's contact info from the identity popup (foreign sites).
    Enables the full priority cascade (Email + WhatsApp) for bookmarklet sessions.
    NOTE: fidelity_ghost_id does not exist as a column in `users`; we upsert by email.
    """
    if not supabase:
        print(f"💾 [MOCK DB] Saved Identity for {identity_data.get('consumer_id')}")
        return True

    try:
        consumer_id = identity_data.get("consumer_id", "")
        email = identity_data.get("user_email", "")

        if not email:
            print(f"⚠️  save_user_identity: no email provided, skipping.")
            return False

        payload = {
            "email":         email,
            "name":          identity_data.get("user_name", "") or consumer_id,
            "phone":         identity_data.get("user_phone"),
            # password_hash is NOT NULL — ghost/bookmarklet users get a sentinel value
            "password_hash": "ghost_user_no_password",
            "role":          "USER",
        }
        response = supabase.table("users").upsert(payload, on_conflict="email").execute()

        if response.data:
            print(f"👤 Identity Synced for Ghost ID: {consumer_id} → email: {email}")
            return True
        return False
    except Exception as e:
        print(f"Database Error (save_user_identity): {e}")
        return False

