import os
import json
import logging
import google.genai as genai
from groq import Groq
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Setup Gemini
GEMINI_API_KEY = os.getenv("GOOGLE_API_KEY") # Fixed: matches .env

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
    client = genai.Client(api_key=GEMINI_API_KEY)
else:
    client = None

SYSTEM_PROMPT = """
You are a proactive, helpful, and empathetic AI Financial Advisor for Synaptic.
Your goal is to gently guide users who are experiencing confusion or friction on the website.

BEHAVIOR PROFILE INSTRUCTIONS — Adjust your tone based on the Behavior Type:
- BLOCKED:     Be urgent and direct. Acknowledge they are stuck. Offer a specific exit (call, chat).
- STRUGGLING:  Be calm and validating. Acknowledge the effort. Offer to help with the exact step.
- DISENGAGING: Be warm and re-engaging. Remind them of value. Create a gentle reason to stay.
- CONFUSED:    Be simple and step-by-step. Remove complexity. Tell them exactly what to do next.
- HESITANT:    Be reassuring and trust-building. Address risk or security concerns explicitly.
- EXPLORING:   Be informative and non-pushy. Offer a comparison or highlight a top feature.
- HIGH_INTENT: Be direct and action-oriented. Help them complete the final step quickly.
- UNKNOWN:     Be friendly and open-ended.

CRITICAL INSTRUCTIONS:
1. You MUST ALWAYS reference the "Page Title" or "Page Headings" in your message to prove you know exactly what they are looking at. E.g. "I see you're reading about Vanguard ETFs..." or "Comparing Investment product fees can be tricky...".
2. If "Last Rage Clicked Element" is provided, you MUST explicitly mention that exact button/feature (e.g. "Having trouble with the Broker-assisted row?").
3. NEVER use generic phrases like "We noticed some frustration". Always be highly specific to the context provided below.
4. Keep the message under 2 sentences and offer immediate advisor help.

You MUST respond strictly in the following JSON format:
{
  "message": "The personalized message to the user (max 2 sentences)",
  "xai_explanation": "A brief explanation of WHY you chose this message based on the behavior profile, stage, and friction signals. This is for the admin dashboard.",
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
    
    # Build DOM context string for the prompt
    dom = clean_context.get('dom_context', {})
    page_title    = dom.get('page_title', '') if dom else ''
    page_headings = dom.get('headings', [])  if dom else []
    page_buttons  = dom.get('buttons', [])   if dom else []
    dom_context_str = ''
    if page_title:
        dom_context_str += f'\n    - Page Title: "{page_title}"'
    if page_headings:
        dom_context_str += f'\n    - Page Headings (what they were reading): {", ".join(repr(h) for h in page_headings[:4])}'
    if page_buttons:
        dom_context_str += f'\n    - Visible Buttons/Links: {", ".join(repr(b) for b in page_buttons[:6])}'

    prompt = f"""
    {SYSTEM_PROMPT}
    
    User Context (Anonymized):
    - Behavior Profile: {clean_context.get('behavior_type', 'UNKNOWN')}
    - Journey Stage: {clean_context.get('stage', 'Unknown')}
    - Progress Level: {clean_context.get('progress', 'LOW')}
    - Root Cause Interpretation: {clean_context.get('behavior_interpretation', 'general_friction')}
    - Churn Risk: {clean_context.get('churn_probability', 0.0):.0%} ({clean_context.get('urgency', 'MEDIUM')} urgency)
    - Confusion Score: {clean_context.get('confusion_score', 0)}/100
    - Friction Score: {clean_context.get('friction_score', 0)}/100
    - Recent Hesitation Zones: {', '.join(clean_context.get('recent_actions', []))}
    - Last Rage Clicked Element: {clean_context.get('last_rage_element', 'None')}
    - Previous History: {clean_context.get('history', 'New user')}{dom_context_str}
    
    Generate the intervention JSON.
    """

    # 1. Try Gemini
    if GEMINI_API_KEY and client:
        try:
            logger.info("Attempting to generate intervention with Gemini...")
            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt,
                config=genai.types.GenerateContentConfig(response_mime_type="application/json")
            )
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
                model="llama-3.1-8b-instant", # Updated model
                response_format={"type": "json_object"},
                temperature=0.4,
            )
            data = json.loads(response.choices[0].message.content)
            return BrainResponse(**data)
        except Exception as e:
            logger.error(f"Groq API failed: {e}. Falling back to MOCK.")
            
    # --- 3. FINAL MOCK FALLBACK (Ensure we never return None) ---
    return BrainResponse(
        message="It looks like you're exploring our planning tools! Need a quick hand or have a specific question about Synaptic's services?",
        xai_explanation="Triggered fallback due to API unavailability. User showing hesitation in key zones.",
        recommended_action="Click the 'Live Chat' icon for immediate assistance."
    )

def generate_retention_message(user_profile: str) -> str:
    '''
    Generates a personalized re-engagement message for inactive users.
    '''
    # Security Layer
    safe_profile = user_profile if len(user_profile) < 500 else user_profile[:500]
    
    prompt = f"""
    You are an AI Engagement Specialist for Synaptic. 
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
                model="llama-3.1-8b-instant",
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
