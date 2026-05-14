"""
FIDELITY BEHAVIORAL ENGINE — LLM Decision Engine
Processes raw telemetry through OpenAI GPT-4o to extract psychological intent
and generate personalized re-engagement emails.
"""

import json
import logging
from typing import Optional

from openai import AsyncOpenAI

from config import get_settings

logger = logging.getLogger("fidelity.engine")
settings = get_settings()

# ─── Initialize Async Client ───
client: Optional[AsyncOpenAI] = None


def get_openai_client() -> AsyncOpenAI:
    """Lazy-initialize the OpenAI client."""
    global client
    if client is None:
        if not settings.OPENAI_API_KEY:
            raise RuntimeError("[ENGINE] OPENAI_API_KEY is not configured.")
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        logger.info("[ENGINE] OpenAI client initialized.")
    return client


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
    Send raw telemetry to GPT-4o and extract structured intent analysis.

    Args:
        telemetry_data: Dict containing session behavioral data.

    Returns:
        Dict with keys: intent, confidence, profile, email_subject, email_body
    """
    openai_client = get_openai_client()

    # Build the user message with the telemetry payload
    user_message = f"""Analyze this user's behavioral telemetry and determine why they abandoned:

```json
{json.dumps(telemetry_data, indent=2)}
```

Respond ONLY with valid JSON matching the required structure."""

    try:
        logger.info(f"[ENGINE] Sending telemetry to GPT-4o for session: {telemetry_data.get('session_id', 'unknown')}")

        response = await openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            temperature=0.4,  # Low temperature for consistent classification
            max_tokens=512,
            response_format={"type": "json_object"},
        )

        raw_content = response.choices[0].message.content
        result = json.loads(raw_content)

        # Validate required keys exist
        required_keys = {"intent", "confidence", "profile", "email_subject", "email_body"}
        if not required_keys.issubset(result.keys()):
            missing = required_keys - set(result.keys())
            logger.warning(f"[ENGINE] LLM response missing keys: {missing}")
            raise ValueError(f"Missing required fields: {missing}")

        # Clamp confidence to valid range
        result["confidence"] = max(0.0, min(1.0, float(result["confidence"])))

        logger.info(
            f"[ENGINE] Analysis complete — Intent: {result['intent']} "
            f"(confidence: {result['confidence']:.0%})"
        )
        return result

    except json.JSONDecodeError as e:
        logger.error(f"[ENGINE] Failed to parse LLM JSON response: {e}")
        return _fallback_analysis(telemetry_data)
    except Exception as e:
        logger.error(f"[ENGINE] OpenAI API error: {e}")
        return _fallback_analysis(telemetry_data)


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
