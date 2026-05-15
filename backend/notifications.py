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

async def trigger_priority_cascade(user_id: str, ai_message: str, contact_info: dict = None):
    '''
    Implements the Priority Cascade logic.
    If contact_info is not provided, it attempts to fetch it from the database
    using the user_id.
    '''
    logger.info(f"Starting Priority Cascade for user {user_id}")
    
    # DYNAMIC FETCH: If no contact info passed, fetch from DB
    if not contact_info:
        logger.info(f"Fetching contact details for user {user_id} from database...")
        contact_info = await get_user_contact_from_db(user_id)
    
    if not contact_info or not contact_info.get("email"):
        logger.error(f"No contact info found for user {user_id}. Cascade aborted.")
        return

    # Step 1: Toast is triggered externally when the API returns the ai_message.
    logger.info(f"Step 1: Toast sent to frontend (handled by Socket.io): '{ai_message}'")
    
    # Step 2: Wait for user to come back. 
    logger.info("Waiting 5 seconds to check if user interacted with the Toast...")
    await asyncio.sleep(5)
    
    # Check DB/State (MOCK LOGIC)
    user_came_back = check_mock_db_if_user_returned(user_id)
    
    if user_came_back:
        logger.info(f"User {user_id} interacted with the Toast. Cascade halted.")
        return

    # Step 3: Send Email
    logger.info(f"User {user_id} ignored Toast. Step 3: Sending Email to {contact_info['email']}")
    email_subject = "Checking in: Can we help you with your Fidelity experience?"
    email_content = f"Hi there, we noticed you might need some assistance. {ai_message} Log back in to chat with an advisor."
    send_email(contact_info.get("email"), email_subject, email_content)
    
    # Step 4: Wait again for critical followup
    logger.info("Waiting 3 seconds to check if user read the Email...")
    await asyncio.sleep(3)
    
    user_came_back = check_mock_db_if_user_returned(user_id) # Checking again
    if user_came_back:
        logger.info(f"User {user_id} returned after Email. Cascade halted.")
        return
        
    # Step 5: Send WhatsApp (Highest Urgency)
    logger.info(f"User {user_id} still unresponsive. Step 5: Sending WhatsApp to {contact_info['phone']}")
    wa_content = f"Fidelity Alert: We're here to help you finalize your recent activity. {ai_message}"
    send_whatsapp(contact_info.get("phone"), wa_content)

async def get_user_contact_from_db(user_id: str) -> dict:
    '''
    MOCK DATABASE HELPER:
    Once Role 3 completes the Database, this function will query 
    the 'users' table to find the email and phone for the given user_id.
    '''
    # This is where you'd do: session.execute(select(User).where(User.id == user_id))
    # For now, we return mock data based on the "logged in" user ID.
    mock_db = {
        "user_123": {"email": "tsmanaswini07@gmail.com", "phone": "+916305393086"},
        "user_456": {"email": "another_user@example.com", "phone": "+19876543210"}
    }
    return mock_db.get(user_id, {"email": None, "phone": None})

def check_mock_db_if_user_returned(user_id: str) -> bool:
    '''
    Mock function to simulate a database check.
    '''
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
        {"user_id": "user_101", "email": "fidelity_test@example.com", "profile": "Exchange Traded Funds (ETFs)"}
    ]
    
    for user in inactive_users:
        logger.info(f"Generating personalized content for inactive user: {user['user_id']}")
        
        # Call the Brain to write a custom message based on their profile
        custom_body = generate_retention_message(user['profile'])
        
        email_subject = "Personalized Fidelity Update for You"
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
