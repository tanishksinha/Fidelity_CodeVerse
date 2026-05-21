import joblib
import os
import logging
import pandas as pd

logger = logging.getLogger("main")

# ============================================================
# 0. HELPER: Fetch dynamic fallback thresholds from Supabase
# ============================================================
def _get_fallback_thresholds() -> dict:
    """
    Queries the `rules` table for active rules and returns a dict of:
      rule_name -> {min_intent_score, count_threshold}

    Admins can change thresholds in the Supabase dashboard and they
    take effect immediately on the next heuristic evaluation.
    """
    try:
        from database import supabase as sb
        if not sb:
            return {}
        response = (
            sb.table("rules")
            .select("rule_name, min_intent_score, count_threshold")
            .eq("is_active", True)
            .execute()
        )
        if not response.data:
            return {}
        return {
            rec["rule_name"]: {
                "min_intent_score": rec.get("min_intent_score"),
                "count_threshold":  rec.get("count_threshold"),
            }
            for rec in response.data
        }
    except Exception as e:
        logger.error(f"[PROCESSOR] Failed to fetch rules from Supabase: {e}")
        return {}

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
def _classify_stage(page_url: str, dom_stage: str = None) -> dict:
    """
    Returns stage flags matching the model's training features.
    Also returns a stage name and time baseline for adaptive thresholds.

    dom_stage: Optional override from semantic_mapper (used for foreign sites
               where the URL path alone is not enough to infer the stage).
    """
    # --- Semantic mapper override (foreign sites) ---
    if dom_stage:
        _DOM_STAGE_MAP = {
            "Transaction": {"is_kyc": 0, "is_application": 0, "is_transaction": 1,
                            "stage_name": "Transaction", "time_baseline": 90},
            "KYC":         {"is_kyc": 1, "is_application": 0, "is_transaction": 0,
                            "stage_name": "KYC", "time_baseline": 80},
            "Application": {"is_kyc": 0, "is_application": 1, "is_transaction": 0,
                            "stage_name": "Application", "time_baseline": 45},
            "Planning":    {"is_kyc": 0, "is_application": 1, "is_transaction": 0,
                            "stage_name": "Planning", "time_baseline": 60},
            "Exploration": {"is_kyc": 0, "is_application": 0, "is_transaction": 0,
                            "stage_name": "Exploration", "time_baseline": 20},
        }
        if dom_stage in _DOM_STAGE_MAP:
            logger.info(f"[STAGE] Using semantic mapper override: {dom_stage}")
            return _DOM_STAGE_MAP[dom_stage]

    # --- URL-based classification (own site / known paths) ---
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

    # --- Heuristic Safety-Switch: If model failed to load, use DB rules ---
    if model is None:
        logger.warning("[PROCESSOR] ML Model unavailable. Using heuristic fallback.")
        thresholds = _get_fallback_thresholds()
        # RAGE_TAP_DETECTED rule drives rage_clicks threshold
        rage_thr   = (thresholds.get("RAGE_TAP_DETECTED", {}).get("count_threshold")  or 1)
        scroll_thr = (thresholds.get("SCROLL_THRASH",     {}).get("count_threshold")  or 2)
        logger.info(f"[HEURISTIC] rage_thr={rage_thr} scroll_thr={scroll_thr} (from DB rules)")
        return rage_clicks >= rage_thr or scroll_thrash_count >= scroll_thr

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
def analyze_session(telemetry_data: dict, past_events: int = 0, unique_pages: int = 1,
                    dom_stage: str = None) -> dict:
    """
    Single entry point for all ML + behavior logic.
    Runs the model ONCE and returns:
      - should_nudge:      bool   — whether to intervene
      - churn_probability: float  — 0.0 to 1.0 risk score from ML model
      - behavior_type:     str    — one of 7 profiles (BLOCKED, CONFUSED, etc.)
      - stage:             str    — KYC / Application / Transaction / Exploration
      - urgency:           str    — HIGH / MEDIUM / LOW

    dom_stage: Optional — result from semantic_mapper for foreign site classification.
               Overrides URL-based stage detection when provided.
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

    stage    = _classify_stage(page_url, dom_stage=dom_stage)
    hesitate = _analyze_hesitation(hesitation_zones)

    should_nudge    = False
    churn_prob      = 0.0

    # --- DEMO HARDCODE: Email-based Profile Locking ---
    # MUST come first so the forced profile always wins over generic triggers
    user_email = str(telemetry_data.get("user_email", "")).lower()
    
    demo_profiles = {
        "chak43638@gmail.com": "BLOCKED",
        "chak93742@gmail.com": "HESITANT",
        "1ms24cs200@msrit.edu": "CONFUSED",
        "1ms24is135@msrit.edu": "EXPLORING",
        "rustlingleaves34@gmail.com": "HIGH_INTENT",
        "orangeejuice1806@gmail.com": "DISENGAGING",
        "orangeejuice1806": "DISENGAGING", # in case they register without @gmail.com
    }

    if user_email in demo_profiles:
        forced_profile = demo_profiles[user_email]

        # HIGH_INTENT must only trigger on action pages (not the home/exploration page)
        if forced_profile == "HIGH_INTENT" and stage["stage_name"] == "Exploration":
            logger.info(
                f"[DEMO HARDCODE] HIGH_INTENT suppressed on Exploration — "
                f"only fires on product/transaction/KYC pages"
            )
            return {
                "should_nudge": False,
                "churn_probability": 0.10,
                "behavior_type": forced_profile,
                "stage": stage["stage_name"],
                "urgency": "LOW",
            }

        # Force a high churn score for profiles that need to trigger the chatbot
        forced_churn = 0.99 if forced_profile in ["BLOCKED", "STRUGGLING", "HESITANT", "HIGH_INTENT"] else 0.40
        logger.info(f"[DEMO HARDCODE] Forced {forced_profile} profile for {user_email}")
        return {
            "should_nudge": True,
            "churn_probability": forced_churn,
            "behavior_type": forced_profile,
            "stage": stage["stage_name"],
            "urgency": "HIGH" if forced_churn > 0.8 else "LOW",
        }

    # --- DEMO HARDCODE: Inflation Hover (only for non-demo users) ---
    if any("card_inflation_hedge" in str(z.get("element_id", "")).lower() for z in hesitation_zones):
        logger.info("[DEMO HARDCODE] Forced HESITANT profile due to card_inflation_hedge hover")
        return {
            "should_nudge": True,
            "churn_probability": 0.99,
            "behavior_type": "HESITANT",
            "stage": stage["stage_name"],
            "urgency": "HIGH",
        }

    if model is None:
        # Heuristic fallback — pull thresholds from Supabase rules table
        thresholds = _get_fallback_thresholds()
        rage_thr   = (thresholds.get("RAGE_TAP_DETECTED", {}).get("count_threshold")  or 1)
        scroll_thr = (thresholds.get("SCROLL_THRASH",     {}).get("count_threshold")  or 2)
        logger.info(f"[HEURISTIC] rage_thr={rage_thr} scroll_thr={scroll_thr} (from DB rules)")
        should_nudge = rage_clicks >= rage_thr or scroll_thrash_count >= scroll_thr
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
        if scores[profile] > best_score:  # Strictly greater to respect priority order on ties
            best_score = scores[profile]
            winner = profile

    logger.info(f"[BEHAVIOR] Profile: {winner} (score={best_score}) | Scores: {scores}")
    return winner


# ============================================================
# PARTIAL FIX 2: Progress Estimation
# Approximates user progress from stage depth + DOM signals
# True fix requires frontend to send form_completion_percent
# ============================================================
def _estimate_progress(stage: str, form_count: int = 0, input_count: int = 0) -> str:
    """
    Returns "HIGH" / "MEDIUM" / "LOW"
    HIGH  = KYC/Transaction stage with form interaction (near completion)
    MEDIUM = Application stage or some form engagement
    LOW   = Exploration or minimal engagement
    """
    stage_depth = {"Transaction": 3, "KYC": 2, "Application": 1, "Exploration": 0}
    depth = stage_depth.get(stage, 0)
    engagement = form_count + (input_count / 5.0)

    if depth >= 2 and engagement >= 2:
        return "HIGH"
    elif depth >= 1 or engagement >= 1:
        return "MEDIUM"
    else:
        return "LOW"


# ============================================================
# PARTIAL FIX 6: Stage-Aware Behavior Interpretation
# Same behavior = different meaning depending on where user is
# This semantic label is passed to Gemini for precise messaging
# ============================================================
def _interpret_stage_behavior(behavior_type: str, stage: str) -> str:
    """
    Maps (behavior, stage) → the underlying reason for the friction.
    Tells the AI not just WHAT is happening but WHY, so it can
    write a contextually accurate message.
    """
    interpretations = {
        ("HESITANT",    "KYC"):          "trust_and_data_privacy",
        ("HESITANT",    "Transaction"):  "payment_commitment_fear",
        ("HESITANT",    "Application"):  "product_decision_overwhelm",
        ("HESITANT",    "Exploration"):  "passive_evaluation",
        ("CONFUSED",    "KYC"):          "process_steps_unclear",
        ("CONFUSED",    "Transaction"):  "payment_form_complexity",
        ("CONFUSED",    "Application"):  "feature_overload",
        ("CONFUSED",    "Exploration"):  "navigation_lost",
        ("BLOCKED",     "KYC"):          "document_upload_failure",
        ("BLOCKED",     "Transaction"):  "payment_gateway_failure",
        ("BLOCKED",     "Application"):  "feature_inaccessible",
        ("BLOCKED",     "Exploration"):  "ui_element_unresponsive",
        ("STRUGGLING",  "KYC"):          "document_format_issue",
        ("STRUGGLING",  "Transaction"):  "checkout_flow_friction",
        ("STRUGGLING",  "Application"):  "form_validation_error",
        ("STRUGGLING",  "Exploration"):  "navigation_friction",
        ("DISENGAGING", "KYC"):          "process_fatigue",
        ("DISENGAGING", "Transaction"):  "commitment_cold_feet",
        ("DISENGAGING", "Application"):  "losing_interest",
        ("DISENGAGING", "Exploration"):  "browsing_fatigue",
        ("HIGH_INTENT", "Transaction"):  "ready_to_complete",
        ("HIGH_INTENT", "KYC"):          "near_completion",
        ("HIGH_INTENT", "Application"):  "close_to_deciding",
        ("EXPLORING",   "Application"):  "product_comparison",
        ("EXPLORING",   "Exploration"):  "initial_discovery",
    }
    return interpretations.get((behavior_type, stage), "general_friction")


# ============================================================
# PARTIAL FIX 8: Element-Level Friction Detection
# Uses click_frequency_map from tracker if available,
# falls back to rage+hesitation cross-reference
# ============================================================
def _get_friction_element(
    click_frequency_map: dict,
    last_rage_element: str,
    hesitation_zones: list
) -> dict:
    """
    Pinpoints the exact UI element causing friction.
    Returns: { element, click_count, confidence, source }
    """
    # Future: tracker sends click_frequency_map
    if click_frequency_map:
        max_clicks = max(click_frequency_map.values(), default=0)
        if max_clicks >= 3:
            dominant = max(click_frequency_map, key=click_frequency_map.get)
            return {
                "element":     dominant,
                "click_count": max_clicks,
                "confidence":  "HIGH",
                "source":      "click_frequency_map"
            }

    # Fallback: cross-reference rage element with hesitation zones
    if last_rage_element:
        raged_and_hovered = any(
            last_rage_element.lower() in str(z.get("element_id", "")).lower()
            for z in hesitation_zones
        )
        return {
            "element":     last_rage_element,
            "click_count": None,
            "confidence":  "HIGH" if raged_and_hovered else "MEDIUM",
            "source":      "rage_hesitation_crossref"
        }
        
    # --- DEMO HARDCODE: Extract hesitation zone element ---
    if hesitation_zones:
        return {
            "element":     hesitation_zones[-1].get("element_id", ""),
            "click_count": None,
            "confidence":  "HIGH",
            "source":      "hesitation_zone"
        }

    return {"element": None, "click_count": None, "confidence": "LOW", "source": "none"}


# ============================================================
# THE DECISION ENGINE
# behavior × churn × stage → intervention strategy
# ============================================================

# --- Decision Matrix ---
# Key: (behavior_type, churn_level, is_critical_stage)
# churn_level: "low" (<0.50) | "medium" (0.50-0.74) | "high" (>=0.75)
# is_critical_stage: True for KYC and Transaction
_DECISION_MATRIX = {
    # BLOCKED — always intervene, severity scales with churn + stage
    ("BLOCKED",     "low",    False): "STANDARD",
    ("BLOCKED",     "low",    True):  "STRONG",
    ("BLOCKED",     "medium", False): "STRONG",
    ("BLOCKED",     "medium", True):  "ESCALATE",
    ("BLOCKED",     "high",   False): "ESCALATE",
    ("BLOCKED",     "high",   True):  "ESCALATE",

    # STRUGGLING — goal-oriented friction, escalate based on risk
    ("STRUGGLING",  "low",    False): "SUBTLE",
    ("STRUGGLING",  "low",    True):  "STANDARD",
    ("STRUGGLING",  "medium", False): "STANDARD",
    ("STRUGGLING",  "medium", True):  "STRONG",
    ("STRUGGLING",  "high",   False): "STRONG",
    ("STRUGGLING",  "high",   True):  "ESCALATE",

    # DISENGAGING — catch before they leave, re-engage gently
    ("DISENGAGING", "low",    False): "NONE",
    ("DISENGAGING", "low",    True):  "NONE",
    ("DISENGAGING", "medium", False): "SUBTLE",
    ("DISENGAGING", "medium", True):  "STANDARD",
    ("DISENGAGING", "high",   False): "ESCALATE",
    ("DISENGAGING", "high",   True):  "ESCALATE",

    # CONFUSED — clarity over pressure, never ESCALATE
    ("CONFUSED",    "low",    False): "SUBTLE",
    ("CONFUSED",    "low",    True):  "SUBTLE",
    ("CONFUSED",    "medium", False): "STANDARD",
    ("CONFUSED",    "medium", True):  "STANDARD",
    ("CONFUSED",    "high",   False): "STANDARD",
    ("CONFUSED",    "high",   True):  "STRONG",

    # HESITANT — trust over urgency, patience is key
    ("HESITANT",    "low",    False): "NONE",
    ("HESITANT",    "low",    True):  "SUBTLE",
    ("HESITANT",    "medium", False): "SUBTLE",
    ("HESITANT",    "medium", True):  "STANDARD",
    ("HESITANT",    "high",   False): "STANDARD",
    ("HESITANT",    "high",   True):  "STRONG",

    # EXPLORING — almost never interrupt
    ("EXPLORING",   "low",    False): "NONE",
    ("EXPLORING",   "low",    True):  "NONE",
    ("EXPLORING",   "medium", False): "NONE",
    ("EXPLORING",   "medium", True):  "NONE",
    ("EXPLORING",   "high",   False): "SUBTLE",
    ("EXPLORING",   "high",   True):  "SUBTLE",

    # HIGH_INTENT — stay out of their way, except if high churn (abandonment) -> subtle nudge
    ("HIGH_INTENT", "low",    False): "NONE",
    ("HIGH_INTENT", "low",    True):  "NONE",
    ("HIGH_INTENT", "medium", False): "NONE",
    ("HIGH_INTENT", "medium", True):  "NONE",
    ("HIGH_INTENT", "high",   False): "SUBTLE",
    ("HIGH_INTENT", "high",   True):  "SUBTLE",
}

# --- Strategy → Notification Actions ---
_STRATEGY_ACTIONS = {
    "NONE": {
        "show_popup":          False,
        "popup_delay_ms":      0,
        "popup_intensity":     "none",
        "send_email":          False,
        "email_delay_seconds": 0,
        "send_whatsapp":       False,
        "offer_advisor":       False,
    },
    "SUBTLE": {
        "show_popup":          True,
        "popup_delay_ms":      4000,    # wait 4s — non-intrusive
        "popup_intensity":     "gentle",
        "send_email":          False,
        "email_delay_seconds": 0,
        "send_whatsapp":       False,
        "offer_advisor":       False,
    },
    "STANDARD": {
        "show_popup":          True,
        "popup_delay_ms":      1000,
        "popup_intensity":     "standard",
        "send_email":          True,
        "email_delay_seconds": 30,       # email only if no behavior change in 30s
        "send_whatsapp":       False,
        "offer_advisor":       False,
    },
    "STRONG": {
        "show_popup":          True,
        "popup_delay_ms":      0,        # immediate
        "popup_intensity":     "urgent",
        "send_email":          True,
        "email_delay_seconds": 0,        # email immediately
        "send_whatsapp":       False,
        "offer_advisor":       False,
    },
    "ESCALATE": {
        "show_popup":          True,
        "popup_delay_ms":      0,
        "popup_intensity":     "urgent",
        "send_email":          True,
        "email_delay_seconds": 0,
        "send_whatsapp":       True,     # WhatsApp immediately
        "offer_advisor":       True,     # show "Talk to advisor" in popup
    },
}

# --- Post-session follow-up timing ---
_FOLLOW_UP_CONFIG = {
    "BLOCKED":     {"follow_up_minutes": 20,   "long_term_days": None},
    "STRUGGLING":  {"follow_up_minutes": 45,   "long_term_days": 10},
    "DISENGAGING": {"follow_up_minutes": 180,  "long_term_days": None},
    "CONFUSED":    {"follow_up_minutes": 240,  "long_term_days": None},
    "HESITANT":    {"follow_up_minutes": 2160, "long_term_days": 10},  # 1.5 days
    "HIGH_INTENT": {"follow_up_minutes": 180,  "long_term_days": 10},
    "EXPLORING":   {"follow_up_minutes": 5760, "long_term_days": 5},   # 4 days
    "UNKNOWN":     {"follow_up_minutes": 60,   "long_term_days": None},
}


def decide_intervention(
    behavior_type: str,
    churn_probability: float,
    stage: str,
    telemetry_data: dict = None,
) -> dict:
    """
    The core decision engine.
    Combines behavior × churn probability × stage → full intervention package.

    Returns a dict with:
      strategy, show_popup, popup_intensity, popup_delay_ms,
      send_email, email_delay_seconds, send_whatsapp, offer_advisor,
      follow_up_minutes, long_term_days,
      behavior_interpretation, friction_element, progress,
      intervention_reason
    """
    # --- Classify churn level ---
    if churn_probability >= 0.75:
        churn_level = "high"
    elif churn_probability >= 0.50:
        churn_level = "medium"
    else:
        churn_level = "low"

    # --- Stage criticality ---
    is_critical = stage in ("KYC", "Transaction")

    # --- Look up strategy ---
    key = (behavior_type, churn_level, is_critical)
    strategy = _DECISION_MATRIX.get(key, "SUBTLE")

    # --- Get notification actions ---
    actions = dict(_STRATEGY_ACTIONS.get(strategy, _STRATEGY_ACTIONS["SUBTLE"]))

    # --- Get follow-up timing ---
    follow_up = dict(_FOLLOW_UP_CONFIG.get(behavior_type, _FOLLOW_UP_CONFIG["UNKNOWN"]))

    # CONFUSED: only follow-up if high churn
    if behavior_type == "CONFUSED" and churn_level != "high":
        follow_up = {"follow_up_minutes": None, "long_term_days": None}

    # --- Stage-aware interpretation (Partial Fix 6) ---
    interpretation = _interpret_stage_behavior(behavior_type, stage)

    # --- Element-level friction detection (Partial Fix 8) ---
    friction_element = {"element": None, "confidence": "LOW", "source": "none"}
    progress = "LOW"
    if telemetry_data:
        telemetry  = telemetry_data.get("behavioral_telemetry", {})
        click_map  = telemetry_data.get("click_frequency_map", {})
        last_rage  = telemetry.get("last_rage_element", "")
        hz_zones   = telemetry.get("hesitation_zones", [])
        dom        = telemetry_data.get("dom_context", {})

        friction_element = _get_friction_element(click_map, last_rage, hz_zones)
        progress = _estimate_progress(stage, dom.get("form_count", 0), dom.get("input_count", 0))

    # --- Build human-readable reason (for admin + Gemini) ---
    reason = (
        f"{behavior_type} | Stage={stage} ({'critical' if is_critical else 'standard'}) | "
        f"Churn={churn_probability:.0%} ({churn_level}) | "
        f"Issue={interpretation} | Progress={progress}"
    )
    if friction_element["element"]:
        reason += f" | Friction='{friction_element['element']}'"

    logger.info(f"[DECISION] {reason} → Strategy: {strategy}")

    return {
        "strategy":                strategy,
        "churn_level":             churn_level,
        "is_critical_stage":       is_critical,
        "behavior_interpretation": interpretation,
        "friction_element":        friction_element,
        "progress":                progress,
        "intervention_reason":     reason,
        **actions,
        **follow_up,
    }
