import logging
import json
import os
from google import genai
from google.genai import types
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger("fidelity.semantic_mapper")

# Initialize Gemini 2.0
GEMINI_API_KEY = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
client = None

if GEMINI_API_KEY:
    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
        logger.info("[SEMANTIC MAPPER] Gemini 2.0 Client initialized.")
    except Exception as e:
        logger.error(f"[SEMANTIC MAPPER] Failed to initialize Gemini Client: {e}")
else:
    logger.warning("[SEMANTIC MAPPER] No API Key found. Running in MOCK mode.")

SYSTEM_PROMPT = """
You are a Website Structural Analyst specializing in Financial User Experience.
Your job is to take a "DOM Summary" of a website and classify the page into one of 5 Universal Financial Stages.

UNIVERSAL STAGES:
1. "Exploration": Landing pages, product lists, blogs, or general info. User is just looking.
2. "Planning": Calculators (SIP, Loan, Tax), comparison tables, or configuration tools. User is getting serious.
3. "KYC": Identity verification pages, PAN/SSN upload, address proof, or personal detail forms. High friction.
4. "Application": Finalizing choices, selecting tenures, or review screens before payment.
5. "Transaction": Checkout, payment gateways, OTP screens, or "Order Success" pages.

Based on the elements, text labels, and URL provided in the summary, respond ONLY with a JSON object:
{
  "stage": "The Stage Name",
  "confidence": 0.0 to 1.0,
  "reasoning": "1-sentence explanation of why you chose this stage"
}
"""

async def classify_page_structure(dom_summary: dict) -> dict:
    """
    Analyzes the structural snapshot of a page and returns its Universal Stage.
    """
    if not client:
        return {
            "stage": "Exploration",
            "confidence": 0.5,
            "reasoning": "Mock mode: Defaulting to Exploration stage."
        }

    try:
        prompt = f"{SYSTEM_PROMPT}\n\nAnalyze this website snapshot and classify its stage:\n\n{json.dumps(dom_summary, indent=2)}"
        
        # Using Gemini 2.0 Flash (Fastest and newest)
        try:
            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.2,
                    response_mime_type="application/json",
                )
            )
            result = json.loads(response.text)
            logger.info(f"[SEMANTIC MAPPER] Page classified as {result.get('stage')} (conf: {result.get('confidence')})")
            return result
        except Exception as api_err:
            if "429" in str(api_err):
                logger.warning("[SEMANTIC MAPPER] Rate limit hit. Using Exploration fallback.")
                return {"stage": "Exploration", "confidence": 0.5, "reasoning": "Rate limit hit, defaulting to exploration."}
            raise api_err

    except Exception as e:
        logger.error(f"[SEMANTIC MAPPER] Gemini Classification Error: {e}")
        return {
            "stage": "Exploration",
            "confidence": 0.1,
            "reasoning": f"AI unavailable: {str(e)}"
        }
