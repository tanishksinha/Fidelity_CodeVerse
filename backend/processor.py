import joblib

# 1. LOAD THE BRAIN
# This line wakes up the model you trained in Google Colab
try:
    model = joblib.load('churn_predictor.pkl')
    print("✅ ML Model loaded successfully!")
except Exception as e:
    print(f"❌ Error loading model: {e}")
    model = None

# 2. THE DECISION FUNCTION
def should_we_nudge(telemetry_data: dict) -> bool:
    """
    Takes live tracking data, calculates friction, and asks the ML model if the user is leaving.
    Returns True (Send an email/nudge) or False (Leave them alone).
    """
    if model is None:
        return False # Fail-safe: if the model is broken, don't spam the user

    # Step A: Extract the live data (with fallbacks if the data is missing)
    duration = telemetry_data.get('duration', 0)
    clicks = telemetry_data.get('clicks', 0)
    past_visits = telemetry_data.get('past_visits', 1) 
    
    # Step B: Calculate the exact same Friction Score we used in training
    friction_score = (clicks * 10) + (duration / 2)
    
    # Step C: Prepare the data exactly how the model expects it
    # Order matters! It MUST match the training order: [duration, friction_score, past_visits]
    live_features = [[duration, friction_score, past_visits]]
    
    # Step D: Ask the model to predict
    prediction = model.predict(live_features)
    
    # Step E: Interpret the answer (1 = Churn, 0 = Stay)
    if prediction[0] == 1:
        return True   # Yes, they are leaving. Nudge them!
    else:
        return False  # No, they are safe. Do nothing.