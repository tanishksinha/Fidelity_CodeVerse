# Person 2 — Frontend SDK Lead: Complete Technical Guide

**Branch:** `git checkout -b feature/dom-extractor`  
**Your Files:** `frontend/public/tracker.js` and `frontend/public/bookmarklet.js` (create new)

---

## What You Are Building

You own the **Fidelity Behavioral Ghost SDK** — the invisible JavaScript layer that runs on any website and feeds intelligence into the backend. Your work has two distinct modes:

| Mode | Where | How tracker gets in | Who identifies the user |
|---|---|---|---|
| **Fidelity Site Mode** | `localhost:3000` | Auto-loaded via `layout.js` | JWT Login → localStorage |
| **Bookmarklet Mode** | Any foreign website | Judge clicks the bookmarklet | Popup asks for phone + email |

---

## Part 1: Understanding the Current `tracker.js`

The tracker already does the following (do NOT break these):
- ✅ Tracks **scroll depth** (how far down the user scrolls)
- ✅ Tracks **scroll thrashing** (frantic up-down scrolling = confusion)
- ✅ Tracks **hesitation zones** (hovering too long over a form field)
- ✅ Detects **rage clicks** (clicking the same thing 3x in under 2 seconds)
- ✅ Fires an **instant beacon** to the backend when rage click is detected
- ✅ Reads `fidelity_user_phone` and `fidelity_user_email` from `localStorage` and includes them in every beacon

The current session payload (sent to the backend) looks like this:
```json
{
  "session_id": "USR_CHAKRIKA566",
  "user_phone": "+919493940496",
  "user_email": "chakrika566@gmail.com",
  "user_name": "Chakrika",
  "behavioral_telemetry": {
    "total_time_seconds": 45,
    "friction_signals": {
      "rage_clicks": 1,
      "scroll_thrash_count": 2
    },
    "last_rage_element": "GET QUOTE",
    "hesitation_zones": [{"element_id": "pan-field", "dwell_ms": 4200}]
  }
}
```

---

## Part 2: Your Main Task — DOM Extraction

When the bookmarklet is injected on a foreign website (e.g., Zerodha, SBI), our backend has no idea what page the user is on. Your job is to **read the page's HTML structure** and extract a meaningful summary to send with the beacon.

### What to Extract

Add a function called `extractDOMContext()` to `tracker.js`. It should collect:

#### 1. Page Metadata (Easy)
```javascript
const domContext = {
  page_title: document.title,
  page_url: window.location.href,
  // ...
};
```

#### 2. Visible Button Text (Most Important)
Find all buttons and links on the page and collect their text:
```javascript
const buttons = Array.from(document.querySelectorAll('button, a, [role="button"]'))
  .map(el => el.innerText?.trim())
  .filter(text => text && text.length > 1 && text.length < 50)
  .slice(0, 15); // Max 15 buttons
// Example output: ["Login", "Apply Now", "Get Quote", "Calculate EMI", "Submit KYC"]
```

#### 3. Form Fields (Tells us what the page expects from the user)
```javascript
const formFields = Array.from(document.querySelectorAll('input, select, textarea'))
  .map(el => el.placeholder || el.name || el.getAttribute('aria-label') || el.type)
  .filter(Boolean)
  .slice(0, 10);
// Example output: ["PAN Number", "Date of Birth", "Annual Income", "Upload Aadhaar"]
```

#### 4. Heading Text (Tells us the page's purpose)
```javascript
const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
  .map(el => el.innerText?.trim())
  .filter(text => text && text.length < 100)
  .slice(0, 5);
// Example output: ["KYC Verification", "Complete your profile to invest"]
```

### Final Payload Addition
Add `dom_context` to the beacon data:
```javascript
sessionData.dom_context = {
  page_title: document.title,
  page_url: window.location.href,
  headings: headings,
  buttons: buttons,
  form_fields: formFields,
  form_count: document.querySelectorAll('form').length,
  input_count: document.querySelectorAll('input').length
};
```

> [!IMPORTANT]
> Keep the extraction lightweight. Use `.slice()` to cap all arrays. This runs on EVERY page — it must never slow the website down.

---

## Part 3: Identity Collection for Foreign Websites (The Bookmarklet Popup)

### The Logic (Read this carefully)

On the Fidelity site, the login page already stores the user's phone in `localStorage`. The tracker reads it automatically — **no popup needed.**

