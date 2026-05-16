import joblib
import os
import logging
import pandas as pd

logger = logging.getLogger("main")

# ============================================================
# 1. LOAD THE MODEL
# ============================================================
try:
    model_path = os.path.join(os.path.dirname(__file__), 'churn_predictor.pkl')
    model = joblib.load(model_path)
    print("[SUCCESS] ML Model loaded successfully!")
except Exception as e:
    print(f"[ERROR] Error loading model: {e}")
    model = None


# ============================================================
# 2. HELPER: Page URL -> Stage Classification
# Maps page URL to funnel stage for context-aware scoring
# ============================================================
def _classify_stage(page_url: str) -> dict:
    """
    Returns stage flags matching the model's training features.
    Also returns a stage name and time baseline for adaptive thresholds.
    """
    url = str(page_url).lower()

    if any(k in url for k in ["checkout", "payment", "confirm", "transaction"]):
        return {"is_kyc": 0, "is_application": 0, "is_transaction": 1,
                "stage_name": "Transaction", "time_baseline": 90}

    if any(k in url for k in ["kyc", "verify", "aadhaar", "pan", "identity"]):
        return {"is_kyc": 1, "is_application": 0, "is_transaction": 0,
                "stage_name": "KYC", "time_baseline": 80}

    if any(k in url for k in ["invest", "sip", "mutual", "insurance", "plan",
                               "retire", "pension", "apply", "application"]):
        return {"is_kyc": 0, "is_application": 1, "is_transaction": 0,
                "stage_name": "Application", "time_baseline": 45}

    # Default: exploration / home
    return {"is_kyc": 0, "is_application": 0, "is_transaction": 0,
            "stage_name": "Exploration", "time_baseline": 20}


# ============================================================
# 3. HELPER: Hesitation Zone Analysis
# Extracts count, avg duration, and repetition pattern
# ============================================================
def _analyze_hesitation(hesitation_zones: list) -> dict:
    """
    Extracts rich signals from the hesitation_zones list.
    Each zone: {"element_id": "...", "dwell_ms": 4200}
    """
    if not hesitation_zones:
        return {
            "hesitation_zone_count": 0,
            "avg_hesitation_duration": 0.0,
            "has_repeated_element": False,
            "has_deep_single_hesitation": False,
            "is_scattered": False
        }

    count = len(hesitation_zones)
    durations = [z.get("dwell_ms", 0) / 1000.0 for z in hesitation_zones]  # convert to seconds
    avg_duration = sum(durations) / count

    element_ids = [z.get("element_id", "") for z in hesitation_zones]
    unique_elements = set(element_ids)

    has_repeated_element = len(element_ids) != len(unique_elements)       # same element hovered multiple times
    has_deep_single_hesitation = count == 1 and avg_duration > 5.0        # one element, very long hover
    is_scattered = count >= 3 and len(unique_elements) == count           # many different elements

    return {
        "hesitation_zone_count": count,
        "avg_hesitation_duration": round(avg_duration, 2),
        "has_repeated_element": has_repeated_element,
        "has_deep_single_hesitation": has_deep_single_hesitation,
        "is_scattered": is_scattered
    }


