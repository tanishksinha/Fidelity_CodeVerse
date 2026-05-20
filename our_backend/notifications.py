import os
import logging
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from twilio.rest import Client
from dotenv import load_dotenv
import asyncio
from brain import generate_retention_message

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Credentials
SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_WHATSAPP_NUMBER = os.getenv("TWILIO_WHATSAPP_NUMBER", "whatsapp:+14155238886") # Twilio Sandbox Default

def send_email(to_email: str, subject: str, content: str) -> bool:
    '''Sends an email using SendGrid.'''
    if not SENDGRID_API_KEY:
        logger.warning(f"[MOCK SENDGRID] Email to {to_email} | Subject: {subject} | Content: {content}")
        return True
        
    try:
        message = Mail(
            from_email='tsmanaswini07@gmail.com', # Verified sender
            to_emails=to_email,
            subject=subject,
            html_content=f'<strong>{content}</strong>'
        )
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        response = sg.send(message)
        logger.info(f"Email sent with status code {response.status_code}")
        return response.status_code in [200, 201, 202]
    except Exception as e:
        logger.error(f"Error sending email: {e}")
        return False

def send_whatsapp(to_number: str, content: str) -> bool:
    '''Sends a WhatsApp message using Twilio.'''
    if not (TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN):
        logger.warning(f"[MOCK TWILIO] WhatsApp to {to_number} | Content: {content}")
        return True
        
    try:
        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        # Twilio requires whatsapp: prefix
        formatted_number = to_number if to_number.startswith("whatsapp:") else f"whatsapp:{to_number}"
        
        message = client.messages.create(
            from_=TWILIO_WHATSAPP_NUMBER,
            body=content,
            to=formatted_number
        )
        logger.info(f"WhatsApp message sent: {message.sid}")
        return True
    except Exception as e:
        logger.error(f"Error sending WhatsApp: {e}")
        return False

# Active/Recent cascades to prevent duplicate notifications (1 minute cooldown per user)
last_cascade_time = {}

async def trigger_priority_cascade(user_id: str, ai_message: str, contact_info: dict = None):
    '''
    Tiered Priority Cascade:
    - Anonymous users (no phone/email in DB): popup only
    - Logged-in users: popup → wait → Email → wait → WhatsApp
    '''
    import time
    now = time.time()
    if now - last_cascade_time.get(user_id, 0) < 60:
        logger.info(f"[CASCADE COOLDOWN] Suppressing duplicate cascade for user {user_id}")
        return
    last_cascade_time[user_id] = now

    logger.info(f"Starting Priority Cascade for user {user_id}")
    
    # DYNAMIC FETCH: If no phone in contact info, fetch from DB
    if not contact_info or not contact_info.get("phone"):
        logger.info(f"Fetching contact details for user {user_id} from database...")
        db_contact = await get_user_contact_from_db(user_id)
        if contact_info is not None:
            contact_info.update(db_contact)
        else:
            contact_info = db_contact
    
    # --- TIER CHECK ---
    # If no phone found, user is anonymous → popup already fired, stop here
    if not contact_info or not contact_info.get("phone"):
        logger.info(f"[ANONYMOUS USER] {user_id} — Popup shown. No phone on record. Cascade halted.")
        return
    
    logger.info(f"[IDENTIFIED USER] {user_id} — Full cascade starting (email + WhatsApp).")

    # Step 1: Toast is triggered externally when the API returns the ai_message.
    logger.info(f"Step 1: Toast sent to frontend (handled by Socket.io): '{ai_message}'")
    
    import time
    cascade_start_time = time.time()

    # Step 2: Wait for user to come back.
    logger.info("Waiting 5 seconds to check if user interacted with the Toast...")
    await asyncio.sleep(5)

    # Check real DB — did user log any event after the nudge was sent?
    user_came_back = check_db_if_user_returned(user_id, cascade_start_time)

    if user_came_back:
        logger.info(f"User {user_id} interacted with the Toast. Cascade halted.")
        return

    # Step 3: Send Email
    if contact_info.get("send_email", True):
        logger.info(f"User {user_id} ignored Toast. Step 3: Sending Email to {contact_info['email']}")
        email_subject = "Checking in: Can we help you with your Synaptic experience?"
        email_content = f"Hi there, we noticed you might need some assistance. {ai_message} Log back in to chat with an advisor."
        send_email(contact_info.get("email"), email_subject, email_content)
    else:
        logger.info("Email skipped as per Decision Engine strategy.")

    # Step 4: Wait again for critical follow-up
    email_delay = contact_info.get("email_delay_seconds", 3)
    logger.info(f"Waiting {email_delay} seconds before checking follow-up...")
    await asyncio.sleep(email_delay)

    user_came_back = check_db_if_user_returned(user_id, cascade_start_time)  # Check again
    if user_came_back:
        logger.info(f"User {user_id} returned after Email. Cascade halted.")
        return
        
    # Step 5: Send WhatsApp (Highest Urgency)
    if contact_info.get("send_whatsapp", False):
        logger.info(f"User {user_id} still unresponsive. Step 5: Sending WhatsApp to {contact_info['phone']}")
        wa_content = f"Synaptic Alert: We're here to help you finalize your recent activity. {ai_message}"
        send_whatsapp(contact_info.get("phone"), wa_content)
    else:
        logger.info("WhatsApp skipped as per Decision Engine strategy.")

