# 🚀 Synaptic Behavioral AI: Ultimate Setup Guide

This guide is designed for an absolute beginner. By following these steps exactly, you will configure the **entire** Synaptic Behavioral AI system on your computer—including the real-time observer, the live Chatbot, the Twilio WhatsApp escalation, the Supabase database, and the Cross-Website Bookmarklet. 

You will experience everything this program can do.

---

## 🛠️ Step 1: Install Core Software

Before downloading the code, your computer needs the core engines to run it. Install these four free tools:

1. **Git:** Download and install from [git-scm.com](https://git-scm.com/). Leave all installation settings on default.
2. **Node.js:** Download the "LTS" (Long Term Support) version from [nodejs.org](https://nodejs.org/). This runs the frontend website.
3. **Python (version 3.10+):** Download from [python.org](https://www.python.org/downloads/). 
   - ⚠️ **CRITICAL FOR WINDOWS:** During installation, check the box that says **"Add Python to PATH"** at the very bottom of the first screen before clicking Install.
4. **Ngrok:** Download from [ngrok.com](https://ngrok.com/). This is a tiny tool that exposes your local Python server to the public internet. This is strictly required for the Twilio WhatsApp integration and the Bookmarklet tracker to work.

*To verify they installed correctly, open your computer's Terminal (or Command Prompt on Windows) and type:*
```bash
node -v
python --version
ngrok -v
```
*(You should see version numbers print out, not errors).*

---

## 📥 Step 2: Get the Code

1. Open your Terminal or Command Prompt.
2. Navigate to your desktop (or wherever you want the folder):
   ```bash
   cd Desktop
   ```
3. Clone the repository:
   ```bash
   git clone https://github.com/tanishksinha/Fidelity_CodeVerse.git
   ```
4. Enter the project folder:
   ```bash
   cd Fidelity_CodeVerse
   ```

---

## 🌐 Step 3: Establish the Ngrok Bridge

Before starting the servers, we need to create a public URL so that Twilio (WhatsApp) and foreign websites can talk to your computer.

1. Open a new Terminal window.
2. Run the following command to expose port 8080 (which is where our Python backend will run):
   ```bash
   ngrok http 8080
   ```
3. Ngrok will display a screen with a **Forwarding URL** that looks something like this: `https://1a2b-3c4d.ngrok.app`. 
4. **Copy this URL.** Do not close this terminal window! Leave it running in the background.

---

## 🖥️ Step 4: Set Up the Backend (Python Engine)

The backend is the "Brain". It runs the Machine Learning logic, connects to the AI models, talks to the database, and sends WhatsApp messages.

1. Open a **new Terminal window** and navigate to the backend folder:
   ```bash
   cd path/to/Fidelity_CodeVerse/our_backend
   ```
2. **Create a Virtual Environment:** 
   - On Windows: `python -m venv venv`
   - On Mac/Linux: `python3 -m venv venv`
3. **Activate the Environment:**
   - On Windows: `venv\Scripts\activate`
   - On Mac/Linux: `source venv/bin/activate`
   *(You should see `(venv)` appear at the start of your terminal line).*
4. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
5. **Create the Configuration File:**
   In the `our_backend` folder, create a new file named exactly `.env` (the period at the front is required). Open it in a text editor (like Notepad or VS Code) and paste the following keys:
   ```env
   # Database (Supabase)
   SUPABASE_URL="https://jpmsyluhvgduedquhnml.supabase.co"
   SUPABASE_KEY="YOUR_SUPABASE_KEY" 
   
   # AI Models
   GOOGLE_API_KEY="YOUR_GEMINI_KEY"
   GROQ_API_KEY="YOUR_GROQ_KEY"
   
   # Notifications (Required for the Full Demo)
   SENDGRID_API_KEY="YOUR_SENDGRID_KEY"
   TWILIO_ACCOUNT_SID="YOUR_TWILIO_SID"
   TWILIO_AUTH_TOKEN="YOUR_TWILIO_TOKEN"
   TWILIO_WHATSAPP_NUMBER="whatsapp:+14155238886"
   ```
   *(Note: You must replace `YOUR_..._KEY` with the actual secret keys provided by your team).*

6. **Start the Backend Server:**
   ```bash
   python main.py
   ```
   *If successful, you will see a message saying "Uvicorn running on http://0.0.0.0:8080". Keep this terminal open!*

---

## 💻 Step 5: Set Up the Frontend (The Website)

The frontend contains both the Consumer Website (where users struggle) and the Admin Dashboard (the "War Room").

1. Open a **new Terminal window**.
2. Navigate to the frontend folder:
   ```bash
   cd path/to/Fidelity_CodeVerse/frontend
   ```
3. **Install Dependencies:**
   ```bash
   npm install
   ```
4. **Create the Configuration File:**
   In the `frontend` folder, create a new file named exactly `.env.local`. Paste this single line inside, using the Ngrok URL you copied in Step 3:
   ```env
   NEXT_PUBLIC_BACKEND_URL=https://1a2b-3c4d.ngrok.app
   ```
   *(Make sure to use YOUR specific Ngrok URL, not the example one).*

5. **Start the Frontend Server:**
   ```bash
   npm run dev
   ```
   *Keep this terminal open!*

---

## 📱 Step 6: Connect Twilio WhatsApp (The Final Step)

To allow the system to send automated WhatsApp messages when a user abandons the site:
1. Log in to your Twilio Console.
2. Go to Messaging > Try it out > Send a WhatsApp message (or your Sandbox settings).
3. Find the setting for **"When a message comes in"** (Webhook).
4. Paste your Ngrok URL followed by `/api/whatsapp-reply`. 
   - *Example:* `https://1a2b-3c4d.ngrok.app/api/whatsapp-reply`
5. Save the configuration.

---

## 🚀 Step 7: How to Experience the Full Demo

You now have all engines running. Let's experience the full power of the platform.

### Feature 1: The Real-Time Nudge & Live Chatbot
1. Open your web browser and go to: **[http://localhost:3000/kyc](http://localhost:3000/kyc)**
2. Try scrolling up and down very fast ("Scroll Thrashing").
3. Click the **"Submit ID"** or **"Upload"** button 4 to 5 times rapidly.
4. A custom, AI-generated toast notification will slide in.
5. Click **"Chat with AI"**. Ask a question like *"Why isn't this button working?"*. The AI will use the injected Knowledge Base and behavior context to give you a perfect answer.

### Feature 2: The Asynchronous WhatsApp Cascade
1. Refresh the `/kyc` page.
2. Trigger the rage click again so the toast appears.
3. **Do not click anything.** Leave the browser window completely idle for 60 seconds.
4. The system will detect you are "DISENGAGING". Check your phone—you will receive a highly personalized WhatsApp message from the Twilio bot attempting to recover the session!

### Feature 3: The War Room Dashboard
1. Open a new tab and go to: **[http://localhost:3000/admin](http://localhost:3000/admin)**
2. You will see your exact sessions captured live. Look at the Intent Inspector to see how the AI classified your rage clicks and calculated your churn probability.

### Feature 4: The Cross-Website Tracker (Tampermonkey)
To track users across the internet (e.g., on Amazon or a competitor's site), we inject our script into their website. The best way to do this for a demo is using **Tampermonkey** (a browser extension that runs scripts automatically).

1. Install the [Tampermonkey extension](https://www.tampermonkey.net/) for Chrome/Edge.
2. Click the Tampermonkey icon > **Create a new script...**
3. Delete whatever is there and paste this code (replace `YOUR_NGROK_URL` with your actual Ngrok URL):
   ```javascript
   // ==UserScript==
   // @name         Synaptic Ghost SDK (Full Behavioral Tracker)
   // @namespace    http://tampermonkey.net/
   // @version      5.0
   // @description  Full behavioral tracking — detects all 7 user profiles (BLOCKED, CONFUSED, HESITANT, EXPLORING, etc.) and sends live telemetry to Synaptic AI
   // @author       Synaptic Team
   // @match        *://*/*
   // @grant        GM_xmlhttpRequest
   // @run-at       document-end
   // ==/UserScript==
   (function () {
       'use strict';
       
       // REPLACE THIS WITH YOUR NGROK URL
       const NGROK_URL = 'https://YOUR_NGROK_URL.ngrok.app';
       const COOLDOWN_MS = 30000; // 30 seconds between triggers
       
       // ─── Skip own site ───────────────────────────────────────────────────────
       if (window.location.hostname === 'localhost' || window.location.hostname.includes('synaptic')) return;
       console.log('🛡️ SYNAPTIC GHOST SDK v5.0 — Full Behavioral Tracker Active on:', window.location.hostname);
       
       // ─── Session State ────────────────────────────────────────────────────────
       const SESSION_START = Date.now();
       let lastTriggerTime = 0;
       
       // Rage clicks
       let clickCount = 0;
       let lastClickTime = 0;
       let lastRageElement = '';
       let totalRageClicks = 0;
       
       // Scroll thrash
       let lastScrollY = window.scrollY;
       let lastScrollTime = Date.now();
       let scrollDirectionChanges = 0;
       let lastScrollDirection = null;
       let maxScrollDepth = 0;
       
       // Hesitation zones (hovering 1.5s+ on same element)
       let hoverTimer = null;
       let hoverStart = 0;
       let currentHoverEl = null;
       const hesitationZones = []; // [{ element_id, duration_ms }]
       
       // ─── DOM Context ──────────────────────────────────────────────────────────
       function extractDOMContext() {
           const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4,[role="heading"]'))
               .map(h => h.innerText.trim())
               .filter(t => t.length > 5 && t.length < 120)
               .slice(0, 6);
           return { page_title: document.title, headings };
       }
       
       // ─── Toast UI ─────────────────────────────────────────────────────────────
       function showNudgeToast(msg, profile) {
           const existing = document.getElementById('synaptic-toast');
           if (existing) existing.remove();
           const profileColors = {
               BLOCKED: '#c0392b', STRUGGLING: '#e67e22', CONFUSED: '#8e44ad',
               HESITANT: '#2980b9', DISENGAGING: '#7f8c8d', EXPLORING: '#27ae60', HIGH_INTENT: '#00b050'
           };
           const accentColor = profileColors[profile] || '#00b050';
           const style = document.createElement('style');
           style.id = 'synaptic-toast-styles';
           style.innerHTML = `
               @keyframes synaptic-slide { from { transform:translateY(100%) scale(0.8); opacity:0; } to { transform:translateY(0) scale(1); opacity:1; } }
               @keyframes synaptic-pulse { 0%,100% { opacity:1; } 50% { opacity:0.6; } }
           `;
           if (!document.getElementById('synaptic-toast-styles')) document.head.appendChild(style);
           const t = document.createElement('div');
           t.id = 'synaptic-toast';
           t.style.cssText = `
               position:fixed; bottom:30px; right:30px;
               background:linear-gradient(135deg,#071a0e,#0d2e18);
               color:#fff; padding:20px 22px; border-radius:16px; z-index:2147483647;
               box-shadow:0 15px 40px rgba(0,0,0,0.4); font-family:sans-serif;
               max-width:320px; line-height:1.6; cursor:pointer;
               border-top:3px solid ${accentColor};
               animation:synaptic-slide 0.5s cubic-bezier(0.175,0.885,0.32,1.275);
           `;
           t.innerHTML = `
               <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                   <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${accentColor}" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                   <span style="font-size:10px;font-weight:700;letter-spacing:0.12em;color:${accentColor};text-transform:uppercase;">SYNAPTIC AI ADVISOR</span>
                   <span style="margin-left:auto;font-size:9px;background:${accentColor}22;color:${accentColor};padding:2px 8px;border-radius:10px;font-weight:600;">${profile}</span>
               </div>
               <div style="font-size:14px;font-weight:500;color:#f0f0f0;">${msg}</div>
           `;
           document.body.appendChild(t);
           setTimeout(() => { if (t.parentNode) t.remove(); }, 10000);
           t.onclick = () => t.remove();
       }
       
       // ─── Fire to Backend ──────────────────────────────────────────────────────
       function fireToBackend(trigger) {
           const now = Date.now();
           if (now - lastTriggerTime < COOLDOWN_MS) {
               console.log('[Synaptic] Cooldown active — skipping trigger.');
               return;
           }
           lastTriggerTime = now;
           const totalTimeSec = Math.round((now - SESSION_START) / 1000);
           const scrollDepthPct = Math.round((maxScrollDepth / (document.body.scrollHeight - window.innerHeight || 1)) * 100);
           const payload = {
               session_id: 'ext_' + (localStorage.getItem('synaptic_ghost_id') || Math.random().toString(36).substr(2, 9)),
               page_url: window.location.href,
               dom_context: extractDOMContext(),
               behavioral_telemetry: {
                   total_time_seconds: totalTimeSec,
                   max_scroll_depth_percent: Math.min(scrollDepthPct, 100),
                   friction_signals: {
                       rage_clicks: totalRageClicks,
                       scroll_thrash_count: scrollDirectionChanges,
                       erratic_mouse_movements: Math.floor(scrollDirectionChanges * 1.2),
                   },
                   hesitation_zones: hesitationZones.slice(-5),
                   last_rage_element: lastRageElement,
                   exit_condition: trigger,
               }
           };
           console.log('[Synaptic] Firing telemetry | Trigger:', trigger, '| RageClicks:', totalRageClicks, '| ScrollThrash:', scrollDirectionChanges, '| Hesitations:', hesitationZones.length);
           GM_xmlhttpRequest({
               method: 'POST',
               url: NGROK_URL + '/api/ingest-telemetry-sync',
               data: JSON.stringify(payload),
               headers: { 'Content-Type': 'application/json' },
               onload: function (response) {
                   try {
                       const res = JSON.parse(response.responseText);
                       if (res.status === 'success') {
                           const profile = res.intensity ? res.intensity.toUpperCase() : 'ADVISOR';
                           showNudgeToast(res.nudge, profile);
                           console.log('[Synaptic] Nudge shown. Profile:', res.intensity);
                       } else {
                           console.log('[Synaptic] Backend returned ignored — churn threshold not met.');
                       }
                   } catch (e) {
                       console.error('[Synaptic] Failed to parse response:', e);
                   }
               },
               onerror: function () {
                   console.error('[Synaptic] Request failed. Check ngrok URL and permissions.');
               }
           });
       }
       
       // ─── Signal 1: Rage Clicks ────────────────────────────────────────────────
       document.addEventListener('mousedown', function (e) {
           const now = Date.now();
           if (now - lastClickTime < 600) {
               clickCount++;
           } else {
               clickCount = 1;
           }
           lastClickTime = now;
           if (clickCount >= 3) {
               totalRageClicks += clickCount;
               lastRageElement = (e.target.innerText || e.target.getAttribute('aria-label') || e.target.tagName || '').toString().substring(0, 40).trim();
               console.log('💢 Rage Click — element:', lastRageElement, '| total rage clicks:', totalRageClicks);
               clickCount = 0;
               fireToBackend('rage_click');
           }
       });
       
       // ─── Signal 2: Scroll Thrash ──────────────────────────────────────────────
       window.addEventListener('scroll', function () {
           const now = Date.now();
           const currentY = window.scrollY;
           const direction = currentY > lastScrollY ? 'down' : 'up';
           if (currentY + window.innerHeight > maxScrollDepth) {
               maxScrollDepth = currentY + window.innerHeight;
           }
           if (direction !== lastScrollDirection && now - lastScrollTime < 1000) {
               scrollDirectionChanges++;
               console.log('[Synaptic] Scroll thrash count:', scrollDirectionChanges);
               if (scrollDirectionChanges >= 5 && scrollDirectionChanges % 5 === 0) {
                   fireToBackend('scroll_thrash');
               }
           }
           lastScrollDirection = direction;
           lastScrollY = currentY;
           lastScrollTime = now;
       }, { passive: true });
       
       // ─── Signal 3: Hesitation Zones (Hover 1.5s on same element) ─────────────
       document.addEventListener('mousemove', function (e) {
           const el = e.target;
           if (!el || ['HTML', 'BODY', 'SCRIPT', 'STYLE'].includes(el.tagName)) return;
           if (el !== currentHoverEl) {
               if (currentHoverEl && hoverStart > 0) {
                   const duration = Date.now() - hoverStart;
                   if (duration >= 1500) {
                       const elLabel = (currentHoverEl.innerText || currentHoverEl.getAttribute('aria-label') || currentHoverEl.tagName || '').toString().substring(0, 40).trim();
                       hesitationZones.push({ element_id: elLabel, duration_ms: duration });
                       console.log('[Synaptic] Hesitation zone:', elLabel, '(' + Math.round(duration / 1000) + 's)');
                   }
               }
               currentHoverEl = el;
               hoverStart = Date.now();
           }
       }, { passive: true });
       
       // ─── Signal 4: Exit Intent (mouse leaving top of viewport) ───────────────
       document.addEventListener('mouseleave', function (e) {
           if (e.clientY <= 0) {
               console.log('[Synaptic] Exit intent detected');
               fireToBackend('exit_intent');
           }
       });
       
       // ─── Signal 5: Idle / Disengaging (60s with no activity) ─────────────────
       let idleTimer = null;
       function resetIdle() {
           clearTimeout(idleTimer);
           idleTimer = setTimeout(() => {
               console.log('[Synaptic] User idle for 60s — potential disengagement');
               fireToBackend('idle_timeout');
           }, 60000);
       }
       ['mousemove', 'keydown', 'scroll', 'click'].forEach(evt =>
           window.addEventListener(evt, resetIdle, { passive: true })
       );
       resetIdle();
       
       // ─── Signal 6: Long Session (Hesitant profile — 90s+ on page) ────────────
       setTimeout(() => {
           if (totalRageClicks === 0 && scrollDirectionChanges <= 1) {
               console.log('[Synaptic] Long dwell time with low activity — possible HESITANT user');
               fireToBackend('long_dwell');
           }
       }, 90000);
       
       // ─── Persist Ghost ID ─────────────────────────────────────────────────────
       if (!localStorage.getItem('synaptic_ghost_id')) {
           localStorage.setItem('synaptic_ghost_id', 'EXT_' + Math.random().toString(36).substring(2, 9).toUpperCase());
       }
   })();
   ```
4. Save the script (Ctrl+S / Cmd+S).
5. Now, go to a completely different website (like `amazon.in` or a banking site).
6. Rage click any button on their website 3 times. 
7. The Synaptic Nudge Toast will automatically slide in on *their* website, demonstrating our ability to track friction and intercept leads anywhere on the internet!

*(Note: If you don't want to use Tampermonkey, you can achieve the exact same thing by pasting the javascript logic into a browser Bookmark instead).*
