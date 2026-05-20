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

rules_cache = {}

async def seed_default_rules():
    global rules_cache
    if not supabase:
        return
    try:
        res = supabase.table("rules").select("id").limit(1).execute()
        if not res.data:
            rules = [
                {
                    "rule_name": "BLOCKED_RULE",
                    "description": "Triggered when user is stuck on a critical stage.",
                    "min_intent_score": 0,
                    "required_event": "none",
                    "required_page": "*",
                    "time_threshold_seconds": 0,
                    "message_type": "URGENT",
                    "is_active": True
                },
                {
                    "rule_name": "STRUGGLING_RULE",
                    "description": "Triggered when high friction signals are detected.",
                    "min_intent_score": 0,
                    "required_event": "none",
                    "required_page": "*",
                    "time_threshold_seconds": 0,
                    "message_type": "EMPATHETIC",
                    "is_active": True
                },
                {
                    "rule_name": "DISENGAGING_RULE",
                    "description": "Triggered when inactivity or scroll hesitation is detected.",
                    "min_intent_score": 0,
                    "required_event": "none",
                    "required_page": "*",
                    "time_threshold_seconds": 0,
                    "message_type": "RE_ENGAGING",
                    "is_active": True
                },
                {
                    "rule_name": "CONFUSED_RULE",
                    "description": "Triggered when user wanders or hesitates repeatedly.",
                    "min_intent_score": 0,
                    "required_event": "none",
                    "required_page": "*",
                    "time_threshold_seconds": 0,
                    "message_type": "SIMPLE",
                    "is_active": True
                },
                {
                    "rule_name": "HESITANT_RULE",
                    "description": "Triggered when security/risk hesitation is detected.",
                    "min_intent_score": 0,
                    "required_event": "none",
                    "required_page": "*",
                    "time_threshold_seconds": 0,
                    "message_type": "REASSURING",
                    "is_active": True
                },
                {
                    "rule_name": "EXPLORING_RULE",
                    "description": "Triggered when user explores comparison features.",
                    "min_intent_score": 0,
                    "required_event": "none",
                    "required_page": "*",
                    "time_threshold_seconds": 0,
                    "message_type": "INFORMATIVE",
                    "is_active": True
                },
                {
                    "rule_name": "HIGH_INTENT_RULE",
                    "description": "Triggered when user is near conversion.",
                    "min_intent_score": 0,
                    "required_event": "none",
                    "required_page": "*",
                    "time_threshold_seconds": 0,
                    "message_type": "DIRECT",
                    "is_active": True
                },
                {
                    "rule_name": "UNKNOWN_RULE",
                    "description": "Default fallback rule.",
                    "min_intent_score": 0,
                    "required_event": "none",
                    "required_page": "*",
                    "time_threshold_seconds": 0,
                    "message_type": "GENERAL",
                    "is_active": True
                }
            ]
            supabase.table("rules").insert(rules).execute()
            print("[SUCCESS] Seeded default rules into Supabase!")
        
        # Now load cache
        res_all = supabase.table("rules").select("id, rule_name").execute()
        if res_all.data:
            rules_cache = {row["rule_name"]: row["id"] for row in res_all.data}
            print(f"[SUCCESS] Loaded rules cache: {rules_cache}")
    except Exception as e:
        print(f"Error seeding/loading rules: {e}")