On a foreign website, `localStorage` may have the phone from a previous bookmarklet session. Check first:

```
localStorage has fidelity_user_phone?
  ├── YES → Use it silently. Don't show popup.
  └── NO  → Show the identity popup once.
               User enters phone + email.
               Save to localStorage.
               Never ask again on ANY site.
```

### The Popup (Vanilla JS — No React!)

This popup must work on ANY website. It cannot use React, Next.js, or any framework. Write it in pure HTML/CSS/JS.

Add this function to `tracker.js` (called only when localStorage is empty):

```javascript
function showIdentityPopup(onSubmit) {
  // Create overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.5); z-index: 2147483647;
    display: flex; align-items: center; justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  `;

  // Create card
  const card = document.createElement('div');
  card.style.cssText = `
    background: white; border-radius: 16px; padding: 28px;
    width: 340px; box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  `;
  card.innerHTML = `
    <div style="text-align:center; margin-bottom:20px;">
      <div style="font-size:28px;">🛡️</div>
      <h2 style="margin:8px 0 4px; font-size:18px; color:#111;">Fidelity AI Advisor</h2>
      <p style="margin:0; font-size:13px; color:#666;">Enter your details to receive personalized alerts</p>
    </div>
    <input id="fid-phone" type="tel" placeholder="WhatsApp Number (e.g. +919...)"
      style="width:100%; box-sizing:border-box; padding:12px; border:1px solid #ddd;
             border-radius:8px; font-size:14px; margin-bottom:10px; outline:none;" />
    <input id="fid-email" type="email" placeholder="Email address"
      style="width:100%; box-sizing:border-box; padding:12px; border:1px solid #ddd;
             border-radius:8px; font-size:14px; margin-bottom:16px; outline:none;" />
    <button id="fid-submit"
      style="width:100%; padding:13px; background:#00b050; color:white; border:none;
             border-radius:8px; font-size:14px; font-weight:bold; cursor:pointer;">
      Activate AI Alerts
    </button>
    <p style="text-align:center; font-size:11px; color:#999; margin:10px 0 0;">
      Powered by Fidelity Behavioral AI
    </p>
  `;

  overlay.appendChild(card);
  document.body.appendChild(overlay);

  document.getElementById('fid-submit').addEventListener('click', () => {
    const phone = document.getElementById('fid-phone').value.trim();
    const email = document.getElementById('fid-email').value.trim();
    if (!phone || !email) { alert('Please enter both phone and email.'); return; }

    // Save to localStorage — never ask again
    localStorage.setItem('fidelity_user_phone', phone);
    localStorage.setItem('fidelity_user_email', email);
    localStorage.setItem('fidelity_user_name', email.split('@')[0]);

    // Update sessionData immediately
    sessionData.user_phone = phone;
    sessionData.user_email = email;
    sessionData.user_name = email.split('@')[0];

    document.body.removeChild(overlay);
    onSubmit(phone, email);
  });
}
```

### When to Call It

At the top of `tracker.js`, after `sessionData` is defined:
```javascript
// Identity Check
if (!sessionData.user_phone) {
  showIdentityPopup((phone, email) => {
    console.log('[Fidelity] Identity captured:', email);
    // Optional: Register with backend
    fetch('https://YOUR_NGROK_URL/api/register-consumer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        consumer_id: sessionData.session_id,
        phone: phone,
        email: email
      })
    });
  });
}
```

---

## Part 4: The Bookmarklet (`bookmarklet.js`)

Create `frontend/public/bookmarklet.js`. This is the one-line script the judge saves as a browser bookmark.

The bookmarklet injects `tracker.js` from YOUR server (running on ngrok) into any page:

```javascript
// bookmarklet.js — this is what gets saved as the bookmark
javascript:(function(){
  // Prevent double-injection
  if(window.__FIDELITY_TRACKER_LOADED__) {
    alert('Fidelity Tracker already active on this page!');
    return;
  }
  window.__FIDELITY_TRACKER_LOADED__ = true;

  // Generate a session ID for this foreign site visit
  if(!localStorage.getItem('fidelity_ghost_id')) {
    localStorage.setItem('fidelity_ghost_id', 'EXT_' + Math.random().toString(36).substring(2,9).toUpperCase());
  }

  // Load tracker.js from the public ngrok URL
  var script = document.createElement('script');
  script.src = 'https://YOUR_NGROK_URL/tracker.js?t=' + Date.now(); // cache-bust
  script.onload = function() {
    console.log('[Fidelity] Behavioral tracker active.');
  };
  document.head.appendChild(script);
})();
```

> [!NOTE]
> Replace `YOUR_NGROK_URL` with the live ngrok URL before the demo. Run `ngrok http 8080` — but note the tracker needs to come from the **frontend** server (port 3000), not the backend. So it should be the ngrok URL for the frontend, or just serve `tracker.js` from the backend too.

### Serving `tracker.js` from the backend (simplest for demo)
Add this to `our_backend/main.py`:
```python
from fastapi.staticfiles import StaticFiles
app.mount("/static", StaticFiles(directory="../frontend/public"), name="static")
```
Then the bookmarklet URL becomes: `https://YOUR_NGROK_URL/static/tracker.js`