# ============================================================
# 4. MAIN DECISION: Should We Nudge?
# Updated to feed 12 features matching the new model
# ============================================================
def should_we_nudge(telemetry_data: dict) -> bool:
    """
    Takes live tracking data, feeds the correct 12 features to the ML model,
    and returns True (send nudge) or False (leave them alone).
    """
    telemetry = telemetry_data.get('behavioral_telemetry', {})
    friction   = telemetry.get('friction_signals', {})
    page_url   = telemetry_data.get('page_url', '/')

    # Extract raw signals
    rage_clicks              = friction.get('rage_clicks', 0)
    scroll_thrash_count      = friction.get('scroll_thrash_count', 0)
    erratic_mouse_movements  = friction.get('erratic_mouse_movements', 0)
    total_time_seconds       = telemetry.get('total_time_seconds', 0)
    max_scroll_depth_percent = telemetry.get('max_scroll_depth_percent', 0)
    hesitation_zones         = telemetry.get('hesitation_zones', [])

    # DOM context (sent by Person 2's extractor — default 0 if not yet available)
    dom_context  = telemetry_data.get('dom_context', {})
    form_count   = dom_context.get('form_count', 0)
    input_count  = dom_context.get('input_count', 0)

    # Stage and hesitation analysis
    stage    = _classify_stage(page_url)
    hesitate = _analyze_hesitation(hesitation_zones)

    # --- Heuristic Safety-Switch: If model failed to load, use rules ---
    if model is None:
        logger.warning("[PROCESSOR] ML Model unavailable. Using heuristic fallback.")
        return rage_clicks >= 1 or scroll_thrash_count >= 2

    # Build the feature DataFrame (must match training column order exactly)
    try:
        live_features = pd.DataFrame([[
            stage["is_kyc"],
            stage["is_application"],
            stage["is_transaction"],
            rage_clicks,
            scroll_thrash_count,
            erratic_mouse_movements,
            total_time_seconds,
            max_scroll_depth_percent,
            hesitate["hesitation_zone_count"],
            hesitate["avg_hesitation_duration"],
            form_count,
            input_count,
        ]], columns=[
            'is_kyc', 'is_application', 'is_transaction',
            'rage_clicks', 'scroll_thrash_count', 'erratic_mouse_movements',
            'total_time_seconds', 'max_scroll_depth_percent',
            'hesitation_zone_count', 'avg_hesitation_duration',
            'form_count', 'input_count'
        ])

        logger.info(
            f"[ML] Stage={stage['stage_name']} | rage={rage_clicks} | "
            f"thrash={scroll_thrash_count} | hesitations={hesitate['hesitation_zone_count']} | "
            f"time={total_time_seconds}s"
        )

        prediction = model.predict(live_features)
        churn_prob = model.predict_proba(live_features)[0][1]

        logger.info(f"[ML] Churn probability: {churn_prob:.2%} | Prediction: {'CHURN' if prediction[0] == 1 else 'SAFE'}")

        # Trigger if model predicts churn OR rage-click emergency
        if prediction[0] == 1 or rage_clicks >= 3:
            if rage_clicks >= 3:
                logger.info(f"[PROCESSOR] RAGE MODE: {rage_clicks} clicks. Forcing nudge.")
            return True
        return False

    except Exception as e:
        logger.error(f"[PROCESSOR] Feature extraction failed: {e}. Falling back to heuristic.")
        return rage_clicks >= 1 or scroll_thrash_count >= 2


# ============================================================
# 5a. FULL SESSION ANALYSIS (preferred — runs model only once)
# Returns everything main.py needs in a single call
# ============================================================
def analyze_session(telemetry_data: dict, past_events: int = 0, unique_pages: int = 1) -> dict:
    """
    Single entry point for all ML + behavior logic.
    Runs the model ONCE and returns:
      - should_nudge:      bool   — whether to intervene
      - churn_probability: float  — 0.0 to 1.0 risk score from ML model
      - behavior_type:     str    — one of 7 profiles (BLOCKED, CONFUSED, etc.)
      - stage:             str    — KYC / Application / Transaction / Exploration
      - urgency:           str    — HIGH / MEDIUM / LOW
    """
    telemetry = telemetry_data.get('behavioral_telemetry', {})
    friction   = telemetry.get('friction_signals', {})
    page_url   = telemetry_data.get('page_url', '/')

    rage_clicks              = friction.get('rage_clicks', 0)
    scroll_thrash_count      = friction.get('scroll_thrash_count', 0)
    erratic_mouse_movements  = friction.get('erratic_mouse_movements', 0)
    total_time_seconds       = telemetry.get('total_time_seconds', 0)
    max_scroll_depth_percent = telemetry.get('max_scroll_depth_percent', 0)
    hesitation_zones         = telemetry.get('hesitation_zones', [])
    dom_context              = telemetry_data.get('dom_context', {})
    form_count               = dom_context.get('form_count', 0)
    input_count              = dom_context.get('input_count', 0)

    stage    = _classify_stage(page_url)
    hesitate = _analyze_hesitation(hesitation_zones)

    should_nudge    = False
    churn_prob      = 0.0

    if model is None:
        # Heuristic fallback
        should_nudge = rage_clicks >= 1 or scroll_thrash_count >= 2
        churn_prob   = min(0.95, (rage_clicks * 0.2) + (scroll_thrash_count * 0.1))
    else:
        try:
            live_features = pd.DataFrame([[
                stage["is_kyc"], stage["is_application"], stage["is_transaction"],
                rage_clicks, scroll_thrash_count, erratic_mouse_movements,
                total_time_seconds, max_scroll_depth_percent,
                hesitate["hesitation_zone_count"], hesitate["avg_hesitation_duration"],
                form_count, input_count,
            ]], columns=[
                'is_kyc', 'is_application', 'is_transaction',
                'rage_clicks', 'scroll_thrash_count', 'erratic_mouse_movements',
                'total_time_seconds', 'max_scroll_depth_percent',
                'hesitation_zone_count', 'avg_hesitation_duration',
                'form_count', 'input_count'
            ])

            prediction  = model.predict(live_features)
            churn_prob  = round(float(model.predict_proba(live_features)[0][1]), 4)
            should_nudge = prediction[0] == 1 or rage_clicks >= 3

            logger.info(
                f"[ML] Churn: {churn_prob:.2%} | Stage: {stage['stage_name']} | "
                f"Nudge: {should_nudge}"
            )
        except Exception as e:
            logger.error(f"[PROCESSOR] analyze_session failed: {e}. Using heuristic.")
            should_nudge = rage_clicks >= 1 or scroll_thrash_count >= 2
            churn_prob   = min(0.95, (rage_clicks * 0.2) + (scroll_thrash_count * 0.1))

    # Behavior profile (uses same extracted signals, no second model call)
    behavior_type = get_behavior_profile(telemetry_data, past_events, unique_pages)

    # Urgency label for the admin dashboard and Gemini prompt
    if churn_prob >= 0.75 or rage_clicks >= 3:
        urgency = "HIGH"
    elif churn_prob >= 0.50 or rage_clicks >= 1:
        urgency = "MEDIUM"
    else:
        urgency = "LOW"

    logger.info(
        f"[SESSION] behavior={behavior_type} | churn={churn_prob:.2%} | "
        f"urgency={urgency} | stage={stage['stage_name']}"
    )

    return {
        "should_nudge":      should_nudge,
        "churn_probability": churn_prob,
        "behavior_type":     behavior_type,
        "stage":             stage["stage_name"],
        "urgency":           urgency,
    }



