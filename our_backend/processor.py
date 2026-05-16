import joblib
import os
import logging

logger = logging.getLogger("main")

# 1. LOAD THE BRAIN
# This line wakes up the model Tanishk trained in Google Colab
try:
    # Look for the model file in the same directory as this script
    model_path = os.path.join(os.path.dirname(__file__), 'churn_predictor.pkl')
    model = joblib.load(model_path)
    print("[SUCCESS] ML Model loaded successfully!")
except Exception as e:
    print(f"[ERROR] Error loading model: {e}")
    model = None

# 2. THE DECISION FUNCTION
def should_we_nudge(telemetry_data: dict) -> bool:
    """
    Takes live tracking data from the Ghost SDK, calculates friction,
    and asks the ML model if the user is about to leave.
    Returns True (Send a nudge) or False (Leave them alone).
    """
    if model is None:
        # 🛡️ Heuristic Safety-Switch: If the model fails, use simple rules
        print("⚠️ ML Model unavailable. Using heuristic fallback.")
        telemetry = telemetry_data.get('behavioral_telemetry', {})
        friction = telemetry.get('friction_signals', {})
        rage_clicks = friction.get('rage_clicks', 0)
        scroll_thrash = friction.get('scroll_thrash_count', 0)
        # Simple rule: nudge if they rage-clicked OR scroll-thrashed
        return rage_clicks >= 1 or scroll_thrash >= 2

    # Step A: Extract the live data from the Ghost SDK JSON structure
    # 🚨 Integration Fix: Reading from correct nested keys from tracker.js
    telemetry = telemetry_data.get('behavioral_telemetry', {})
    friction = telemetry.get('friction_signals', {})

    duration = telemetry.get('total_time_seconds', 0)          # Was: 'duration'
    rage_clicks = friction.get('rage_clicks', 0)                # Was: 'clicks'
    scroll_thrash = friction.get('scroll_thrash_count', 0)
    past_visits = telemetry_data.get('past_visits', 1)

    # Step B: Calculate the Friction Score (same formula used in training)
    friction_score = (rage_clicks * 10) + (duration / 2) + (scroll_thrash * 5)

    # Step C: Prepare the data exactly how the model expects it
    # Order matters! It MUST match the training order: [duration, friction_score, past_visits]
    import pandas as pd
    live_features = pd.DataFrame(
        [[duration, friction_score, past_visits]], 
        columns=['duration', 'friction_score', 'past_visits']
    )

    logger.info(f"🔬 ML Input → duration={duration}s, friction={friction_score:.1f}, visits={past_visits}")

    # Step D: Ask the model to predict
    prediction = model.predict(live_features)

    # Step E: Interpret the answer (1 = Churn, 0 = Stay)
    # Threshold: Trigger if ML predicts churn OR if user rage-clicks at least 3 times
    if prediction[0] == 1 or rage_clicks >= 3:
        if rage_clicks >= 3:
            logger.info(f"🔥 RAGE MODE: {rage_clicks} clicks detected. Triggering intervention.")
        logger.info(f"🚨 Model says: CHURN. Nudge this user!")
        return True
    else:
        logger.info(f"✅ Model says: User is safe. No nudge needed.")
        return False
