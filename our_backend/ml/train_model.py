# ============================================================
# SYNAPTIC CODEVERSE - PRODUCTION-ALIGNED MVP MODEL
# Uses ONLY telemetry currently available in tracker.js
# ============================================================

import pandas as pd
import numpy as np
import random
import joblib
import os

from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    roc_auc_score
)

# ============================================================
# 1. CONFIGURATION
# ============================================================

print("1. Generating Production-Aligned Behavioral Data...")

NUM_SESSIONS = 5000
RANDOM_SEED = 42

random.seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)

# ============================================================
# 2. UNIVERSAL FINANCIAL STAGES
# ============================================================

stages = [
    'Exploration',
    'Planning',
    'KYC',
    'Application',
    'Transaction'
]

# ============================================================
# 3. HIDDEN USER PERSONAS
# Used ONLY for realistic synthetic generation
# ============================================================

personas = [
    'focused',
    'confused',
    'frustrated',
    'cautious',
    'distracted',
    'high_intent'
]

data = []

# ============================================================
# 4. SYNTHETIC SESSION GENERATION
# ============================================================

for _ in range(NUM_SESSIONS):

    # --------------------------------------------------------
    # UNIVERSAL STAGE
    # --------------------------------------------------------

    stage = random.choice(stages)

    # --------------------------------------------------------
    # HIDDEN PERSONA
    # --------------------------------------------------------

    persona = random.choices(
        personas,
        weights=[20, 18, 15, 20, 12, 15],
        k=1
    )[0]

    # ========================================================
    # BASELINE FEATURES
    # ONLY FEATURES CURRENTLY AVAILABLE IN tracker.js
    # ========================================================

    rage_clicks = np.random.poisson(1)

    scroll_thrash_count = np.random.poisson(1)

    erratic_mouse_movements = np.random.poisson(2)

    total_time_seconds = np.random.normal(90, 40)

    max_scroll_depth_percent = np.random.normal(60, 20)

    hesitation_zone_count = np.random.poisson(1)

    avg_hesitation_duration = np.random.normal(4, 2)

    form_count = np.random.randint(0, 6)

    input_count = np.random.randint(0, 20)

    # ========================================================
    # PERSONA-BASED MODIFICATIONS
    # Creates realistic correlated behaviors
    # ========================================================

    if persona == 'frustrated':

        rage_clicks += np.random.randint(3, 7)
        erratic_mouse_movements += np.random.randint(4, 10)
        scroll_thrash_count += np.random.randint(1, 4)
        hesitation_zone_count += np.random.randint(1, 3)
        avg_hesitation_duration += np.random.uniform(3, 8)
        total_time_seconds += np.random.uniform(40, 120)

    elif persona == 'confused':

        scroll_thrash_count += np.random.randint(3, 7)
        hesitation_zone_count += np.random.randint(2, 5)
        avg_hesitation_duration += np.random.uniform(8, 18)
        max_scroll_depth_percent += np.random.uniform(10, 25)
        total_time_seconds += np.random.uniform(60, 150)

    elif persona == 'cautious':

        hesitation_zone_count += np.random.randint(2, 4)
        avg_hesitation_duration += np.random.uniform(10, 20)
        rage_clicks += np.random.randint(0, 2)
        total_time_seconds += np.random.uniform(50, 120)

    elif persona == 'distracted':

        total_time_seconds += np.random.uniform(80, 180)
        max_scroll_depth_percent -= np.random.uniform(10, 25)
        hesitation_zone_count += np.random.randint(1, 3)

    elif persona == 'high_intent':

        rage_clicks = max(0, rage_clicks - np.random.randint(0, 2))
        scroll_thrash_count = max(0, scroll_thrash_count - np.random.randint(0, 2))
        erratic_mouse_movements = max(0, erratic_mouse_movements - np.random.randint(0, 2))
        hesitation_zone_count = max(0, hesitation_zone_count - np.random.randint(0, 1))
        avg_hesitation_duration -= np.random.uniform(1, 3)
        max_scroll_depth_percent += np.random.uniform(15, 30)
        total_time_seconds -= np.random.uniform(10, 40)

    elif persona == 'focused':

        rage_clicks = max(0, rage_clicks - 1)
        scroll_thrash_count = max(0, scroll_thrash_count - 1)
        hesitation_zone_count = max(0, hesitation_zone_count - 1)
        avg_hesitation_duration -= np.random.uniform(1, 2)

    # ========================================================
    # STAGE-SENSITIVE RISK LOGIC
    # ========================================================

    stage_risk_multiplier = 1.0

    if stage == 'Transaction':
        stage_risk_multiplier = 1.5
    elif stage == 'Application':
        stage_risk_multiplier = 1.3
    elif stage == 'KYC':
        stage_risk_multiplier = 1.2

    # ========================================================
    # BEHAVIORAL FRICTION SCORE
    # ========================================================

    friction_score = 0.05
    friction_score += rage_clicks * 0.08
    friction_score += scroll_thrash_count * 0.07
    friction_score += erratic_mouse_movements * 0.03
    friction_score += hesitation_zone_count * 0.09
    friction_score += (avg_hesitation_duration / 20) * 0.15
    friction_score += (total_time_seconds / 300) * 0.12
    friction_score += (1 - (max_scroll_depth_percent / 100)) * 0.15
    friction_score += (form_count / 10) * 0.08
    friction_score += (input_count / 30) * 0.10

    friction_score *= stage_risk_multiplier
    friction_score = max(0.01, min(0.95, friction_score))

    # ========================================================
    # PROBABILISTIC CHURN LABEL
    # ========================================================

    did_churn = 1 if random.random() < friction_score else 0

    # ========================================================
    # SAVE SESSION
    # ========================================================

    data.append([
        # Stage Encoding
        1 if stage == 'KYC' else 0,
        1 if stage == 'Application' else 0,
        1 if stage == 'Transaction' else 0,

        # Behavioral Features
        rage_clicks,
        scroll_thrash_count,
        erratic_mouse_movements,
        total_time_seconds,
        max_scroll_depth_percent,
        hesitation_zone_count,
        avg_hesitation_duration,

        # DOM Context Features
        form_count,
        input_count,

        # Final Label
        did_churn
    ])