# ============================================================
# 5. BEHAVIOR PROFILER: What TYPE of user are they?
# Uses confidence scoring — multiple signals combined, no rigid cutoff
# ============================================================
def get_behavior_profile(telemetry_data: dict, past_events: int = 0, unique_pages: int = 1) -> str:
    """
    Classifies the user into one of 7 behavioral profiles using
    a confidence scoring system. The profile with the highest score wins.

    Priority order (highest urgency first):
    BLOCKED > STRUGGLING > DISENGAGING > CONFUSED > HESITANT > EXPLORING > HIGH_INTENT

    Args:
        telemetry_data: The full beacon payload from tracker.js
        past_events:    Total events for this session (from DB history)
        unique_pages:   Number of distinct pages visited (from DB history)

    Returns:
        str: One of the 7 profile names
    """
    telemetry = telemetry_data.get('behavioral_telemetry', {})
    friction   = telemetry.get('friction_signals', {})
    page_url   = telemetry_data.get('page_url', '/')

    # Raw signals
    rage_clicks              = friction.get('rage_clicks', 0)
    scroll_thrash            = friction.get('scroll_thrash_count', 0)
    total_time               = telemetry.get('total_time_seconds', 0)
    scroll_depth             = telemetry.get('max_scroll_depth_percent', 0)
    hesitation_zones         = telemetry.get('hesitation_zones', [])
    last_rage_element        = telemetry.get('last_rage_element') or ""

    # Enriched signals
    stage    = _classify_stage(page_url)
    hesitate = _analyze_hesitation(hesitation_zones)
    stage_name = stage["stage_name"]
    time_baseline = stage["time_baseline"]

    # Normalized time: how many times longer than expected for this page type?
    time_ratio = total_time / max(time_baseline, 1)

    # Activity density: actions per second (low = disengaging)
    total_actions = rage_clicks + scroll_thrash + hesitate["hesitation_zone_count"]
    activity_density = total_actions / max(total_time, 1)

    # Cross-signal: raged on an element they also hovered = confirmed friction point
    raged_element_in_hesitation = any(
        last_rage_element.lower() in str(z.get("element_id", "")).lower()
        for z in hesitation_zones
    ) if last_rage_element else False

    # --------------------------------------------------------
    # CONFIDENCE SCORES (higher = stronger match)
    # --------------------------------------------------------
    scores = {
        "BLOCKED":     0,
        "STRUGGLING":  0,
        "DISENGAGING": 0,
        "CONFUSED":    0,
        "HESITANT":    0,
        "EXPLORING":   0,
        "HIGH_INTENT": 0,
    }

    # --- BLOCKED: Frozen on one element, zero forward movement ---
    if rage_clicks >= 3:                             scores["BLOCKED"] += 40
    if scroll_thrash == 0 and rage_clicks >= 2:      scores["BLOCKED"] += 25
    if last_rage_element:                            scores["BLOCKED"] += 15
    if raged_element_in_hesitation:                  scores["BLOCKED"] += 20
    if hesitate["has_repeated_element"]:             scores["BLOCKED"] += 15
    if stage_name in ("KYC", "Transaction"):         scores["BLOCKED"] += 10  # Higher urgency on critical pages

    # --- STRUGGLING: Goal-oriented but hitting friction ---
    if rage_clicks in (1, 2):                        scores["STRUGGLING"] += 35
    if scroll_thrash >= 1 and rage_clicks >= 1:      scores["STRUGGLING"] += 25
    if hesitate["hesitation_zone_count"] >= 1:       scores["STRUGGLING"] += 15
    if last_rage_element and not hesitate["has_repeated_element"]:
                                                     scores["STRUGGLING"] += 15
    if stage_name in ("KYC", "Application"):         scores["STRUGGLING"] += 10

    # --- DISENGAGING: High time, near-zero activity ---
    if time_ratio >= 2.0:                            scores["DISENGAGING"] += 30
    if activity_density < 0.03:                      scores["DISENGAGING"] += 35
    if rage_clicks == 0 and scroll_thrash == 0:      scores["DISENGAGING"] += 20
    if hesitate["hesitation_zone_count"] == 0:       scores["DISENGAGING"] += 15
    if total_time >= 60:                             scores["DISENGAGING"] += 10

    # --- CONFUSED: Chaotic search, no direction ---
    if scroll_thrash >= 3:                           scores["CONFUSED"] += 35
    if hesitate["is_scattered"]:                     scores["CONFUSED"] += 30  # hovering many different things
    if rage_clicks == 0:                             scores["CONFUSED"] += 10
    if time_ratio >= 1.5 and scroll_thrash >= 2:     scores["CONFUSED"] += 20
    if unique_pages <= 2 and scroll_thrash >= 3:     scores["CONFUSED"] += 15  # stuck on same page, chaotic

    # --- HESITANT: Slow, careful, risk-sensitive ---
    if time_ratio >= 2.0:                            scores["HESITANT"] += 25
    if hesitate["has_deep_single_hesitation"]:       scores["HESITANT"] += 35  # long hover on one thing = caution
    if hesitate["hesitation_zone_count"] >= 2:       scores["HESITANT"] += 20
    if scroll_thrash <= 1 and rage_clicks == 0:      scores["HESITANT"] += 15
    if stage_name in ("Transaction", "KYC"):         scores["HESITANT"] += 15  # payment fear is common

    # --- EXPLORING: Browsing broadly, low commitment ---
    if unique_pages >= 3:                            scores["EXPLORING"] += 40
    if rage_clicks == 0 and scroll_thrash == 0:      scores["EXPLORING"] += 20
    if hesitate["hesitation_zone_count"] <= 1:       scores["EXPLORING"] += 15
    if total_time < time_baseline * 1.5:             scores["EXPLORING"] += 15  # quick browse per page

    # --- HIGH_INTENT: Confident, direct, close to converting ---
    if rage_clicks == 0 and scroll_thrash == 0:      scores["HIGH_INTENT"] += 20
    if past_events >= 5:                             scores["HIGH_INTENT"] += 25  # returning user knows the site
    if scroll_depth >= 60:                           scores["HIGH_INTENT"] += 20
    if hesitate["hesitation_zone_count"] >= 1 and rage_clicks == 0:
                                                     scores["HIGH_INTENT"] += 20
    if 20 <= total_time <= time_baseline * 1.5:      scores["HIGH_INTENT"] += 15

    # --------------------------------------------------------
    # PICK WINNER — respect priority order for tie-breaking
    # --------------------------------------------------------
    PRIORITY = ["BLOCKED", "STRUGGLING", "DISENGAGING", "CONFUSED", "HESITANT", "EXPLORING", "HIGH_INTENT"]
    MIN_CONFIDENCE = 30  # must score at least this to be classified

    winner = "UNKNOWN"
    best_score = MIN_CONFIDENCE

    for profile in PRIORITY:
        if scores[profile] >= best_score:
            best_score = scores[profile]
            winner = profile
            break  # stop at first profile that crosses threshold (respects priority order)

    logger.info(f"[BEHAVIOR] Profile: {winner} (score={best_score}) | Scores: {scores}")
    return winner
