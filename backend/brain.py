import os
import json
import logging
import google.generativeai as genai
from groq import Groq
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Setup Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
else:
    logger.warning("GEMINI_API_KEY is not set.")

# Setup Groq
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
groq_client = None
if GROQ_API_KEY:
    groq_client = Groq(api_key=GROQ_API_KEY)
else:
    logger.warning("GROQ_API_KEY is not set.")

# The Generation Config to force JSON output
generation_config = {
    "temperature": 0.4,
    "top_p": 0.95,
    "top_k": 64,
    "max_output_tokens": 1024,
    "response_mime_type": "application/json",
}

# The model to use
model = None
if GEMINI_API_KEY:
    model = genai.GenerativeModel(
        model_name="gemini-1.5-flash",
        generation_config=generation_config,
    )

SYSTEM_PROMPT = """
You are a proactive, helpful, and empathetic AI Financial Advisor for Fidelity.
Your goal is to gently guide users who are experiencing confusion or friction on the website.
When provided with a user's context, confusion score, friction score, and recent actions, 
you must generate a brief, personalized message to assist them.

You MUST respond strictly in the following JSON format:
{
  "message": "The personalized message to the user (max 2 sentences)",
  "xai_explanation": "A brief explanation of WHY you chose this message based on the user's friction/confusion scores and recent actions. This is for the admin dashboard.",
  "recommended_action": "A short suggestion on what the user should click or do next"
}
"""

class BrainResponse(BaseModel):
    message: str
    xai_explanation: str
    recommended_action: str

def sanitize_context(user_context: dict) -> dict:
    '''
    Scrubs the user_context of any PII (Personally Identifiable Information) 
    or sensitive financial data before sending it to an external LLM.
    '''
    # Create a copy so we don't modify the original data used elsewhere
    safe_context = user_context.copy()
    
    # 1. Remove obvious PII if present
    pii_keys = ["name", "email", "phone", "account_number", "ssn", "address"]
    for key in pii_keys:
        if key in safe_context:
            safe_context[key] = "[REDACTED]"
            
    # 2. Generalize financial figures (e.g., 10,450 -> "10k+")
    # If the engine ever receives exact balances, we should mask them here.
    
    # 3. Ensure we only send BEHAVIORAL signals, not IDENTITY
    # We keep scores and actions as they are non-identifiable.
    
    return safe_context

def generate_intervention(user_context: dict) -> BrainResponse:
    '''
    Generates an AI intervention message and an XAI explanation.
    Tries Gemini first. If it fails or API key is missing, falls back to Groq.
    '''
    
    # SECURITY LAYER: Sanitize data before it leaves our server
    clean_context = sanitize_context(user_context)
    
    prompt = f"""
    {SYSTEM_PROMPT}
    
    User Context (Anonymized):
    - Confusion Score: {clean_context.get('confusion_score', 0)}/100
    - Friction Score: {clean_context.get('friction_score', 0)}/100
    - Recent Actions: {', '.join(clean_context.get('recent_actions', []))}
    - Previous History: {clean_context.get('history', 'New user')}
    
    Generate the intervention JSON.
    """

    # 1. Try Gemini
    if GEMINI_API_KEY and model:
        try:
            logger.info("Attempting to generate intervention with Gemini...")
            response = model.generate_content(prompt)
            data = json.loads(response.text)
            return BrainResponse(**data)
        except Exception as e:
            logger.error(f"Gemini API failed: {e}. Falling back to Groq.")
            
    # 2. Try Groq
    if GROQ_API_KEY and groq_client:
        try:
            logger.info("Attempting to generate intervention with Groq...")
            response = groq_client.chat.completions.create(
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt}
                ],
                model="llama3-8b-8192",
                response_format={"type": "json_object"},
                temperature=0.4,
            )
            data = json.loads(response.choices[0].message.content)
            return BrainResponse(**data)
        except Exception as e:
            logger.error(f"Groq API failed: {e}. Falling back to MOCK.")

def generate_retention_message(user_profile: str) -> str:
    '''
    Generates a personalized re-engagement message for inactive users.
    '''
    # Security Layer
    safe_profile = user_profile if len(user_profile) < 500 else user_profile[:500]
    
    prompt = f"""
    You are an AI Engagement Specialist for Fidelity. 
    A user hasn't logged in for over 30 days. Their last known interest was: "{safe_profile}".
    
    Write a warm, professional, and personalized 2-sentence re-engagement email body.
    Focus on bringing them back to explore new insights related to their interest.
    Do NOT include subject lines or greetings, just the body text.
    """
    
    # Try Gemini
    if GEMINI_API_KEY and model:
        try:
            response = model.generate_content(prompt)
            return response.text.strip()
        except Exception:
            pass
            
    # Try Groq Fallback
    if GROQ_API_KEY and groq_client:
        try:
            response = groq_client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model="llama3-8b-8192",
                temperature=0.7,
            )
            return response.choices[0].message.content.strip()
        except Exception:
            pass

    # Final Mock Fallback
    return f"We've missed you! We noticed you were previously interested in {safe_profile}. We have updated our guides and would love for you to check them out."

# ---------------------------------------------------------
# Manual Verification Mock Test
# ---------------------------------------------------------
if __name__ == "__main__":
    print("--- Testing AI Brain ---")
    mock_context = {
        "confusion_score": 85,
        "friction_score": 40,
        "recent_actions": ["Hovered on 'Retirement Plan'", "Scrolled up and down 3 times", "Clicked 'Help' but closed it"],
        "history": "Usually invests in index funds."
    }
    
    result = generate_intervention(mock_context)
    print("\n[AI Output]")
    print(f"Message: {result.message}")
    print(f"XAI Explanation: {result.xai_explanation}")
    print(f"Recommended Action: {result.recommended_action}")