# ============================================================
# 5. DATAFRAME CREATION
# ============================================================

columns = [
    'is_kyc',
    'is_application',
    'is_transaction',
    'rage_clicks',
    'scroll_thrash_count',
    'erratic_mouse_movements',
    'total_time_seconds',
    'max_scroll_depth_percent',
    'hesitation_zone_count',
    'avg_hesitation_duration',
    'form_count',
    'input_count',
    'did_churn'
]

df = pd.DataFrame(data, columns=columns)

# ============================================================
# 6. TRAIN / TEST SPLIT
# ============================================================

X = df.drop('did_churn', axis=1)
y = df['did_churn']

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42
)

# ============================================================
# 7. TRAIN RANDOM FOREST MODEL
# ============================================================

print("2. Training Production-Aligned Random Forest...")

rf_model = RandomForestClassifier(
    n_estimators=150,
    max_depth=10,
    min_samples_split=5,
    random_state=42
)

rf_model.fit(X_train, y_train)

# ============================================================
# 8. MODEL EVALUATION
# ============================================================

y_pred = rf_model.predict(X_test)
y_prob = rf_model.predict_proba(X_test)[:, 1]

print("\n================================================")
print("MODEL PERFORMANCE")
print("================================================")

print(f"Accuracy : {accuracy_score(y_test, y_pred) * 100:.2f}%")
print(f"ROC-AUC  : {roc_auc_score(y_test, y_prob):.3f}")

print("\nClassification Report:\n")
print(classification_report(y_test, y_pred))

# ============================================================
# 9. FEATURE IMPORTANCE
# ============================================================

importance_df = pd.DataFrame({
    'Feature': X.columns,
    'Importance': rf_model.feature_importances_
})

importance_df = importance_df.sort_values(
    by='Importance',
    ascending=False
)

print("\n================================================")
print("TOP FEATURES")
print("================================================")

print(importance_df.head(10))

# ============================================================
# 10. EXPORT MODEL
# ============================================================

print("\n3. Exporting Model to backend...")

model_path = os.path.join(
    os.path.dirname(__file__),
    '..',
    'churn_predictor.pkl'
)

joblib.dump(rf_model, model_path)

print(f"\n✅ Model exported successfully to '{model_path}'")
print("\n🎉 Production-Aligned Behavioral ML Engine Ready!")