---

## Part 5: The Vanilla JS Toast Popup (For Foreign Sites)

On the Fidelity site, the popup is handled by React's `NudgeOverlay` component. But on Zerodha or Amazon, React doesn't exist. You need a vanilla JS popup that `tracker.js` injects when it receives a WebSocket nudge.

Add this to `tracker.js`:

```javascript
function showNudgeToast(message) {
  // Remove any existing toast
  const existing = document.getElementById('fidelity-nudge-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'fidelity-nudge-toast';
  toast.style.cssText = `
    position: fixed; bottom: 24px; right: 24px; z-index: 2147483646;
    background: linear-gradient(135deg, #003b1e, #00b050);
    color: white; border-radius: 16px; padding: 18px 22px;
    max-width: 340px; box-shadow: 0 8px 32px rgba(0,80,30,0.4);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    animation: fid-slide-in 0.4s ease;
    cursor: pointer;
  `;
  toast.innerHTML = `
    <style>
      @keyframes fid-slide-in {
        from { transform: translateX(120%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    </style>
    <div style="display:flex; align-items:flex-start; gap:12px;">
      <span style="font-size:22px;">🛡️</span>
      <div>
        <div style="font-size:11px; font-weight:700; letter-spacing:0.1em; opacity:0.8; margin-bottom:4px;">FIDELITY AI ADVISOR</div>
        <div style="font-size:14px; line-height:1.5;">${message}</div>
        <div style="font-size:11px; opacity:0.7; margin-top:8px;">Tap to connect with an advisor →</div>
      </div>
    </div>
  `;

  // Auto-dismiss after 8 seconds
  document.body.appendChild(toast);
  setTimeout(() => { if (toast.parentNode) toast.remove(); }, 8000);
  toast.addEventListener('click', () => toast.remove());
}
```

Then hook it into the Socket.io connection in `tracker.js`:
```javascript
// This listens for the AI nudge from the backend
socket.on('receive_nudge', (data) => {
  showNudgeToast(data.message);
});
```

---

## Part 6: Summary of All Files to Create/Modify

| File | Action | What to add |
|---|---|---|
| `frontend/public/tracker.js` | **Modify** | `extractDOMContext()`, identity check + popup, `showNudgeToast()`, Socket.io listener |
| `frontend/public/bookmarklet.js` | **Create NEW** | The one-liner bookmarklet injection script |

---

## Part 7: How to Test Your Work

### Test 1: Fidelity Site (no popup should appear)
1. Log in at `localhost:3000/login`
2. Browse to any page
3. Rage click a button 2-3 times
4. ✅ Popup should appear WITHOUT asking for phone (phone came from login)

### Test 2: Foreign Website (popup should appear once)
1. Clear localStorage: DevTools → Application → LocalStorage → Clear All
2. Go to `google.com`
3. Click your bookmarklet
4. ✅ Identity popup should appear asking for phone + email
5. Enter details, submit
6. Go to `amazon.in`, click bookmarklet again
7. ✅ NO popup (already stored in localStorage from Step 4)

### Test 3: Toast on Foreign Website
1. After bookmarklet is injected on a foreign site
2. Rage click any button 3 times
3. ✅ Green toast should slide in from the bottom-right corner

---

> [!IMPORTANT]
> **The golden rule: Never touch these files — they belong to other team members:**
> - `our_backend/main.py` → Person 4
> - `our_backend/brain.py` → Person 1
> - `our_backend/notifications.py` → Person 1
> - `our_backend/processor.py` → Person 3
> - Any file in `frontend/app/` → Discuss with the team first