async def save_telemetry_event(telemetry_data: dict) -> bool:
    """
    Flattens and saves the tracker JSON into the Supabase 'events' table.
    """
    if not supabase:
        print(f"≡ƒÆ╛ [MOCK DB] Saved event")
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
            print(f"≡ƒÆ╛ Saved event for {flat_record['session_id']}")
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
        return {"session_id": session_id, "total_events": 2, "past_events": [], "unique_pages": 1}
        
    try:
        # ≡ƒÜ¿ Integration Fix: Searching by 'session_id' instead of 'user_id'
        response = supabase.table("events").select("*").eq("session_id", session_id).execute()
        
        past_events = response.data if response.data else []
        unique_pages = len(set(e.get("page_url") for e in past_events if e.get("page_url")))
        unique_pages = max(1, unique_pages)
        
        return {
            "session_id": session_id,
            "total_events": len(past_events),
            "past_events": past_events,
            "unique_pages": unique_pages
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
        print(f"≡ƒÆ╛ [MOCK DB] Updated intelligence for {session_id}: {intelligence}")
        return True

    try:
        response = supabase.table("events") \
            .update(intelligence) \
            .eq("session_id", session_id) \
            .execute()

        if response.data:
            print(f"≡ƒºá AI Intelligence saved for {session_id}")
            return True
        return False
    except Exception as e:
        print(f"Database Error (update_event_intelligence): {e}")
        return False


async def save_user_identity(identity_data: dict) -> bool:
    """
    Saves or updates a user's contact info from the identity popup (foreign sites).
    Enables the full priority cascade (Email + WhatsApp) for bookmarklet sessions.
    """
    if not supabase:
        print(f"≡ƒÆ╛ [MOCK DB] Saved Identity for {identity_data.get('consumer_id')}")
        return True

    try:
        payload = {
            "fidelity_ghost_id": identity_data.get("consumer_id"),
            "email":             identity_data.get("user_email"),
            "phone":             identity_data.get("user_phone"),
            "name":              identity_data.get("user_name", ""),
        }
        response = supabase.table("users").upsert(payload).execute()

        if response.data:
            print(f"≡ƒæñ Identity Synced for Ghost ID: {payload['fidelity_ghost_id']}")
            return True
        return False
    except Exception as e:
        print(f"Database Error (save_user_identity): {e}")
        return False

session_to_db = {}

async def sync_db_session(session_id: str, telemetry_data: dict, intent_score: int) -> int:
    """
    Looks up or creates a user by fidelity_ghost_id / email in the users table,
    then looks up or inserts the session in the sessions table.
    Returns the integer session database ID (sessions.id).
    """
    if not supabase:
        return 0

    try:
        user_id = None
        # 1. Search for user by fidelity_ghost_id
        res_u = supabase.table("users").select("id").eq("fidelity_ghost_id", session_id).execute()
        if res_u.data:
            user_id = res_u.data[0]["id"]
        else:
            # 2. Search by email (fallback)
            email = telemetry_data.get("user_email") or f"ghost_{session_id}@demo.com"
            res_u2 = supabase.table("users").select("id").eq("email", email).execute()
            if res_u2.data:
                user_id = res_u2.data[0]["id"]
            else:
                # 3. Create user
                user_payload = {
                    "fidelity_ghost_id": session_id,
                    "name": telemetry_data.get("user_name") or f"Visitor {session_id[:8]}",
                    "email": email,
                    "password_hash": "d3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791",
                    "role": "USER",
                    "current_intent_score": intent_score,
                    "lifetime_intent_score": intent_score
                }
                res_u3 = supabase.table("users").insert(user_payload).execute()
                if res_u3.data:
                    user_id = res_u3.data[0]["id"]
                    print(f"≡ƒæñ Created new user in database for session {session_id}: ID {user_id}")

        if not user_id:
            return 0

        # Update user's current intent score in database
        try:
            supabase.table("users").update({"current_intent_score": intent_score}).eq("id", user_id).execute()
        except Exception as e:
            print(f"Failed to update current_intent_score: {e}")

        # 4. Handle session
        session_db_id = session_to_db.get(session_id)
        if session_db_id:
            # Update intent score on active session
            try:
                supabase.table("sessions").update({"final_intent_score": intent_score}).eq("id", session_db_id).execute()
            except Exception as e:
                print(f"Failed to update final_intent_score on session {session_db_id}: {e}")
            return session_db_id
        
        # Look if there's an active session in the database for this user
        res_s = supabase.table("sessions").select("id").eq("user_id", user_id).is_("ended_at", "null").order("id", desc=True).limit(1).execute()
        if res_s.data:
            session_db_id = res_s.data[0]["id"]
            session_to_db[session_id] = session_db_id
            try:
                supabase.table("sessions").update({"final_intent_score": intent_score}).eq("id", session_db_id).execute()
            except Exception as e:
                pass
            return session_db_id

        # Insert new session
        session_payload = {
            "user_id": user_id,
            "device_type": telemetry_data.get("device_type") or "desktop",
            "browser": telemetry_data.get("browser") or "Chrome",
            "ip_address": telemetry_data.get("ip_address") or "127.0.0.1",
            "is_bounce": False,
            "final_intent_score": intent_score
        }
        res_s2 = supabase.table("sessions").insert(session_payload).execute()
        if res_s2.data:
            session_db_id = res_s2.data[0]["id"]
            session_to_db[session_id] = session_db_id
            print(f"≡ƒÆ╛ Created session record in database: ID {session_db_id}")
            return session_db_id
            
        return 0
    except Exception as e:
        print(f"Database Error in sync_db_session: {e}")
        return 0

async def save_decision_telemetry(
    session_id: str,
    telemetry_data: dict,
    session_analysis: dict,
    intervention: dict,
    nudge_package: dict = None
):
    """
    Main background task to synchronize user state, sessions, explainability logs,
    nudges, rule performance, and revenue metrics in real-time.
    """
    if not supabase:
        return
        
    try:
        # 1. Sync User and Session, get IDs
        churn_prob = float(session_analysis.get("churn_probability", 0.0))
        intent_score = int(churn_prob * 100)
        session_db_id = await sync_db_session(session_id, telemetry_data, intent_score)
        if not session_db_id:
            return
            
        # Get the User ID
        user_id = None
        res_u = supabase.table("users").select("id").eq("fidelity_ghost_id", session_id).execute()
        if res_u.data:
            user_id = res_u.data[0]["id"]
        else:
            email = telemetry_data.get("user_email") or f"ghost_{session_id}@demo.com"
            res_u2 = supabase.table("users").select("id").eq("email", email).execute()
            if res_u2.data:
                user_id = res_u2.data[0]["id"]
        
        if not user_id:
            return

        behavior_type = session_analysis.get("behavior_type", "UNKNOWN")
        rule_name = f"{behavior_type}_RULE"
        rule_id = rules_cache.get(rule_name, 8) # default to UNKNOWN_RULE (ID 8)
        
        # 2. Log to explainability_logs
        try:
            exp_payload = {
                "user_id": user_id,
                "rule_id": rule_id,
                "primary_event": telemetry_data.get("event_type") or "churn_signal",
                "supporting_data": {
                    "friction_signals": telemetry_data.get("behavioral_telemetry", {}).get("friction_signals", {}),
                    "total_time_seconds": telemetry_data.get("behavioral_telemetry", {}).get("total_time_seconds", 0),
                    "ai_reasoning": session_analysis.get("ai_reasoning", "Model analysis completed.")
                },
                "intent_score": intent_score,
                "ai_tone": "Empathetic" if nudge_package else "None",
                "confidence_score": 0.95
            }
            supabase.table("explainability_logs").insert(exp_payload).execute()
            print(f"≡ƒºá Logged behavior analysis to explainability_logs for User {user_id}")
        except Exception as e:
            print(f"Failed to log explainability_logs: {e}")

        # 3. Log to nudges (if nudge triggered)
        if nudge_package and (intervention.get("show_popup") or intervention.get("send_email") or intervention.get("send_whatsapp")):
            try:
                delivery_channel = "TOAST"
                if intervention.get("send_email"):
                    delivery_channel = "EMAIL"
                
                nudge_payload = {
                    "user_id": user_id,
                    "session_id": session_db_id,
                    "rule_id": rule_id,
                    "nudge_type": "AI",
                    "delivery_channel": delivery_channel,
                    "message": nudge_package.get("message", "Nudge"),
                    "status": "SENT",
                    "clicked": False,
                    "converted": False
                }
                supabase.table("nudges").insert(nudge_payload).execute()
                print(f"Γ£ë∩╕Å Saved nudge in nudges table for User {user_id}")
            except Exception as e:
                print(f"Failed to save nudge: {e}")

        # 4. Log to revenue_metrics
        try:
            potential_value = 50000.0
            revenue_at_risk = potential_value * churn_prob
            
            res_r = supabase.table("revenue_metrics").select("id").eq("user_id", user_id).execute()
            if res_r.data:
                supabase.table("revenue_metrics").update({
                    "potential_value": potential_value,
                    "revenue_at_risk": revenue_at_risk,
                }).eq("id", res_r.data[0]["id"]).execute()
            else:
                supabase.table("revenue_metrics").insert({
                    "user_id": user_id,
                    "potential_value": potential_value,
                    "revenue_at_risk": revenue_at_risk,
                    "revenue_recovered": 0.0,
                    "conversion_source": "popup"
                }).execute()
            print(f"≡ƒÆ░ Updated revenue metrics for User {user_id}")
        except Exception as e:
            print(f"Failed to update revenue_metrics: {e}")

        # 5. Log/Update rule_performance
        try:
            res_rp = supabase.table("rule_performance").select("id, times_triggered, successful_conversions, failed_conversions").eq("rule_id", rule_id).execute()
            if res_rp.data:
                rp_id = res_rp.data[0]["id"]
                times_triggered = res_rp.data[0]["times_triggered"] + 1
                sc = res_rp.data[0]["successful_conversions"]
                fc = res_rp.data[0]["failed_conversions"]
                total = sc + fc
                success_rate = (sc / total) if total > 0 else 0.0
                supabase.table("rule_performance").update({
                    "times_triggered": times_triggered,
                    "success_rate": success_rate
                }).eq("id", rp_id).execute()
            else:
                supabase.table("rule_performance").insert({
                    "rule_id": rule_id,
                    "times_triggered": 1,
                    "successful_conversions": 0,
                    "failed_conversions": 0,
                    "success_rate": 0.0
                }).execute()
            print(f"≡ƒôê Updated rule performance statistics for Rule {rule_id}")
        except Exception as e:
            print(f"Failed to update rule_performance: {e}")

    except Exception as e:
        print(f"Error in save_decision_telemetry background task: {e}")

async def save_manual_intervention(session_id: str, offer_type: str, custom_message: str):
    """
    Saves a manual admin nudge from God Mode to manual_interventions and nudges table.
    """
    if not supabase:
        return
    try:
        user_id = None
        res_u = supabase.table("users").select("id").eq("fidelity_ghost_id", session_id).execute()
        if res_u.data:
            user_id = res_u.data[0]["id"]
        else:
            email = f"ghost_{session_id}@demo.com"
            res_u2 = supabase.table("users").select("id").eq("email", email).execute()
            if res_u2.data:
                user_id = res_u2.data[0]["id"]

        if not user_id:
            # Create user
            user_payload = {
                "fidelity_ghost_id": session_id,
                "name": f"Visitor {session_id[:8]}",
                "email": f"ghost_{session_id}@demo.com",
                "password_hash": "d3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791",
                "role": "USER"
            }
            res_u3 = supabase.table("users").insert(user_payload).execute()
            if res_u3.data:
                user_id = res_u3.data[0]["id"]

        if user_id:
            man_payload = {
                "admin_id": 1,
                "user_id": user_id,
                "offer_type": offer_type,
                "custom_message": custom_message,
                "accepted": False
            }
            supabase.table("manual_interventions").insert(man_payload).execute()
            print(f"≡ƒ¢á∩╕Å Logged manual intervention for User {user_id}")
            
            # Log manual nudge to nudges table
            nudge_payload = {
                "user_id": user_id,
                "session_id": session_to_db.get(session_id, None),
                "nudge_type": "MANUAL",
                "delivery_channel": "TOAST",
                "message": custom_message,
                "status": "SENT",
                "clicked": False,
                "converted": False
            }
            supabase.table("nudges").insert(nudge_payload).execute()
            print(f"Γ£ë∩╕Å Saved manual nudge record in database for User {user_id}")
    except Exception as e:
        print(f"Failed to save manual intervention: {e}")


