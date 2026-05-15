"""
FIDELITY BEHAVIORAL ENGINE — LLM Decision Engine
Processes raw telemetry through OpenAI GPT-4o to extract psychological intent
and generate personalized re-engagement emails.
"""

import json
import logging
import random
from typing import Optional, List

from openai import AsyncOpenAI
import google.generativeai as genai
from groq import AsyncGroq

from config import get_settings

logger = logging.getLogger("fidelity.engine")
settings = get_settings()

# ─── Initialize Clients ───
openai_client: Optional[AsyncOpenAI] = None
groq_client: Optional[AsyncGroq] = None

# Round-robin state
_current_provider_idx = 0
PROVIDERS = ["openai", "gemini", "groq"]


def get_openai_client() -> AsyncOpenAI:
    global openai_client
    if openai_client is None:
        if not settings.OPENAI_API_KEY: return None
        openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    return openai_client


def get_groq_client() -> AsyncGroq:
    global groq_client
    if groq_client is None:
        if not settings.GROQ_API_KEY: return None
        groq_client = AsyncGroq(api_key=settings.GROQ_API_KEY)
    return groq_client


def init_gemini():
    if settings.GEMINI_API_KEY:
        genai.configure(api_key=settings.GEMINI_API_KEY)


# ─── System Prompt ───
SYSTEM_PROMPT = """You are a behavioral financial analyst working for a premium wealth management firm.

Your job is to analyze raw user telemetry from our investment platform and deduce what psychological barrier caused the user to abandon their session.

You will receive structured telemetry data including:
- Which page elements the user hovered on and for how long
- How far they scrolled
- Whether they exhibited erratic mouse movements (a sign of frustration)
- Whether they highlighted specific text (a sign of concern about that content)
- How they exited (tab close, navigation away, etc.)

Based on this data, you must:
1. Identify the PRIMARY psychological friction (choose one):
   - "Liquidity Anxiety" (worried about lock-in periods, exit loads, redemption terms)
   - "Fee Sensitivity" (concerned about expense ratios, hidden costs)
   - "Identity Friction" (uncomfortable sharing PAN/SSN/government ID)
   - "Lock-in Aversion" (resistant to commitment periods like ELSS 3-year lock)
   - "Risk Paralysis" (overwhelmed by risk disclaimers and loss language)
   - "General Skepticism" (low engagement, didn't explore deeply)
   - "Information Overload" (spent long time but showed signs of confusion)

2. Assign a confidence score (0.0 to 1.0) for your classification.

3. Write a brief psychological profile (2-3 sentences) explaining your reasoning.

4. Draft a personalized re-engagement email:
   - Subject line: specific to the friction, NOT generic marketing
   - Body: 2-3 sentences, empathetic tone, addresses the exact fear, includes a specific call-to-action

Respond in valid JSON with this exact structure:
{
  "intent": "the friction category",
  "confidence": 0.85,
  "profile": "explanation of behavioral analysis",
  "email_subject": "the email subject line",
  "email_body": "the email body text"
}"""


async def analyze_session(telemetry_data: dict) -> dict:
    """
    Analyzes session using a resilient multi-provider strategy:
    1. Load balancing (Round-robin)
    2. Fallback (Retries other providers on failure)
    """
    global _current_provider_idx
    
    # Sequence of providers to try, starting from the next in round-robin
    providers_to_try = []
    for i in range(len(PROVIDERS)):
        idx = (_current_provider_idx + i) % len(PROVIDERS)
        providers_to_try.append(PROVIDERS[idx])
    
    # Increment round-robin index for the next call
    _current_provider_idx = (_current_provider_idx + 1) % len(PROVIDERS)
    
    user_message = f"""Analyze this user's behavioral telemetry and determine why they abandoned:

```json
{json.dumps(telemetry_data, indent=2)}
```

Respond ONLY with valid JSON matching the required structure."""

    for provider in providers_to_try:
        try:
            logger.info(f"[ENGINE] Attempting analysis with provider: {provider.upper()}")
            
            if provider == "openai":
                result = await _call_openai(user_message)
            elif provider == "gemini":
                result = await _call_gemini(user_message)
            elif provider == "groq":
                result = await _call_groq(user_message)
            else:
                continue
                
            if result:
                logger.info(f"[ENGINE] ✓ Success with {provider.upper()} — Intent: {result['intent']}")
                return result
                
        except Exception as e:
            logger.warning(f"[ENGINE] ✗ Provider {provider.upper()} failed: {e}")
            continue

    logger.error("[ENGINE] All LLM providers failed. Dropping to heuristic fallback.")
    return _fallback_analysis(telemetry_data)


async def _call_openai(prompt: str) -> Optional[dict]:
    client = get_openai_client()
    if not client: return None
    
    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        temperature=0.4,
        max_tokens=512,
        response_format={"type": "json_object"},
    )
    return json.loads(response.choices[0].message.content)


async def _call_gemini(prompt: str) -> Optional[dict]:
    if not settings.GEMINI_API_KEY: return None
    init_gemini()
    
    model = genai.GenerativeModel('gemini-1.5-flash')
    # Combine system prompt and user prompt for Gemini
    full_prompt = f"{SYSTEM_PROMPT}\n\nUSER DATA:\n{prompt}"
    
    response = model.generate_content(
        full_prompt,
        generation_config=genai.types.GenerationConfig(
            temperature=0.4,
            max_output_tokens=512,
            response_mime_type="application/json",
        )
    )
    return json.loads(response.text)


async def _call_groq(prompt: str) -> Optional[dict]:
    client = get_groq_client()
    if not client: return None
    
    response = await client.chat.completions.create(
        model="llama3-70b-8192",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        temperature=0.4,
        max_tokens=512,
        response_format={"type": "json_object"},
    )
    return json.loads(response.choices[0].message.content)


def _fallback_analysis(telemetry_data: dict) -> dict:
    """
    Deterministic fallback when the LLM is unavailable.
    Uses simple heuristics on the raw telemetry to classify intent.
    """
    logger.warning("[ENGINE] Using fallback heuristic analysis.")

    hesitation_zones = telemetry_data.get("hesitation_zones", [])
    exit_velocity = telemetry_data.get("exit_velocity", "normal")
    erratic = telemetry_data.get("erratic_mouse_movements", 0)
    highlighted = telemetry_data.get("highlighted_text", "")

    # Simple keyword matching on hovered elements
    hovered_elements = " ".join([z.get("element_id", "") for z in hesitation_zones])

    if "exit_load" in hovered_elements or "liquidity" in hovered_elements:
        intent = "Liquidity Anxiety"
        confidence = 0.72
    elif "expense_ratio" in hovered_elements or "fee" in hovered_elements.lower():
        intent = "Fee Sensitivity"
        confidence = 0.68
    elif "pan_ssn" in hovered_elements or "government_id" in hovered_elements:
        intent = "Identity Friction"
        confidence = 0.75
    elif "lock_in" in hovered_elements:
        intent = "Lock-in Aversion"
        confidence = 0.70
    elif erratic > 3:
        intent = "Information Overload"
        confidence = 0.55
    else:
        intent = "General Skepticism"
        confidence = 0.45

    return {
        "intent": intent,
        "confidence": confidence,
        "profile": f"Fallback analysis: user showed friction signals on elements matching '{intent}' pattern. Exit velocity was {exit_velocity}.",
        "email_subject": f"We noticed you had questions about your investment options",
        "email_body": f"We understand that making investment decisions requires confidence. Our team has prepared materials specifically addressing {intent.lower()} concerns. Would you like a brief, no-obligation walkthrough?",
    }
