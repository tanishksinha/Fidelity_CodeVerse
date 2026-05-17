import requests
import time
import random

ENDPOINT = "http://localhost:8080/api/ingest-telemetry"

def generate_session(session_id, page, rage_clicks, scroll_thrash, time_seconds, hesitation_zones, scroll_depth):
    return {
        "session_id": session_id,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "page_url": page,
        "behavioral_telemetry": {
            "total_time_seconds": time_seconds,
            "max_scroll_depth_percent": scroll_depth,
            "hesitation_zones": hesitation_zones,
            "friction_signals": {
                "erratic_mouse_movements": random.randint(0, 3) + (2 if scroll_thrash > 0 else 0),
                "scroll_thrash_count": scroll_thrash,
                "rage_clicks": rage_clicks,
                "highlighted_text": None
            },
            "last_rage_element": "submit_button" if rage_clicks > 0 else None,
            "exit_condition": "live_rage_click" if rage_clicks > 0 else "tab_hidden",
            "exit_velocity": "high" if rage_clicks > 0 else "normal"
        }
    }

# A pool of users to simulate a bustling website
USERS = [
    # id, page, base_rage, base_thrash, base_time, hesitation_element, is_escalating
    ("USR_LIVE_RAGE", "/investments", 0, 0, 10, "sip_calculator", True), # Gets mad
    ("USR_LIVE_HIGH", "/checkout", 0, 0, 20, "payment_form", False), # High intent, just slow
    ("USR_LIVE_IDLE", "/", 0, 0, 60, "hero_banner", True), # Very idle
    ("USR_LIVE_CALM", "/planning", 0, 0, 15, "planning_tool", False), # Healthy
    ("USR_DEMO_KYC1", "/kyc", 0, 0, 5, "pan_upload", True), # Fails KYC upload
    ("USR_DEMO_EXPLORE", "/explore", 0, 0, 10, "nav_menu", False),
    ("USR_DEMO_CHECKOUT2", "/checkout", 0, 0, 30, "cvv_input", True),
    ("USR_DEMO_NEW", "/", 0, 0, 5, "login_btn", False),
]

def run_simulation():
    print("[SIMULATOR] Starting Advanced Live Behavioral Simulation...")
    print(f"Targeting Endpoint: {ENDPOINT}")
    print("Press Ctrl+C to stop.")
    
    # Track current state for each user
    state = {u[0]: {"rage": u[2], "thrash": u[3], "time": u[4], "scroll": random.randint(20, 50)} for u in USERS}
    
    try:
        # Run 10 waves of data
        for wave in range(1, 13):
            print(f"\n--- WAVE {wave}/12 ---")
            
            # Shuffle so events arrive organically
            active_users = random.sample(USERS, k=random.randint(4, 7))
            
            for (sid, page, base_rage, base_thrash, base_time, hes_elem, is_escalating) in active_users:
                s = state[sid]
                
                # Evolve state: time increases
                s["time"] += random.randint(5, 15)
                # Scroll goes deeper
                s["scroll"] = min(100, s["scroll"] + random.randint(0, 15))
                
                # If they are prone to frustration, ramp it up over time
                if is_escalating:
                    if wave > 3:
                        s["thrash"] += random.randint(0, 2)
                    if wave > 6:
                        s["rage"] += random.randint(0, 3)
                        
                # Only add hesitation if they've been there a bit
                hesitations = [{"element_id": hes_elem, "dwell_duration_ms": random.randint(3000, 15000)}] if s["time"] > 30 else []
                
                payload = generate_session(sid, page, s["rage"], s["thrash"], s["time"], hesitations, s["scroll"])
                
                print(f"[SENDING] {sid} | Time: {s['time']}s | Rage: {s['rage']} | Thrash: {s['thrash']}")
                try:
                    res = requests.post(ENDPOINT, json=payload, timeout=2)
                    if res.status_code != 200:
                        print(f"  [!] HTTP {res.status_code}")
                except Exception as e:
                    print(f"  [!] Error: {e}")
                
                # Organic pause between requests
                time.sleep(random.uniform(0.3, 1.2))
                
            print("Waiting for next wave...")
            time.sleep(random.uniform(2.0, 4.0))
            
    except KeyboardInterrupt:
        print("\n[SIMULATOR] Stopped by user.")
        
    print("\n[COMPLETE] Advanced Simulation complete! Check your User Constellation.")

if __name__ == "__main__":
    run_simulation()
