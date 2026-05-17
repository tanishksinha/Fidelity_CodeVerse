# 🏛️ SYNAPTIC: Smart Behavioral Re-Engagement Engine V2
**Architectural Blueprint & Technical Specifications**
*Status: DEPLOYMENT READY (100% Mobile-Native)*

---

## 1. 🌐 SYSTEM OVERVIEW
The Synaptic Behavioral Re-Engagement Engine is an institutional-grade, real-time command center designed to track, analyze, and intercept user hesitation. Moving away from static analytics, this system relies on high-frequency behavioral telemetry (mouse velocity, scroll thrashing, rage taps) to feed a predictive AI pipeline. 

The architecture is divided into three pillars:
1. **The Mobile Ghost SDK**: A zero-dependency telemetry tracker injected into the consumer frontend.
2. **The FastAPI Brain**: A Python-based WebSocket engine that orchestrates AI evaluations and state management.
3. **The War Room**: A dark-mode, mobile-native Next.js dashboard where analysts monitor live constellations of user activity.

---

## 2. 📱 THE GHOST SDK (Mobile-Native Telemetry)
The traditional metric of "Time on Page" is obsolete. The Ghost SDK (`tracker.js`) captures micro-frictions specifically engineered for modern touch devices.

### Key Capabilities
- **Dwell Time Tracking (IntersectionObserver)**: Instead of desktop mouse-hovers, the SDK uses the Intersection API. If an element with the `data-track` attribute remains inside the viewport for >3000ms, it is flagged as a `dwell_duration` hesitation event.
- **Scroll Thrashing (`touchmove`)**: Captures Y-axis directional shifts. If a mobile user reverses their scroll direction 4 times within 1.5 seconds, the SDK logs a `scroll_thrash` signal (indicating anxiety or confusion).
- **Rage Tapping (`touchstart`)**: Tracks tap frequency. 3 consecutive taps within 600ms on the same element triggers a `rage_click` event.
- **Legacy Desktop Friction**: Retains mouse velocity tracking; average speeds > 150 pixels/tick are flagged as erratic.
- **The Mobile Kill-Switch**: The asynchronous payload beacon is strictly bound to the `visibilitychange` event (`document.visibilityState === 'hidden'`), bypassing the unreliable `unload` limits of iOS Safari and Android Chrome.

---

## 3. 🎯 THE 5 CORE FEATURES ("The Shock Factor")

### I. User Constellation (Real-Time Intent Map)
- **Concept**: A live, SVG-based "Star Map" replacing traditional data tables.
- **Implementation**: 
  - Each glowing dot represents a live session connected via WebSockets.
  - **Size**: Proportional to `time_on_site`.
  - **Color**: Mapped to the AI `intent_score` (White $\rightarrow$ Yellow $\rightarrow$ Orange $\rightarrow$ Glowing Red).
  - **Pulse Animation**: Dots emit a green flash whenever a re-engagement nudge is successfully dispatched.
- **Mobile Support**: The canvas utilizes `touch-action: pan-x pan-y` for smooth dragging and panning without triggering browser pull-to-refresh mechanics.

### II. Session Ghost (Live Journey Replay)
- **Concept**: Allows analysts to watch the user's screen journey without the legal/privacy hazards of video recording.
- **Implementation**: 
  - The "Mirror Method": Replays throttled coordinate and scroll data on a mini-iframe of the site.
  - **Privacy Masking**: A critical compliance feature. The system strips and masks (`****`) any input values from sensitive fields (PAN, Passwords, Credit Cards) before the data ever leaves the client.

### III. Explainability Pulse (AI Transparency)
- **Concept**: Financial institutions cannot rely on "Black Box" AI. Every action must be auditable.
- **Implementation**: 
  - When the FastAPI backend triggers an intervention, the LLM generates a **Reasoning Object**.
  - In the Dispatch Queue, a **"Why?"** button expands an `ExplainabilityCard`.
  - It exposes: *Behavioral Evidence* (e.g., "Scroll thrashing on KYC"), *Confidence Level* (94%), and *Tone Rationale* (Why Gemini chose an empathetic vs. urgent tone).

### IV. Butterfly Effect Calculator (Live Revenue Impact)
- **Concept**: Proving direct business ROI through a real-time slot-machine ticker.
- **Implementation**:
  - Located at the top of the War Room.
  - Subscribes to the `conversion_recovered` WebSocket channel.
  - When a "High Risk" user (Score > 80) who was sent a nudge successfully converts, their projected portfolio value is instantly added to the glowing "REVENUE POTENTIAL SAVED" metric.

### V. God Mode (Manual Intervention)
- **Concept**: The perfect harmony between AI automation and human oversight.
- **Implementation**: 
  - Admins can bypass the AI and send custom alerts to specific users.
  - Utilizes Socket.io **Rooms**. The admin UI emits a `manual_nudge` targeted at the user's specific socket ID.
  - **iOS Push Style**: The consumer receives the payload instantly, rendered via Framer Motion as a sleek top-anchored slide-down toast, mimicking a native iOS push alert.

---

## 4. 📐 RESPONSIVE UI/UX ARCHITECTURE
The system is built on a responsive Next.js 14 + Tailwind CSS stack, designed to feel like a native mobile app for on-the-go portfolio managers.

### Admin Dashboard (War Room)
- **Bloomberg-Style Bottom Nav**: The desktop sidebar collapses into a fixed bottom action bar on mobile (`pb-safe`).
- **Bottom Sheet Inspector**: The Intent Inspector (previously a right-rail slide-out) uses Framer Motion to slide up from the bottom as a card (`rounded-t-3xl`), covering the lower 60% of the screen.

### Consumer Site
- **Hamburger Navigation**: Clean, animated overlay menus replace the top header links on mobile.
- **Squash-Proof Charts**: Recharts SIP line graphs are bound to a strict `min-h-[300px]`, preventing them from becoming unreadable on narrow devices.
- **Vertical Stacking**: Pricing/Fund cards automatically shift from CSS Grid to Flex Column stacking on mobile breakpoints.

---

## 5. ⚙️ SIMULATION & DEMO LOOP
To facilitate high-impact presentations without requiring live external traffic, the backend ships with an autonomous simulation engine.

- **Auto-Start**: The `demo_simulation_loop` fires asynchronously during the FastAPI `lifespan` startup.
- **Robust Seeding**: The database pre-loads with a diverse set of behavioral personas (e.g., `USR_ALPHA_99` hesitating on risk, `USR_BETA_22` exhibiting KYC friction).
- **Socket Emitters**: The loop continuously emits `user_activity`, `intervention_sent`, and `conversion_recovered` events, breathing life into the User Constellation and Revenue Ticker the moment the server boots.

---

## 6. 🗄️ DATA MODELS (SQLAlchemy)
The system persists state in a relational database for auditing and machine learning refinement.

**`TelemetrySession` Table:**
- `session_id` (String): Anonymous Ghost ID.
- `page_url` (String): Current active route.
- `total_time_seconds` (Integer): Total session duration.
- `max_scroll_depth_percent` (Integer): Scroll depth tracking.
- `erratic_mouse_movements` (Integer): Aggregated friction signals (scroll thrash, rage clicks).
- `status` (String): `queued` | `analyzing` | `processed` | `abandoned`
- `ai_intent` (String): Semantic classification from Gemini.
- `ai_profile` (Text): The behavioral reasoning logic.
- `dispatch_status` (String): State of the email/nudge dispatch.

---
*Generated by the Synaptic Mobile-Native Architecture Upgrade.*
