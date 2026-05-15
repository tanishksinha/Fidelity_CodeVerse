import os
import asyncio
from dotenv import load_dotenv
from supabase import create_client, Client

# Load the environment variables from your .env file
load_dotenv()

# Securely grab the credentials
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")

# Initialize the Supabase client
supabase: Client = create_client(url, key)

async def save_telemetry_event(telemetry_data: dict) -> bool:
    """
    Saves the raw tracker JSON into the Supabase 'events' table.
    """
    try:
        # We execute an insert into the 'events' table
        response = supabase.table("events").insert(telemetry_data).execute()
        
        # If we got data back, the insert was successful
        if response.data:
            return True
        return False
    except Exception as e:
        print(f"Database Error (save_telemetry_event): {e}")
        return False

async def get_user_history(user_id: str) -> dict:
    """
    Fetches how many times the user visited before and past actions.
    """
    try:
        # Query the 'events' table for all actions by this user
        response = supabase.table("events").select("*").eq("user_id", user_id).execute()
        
        # We can format the history however Person 4 (AI) needs it, 
        # but for now, we just return the raw list of past events
        return {
            "user_id": user_id,
            "total_events": len(response.data) if response.data else 0,
            "past_events": response.data if response.data else []
        }
    except Exception as e:
        print(f"Database Error (get_user_history): {e}")
        return {"error": str(e)}