async def get_user_contact_from_db(user_id: str) -> dict:
    '''
    Queries the Supabase `users` table to find the email and phone
    for the given consumer_id (which is derived from email at login).
    Falls back to mock data if user is not found (for demo anonymous users).
    '''
    from database import supabase as sb
    
    if sb:
        try:
            # consumer_id format is USR_<EMAIL_PREFIX>, so we search by it
            # First try: look for exact match on a stored consumer_id style
            # We store phone+email at login time by matching email prefix
            result = sb.table("users").select("email, phone, name").eq("email", user_id).execute()
            
            if not result.data:
                # Try matching by email prefix pattern (USR_ARJUN → arjun)
                email_prefix = user_id.replace("USR_", "").lower()
                result = sb.table("users").select("email, phone, name").ilike("email", f"{email_prefix}%").execute()
            
            if result.data:
                user = result.data[0]
                logger.info(f"[DB] Found contact for {user_id}: email={user.get('email')}, has_phone={'Yes' if user.get('phone') else 'No'}")
                return {"email": user.get("email"), "phone": user.get("phone"), "name": user.get("name")}
        except Exception as e:
            logger.error(f"[DB] Supabase lookup failed for {user_id}: {e}")
    
    # Fallback: return empty so anonymous tiering kicks in
    logger.info(f"[DB] No record found for {user_id} — treating as anonymous.")
    return {}

def check_db_if_user_returned(user_id: str, since_timestamp: float) -> bool:
    '''
    Checks the Supabase `events` table to see if the user has generated any
    new events after `since_timestamp`. If yes, the cascade is halted because
    the user has re-engaged with the app.
    '''
    import datetime
    from database import supabase as sb

    if not sb:
        logger.warning("[CASCADE] Supabase unavailable — assuming user has NOT returned.")
        return False
    try:
        # Convert Unix timestamp to ISO 8601 UTC string for Supabase filtering
        dt_str = datetime.datetime.utcfromtimestamp(since_timestamp).isoformat() + 'Z'
        response = (
            sb.table("events")
            .select("id")
            .eq("session_id", user_id)
            .gt("created_at", dt_str)
            .limit(1)
            .execute()
        )
        returned = bool(response.data)
        logger.info(f"[CASCADE] User {user_id} returned={returned} (events since {dt_str})")
        return returned
    except Exception as e:
        logger.error(f"[CASCADE] DB check failed for {user_id}: {e}")
        return False

async def run_retention_scan():
    '''
    Simulates a daily cron job that finds inactive users and sends 
    AI-personalized re-engagement emails.
    '''
    logger.info("--- Starting Retention Scan for Inactive Users ---")
    
    # MOCK DB: Find users inactive for > 30 days
    inactive_users = [
        {"user_id": "user_789", "email": "tsmanaswini07@gmail.com", "profile": "Retirement Planning & IRAs"},
        {"user_id": "user_101", "email": "synaptic_test@example.com", "profile": "Exchange Traded Funds (ETFs)"}
    ]
    
    for user in inactive_users:
        logger.info(f"Generating personalized content for inactive user: {user['user_id']}")
        
        # Call the Brain to write a custom message based on their profile
        custom_body = generate_retention_message(user['profile'])
        
        email_subject = "Personalized Synaptic Update for You"
        email_content = f"Hi there, {custom_body} We hope to see you back soon!"
        
        success = send_email(user['email'], email_subject, email_content)
        if success:
            logger.info(f"Retention email successfully sent to {user['email']}")
        else:
            logger.error(f"Failed to send retention email to {user['email']}")

# ---------------------------------------------------------
# Manual Verification Mock Test
# ---------------------------------------------------------
if __name__ == "__main__":
    async def run_all_tests():
        # 1. Test Priority Cascade
        print("--- Testing Dynamic Priority Cascade ---")
        logged_in_user_id = "user_123" 
        msg = "It looks like you might need help comparing these mutual funds."
        await trigger_priority_cascade(logged_in_user_id, msg)
        
        print("\n" + "="*50 + "\n")
        
        # 2. Test Retention Scan
        print("--- Testing Retention Scan ---")
        await run_retention_scan()

    asyncio.run(run_all_tests())
