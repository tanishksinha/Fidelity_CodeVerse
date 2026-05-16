/**
 * FIDELITY BEHAVIORAL GHOST SDK v3.0 (Mobile-Native + Bookmarklet)
 * Zero-dependency, non-blocking telemetry engine.
 * Captures micro-hesitations, scroll thrashing, rage taps, and DOM context.
 * Supports both Fidelity Site Mode and Bookmarklet Mode (foreign sites).
 */

(function () {
  'use strict';

  // Prevent double-injection (critical for bookmarklet mode)
  if (window.__FIDELITY_TRACKER_LOADED__) return;
  window.__FIDELITY_TRACKER_LOADED__ = true;

  // --- 1. CONFIGURATION & STATE ---
  const CONFIG = {
    ENDPOINT: 'https://audacious-exodus-spiny.ngrok-free.dev/api/ingest-telemetry',
    SOCKET_URL: 'https://audacious-exodus-spiny.ngrok-free.dev',
    DWELL_THRESHOLD_MS: 3000,
    RAGE_TAP_THRESHOLD_MS: 600,
    SCROLL_THRASH_TIME_MS: 1500,
    DEBUG: true
  };

  const sessionData = {
    session_id: localStorage.getItem('fidelity_ghost_id') || 'usr_' + Math.random().toString(36).substring(2, 11),
    timestamp: new Date().toISOString(),
    page_url: window.location.pathname,
    // Send contact info from login directly — no DB lookup needed on backend
    user_phone: localStorage.getItem('fidelity_user_phone') || null,
    user_email: localStorage.getItem('fidelity_user_email') || null,
    user_name: localStorage.getItem('fidelity_user_name') || null,
    behavioral_telemetry: {
      total_time_seconds: 0,
      max_scroll_depth_percent: 0,
      hesitation_zones: [], // populated via dwell time
      friction_signals: {
        erratic_mouse_movements: 0, // legacy/desktop
        scroll_thrash_count: 0,     // mobile
        rage_clicks: 0,             // mobile
        highlighted_text: null
      },
      last_rage_element: null,
      exit_condition: null,
      exit_velocity: "normal"
    }
  };

  // Persist ghost ID if newly generated
  if (!localStorage.getItem('fidelity_ghost_id')) {
    localStorage.setItem('fidelity_ghost_id', sessionData.session_id);
  }

  let entryTime = Date.now();

  if (CONFIG.DEBUG) console.log("🟢 Ghost SDK v3 Initialized on: " + sessionData.page_url);


  // =====================================================================
  // --- 2. DOM CONTEXT EXTRACTION (Person 2 Feature) ---
  // Reads the page's HTML structure and extracts a meaningful summary
  // so the backend AI knows what the user is looking at, even on foreign sites.
  // =====================================================================
  function extractDOMContext() {
    // 1. Visible button/link text (most important — tells us what actions exist)
    const buttons = Array.from(document.querySelectorAll('button, a, [role="button"]'))
      .map(el => el.innerText?.trim())
      .filter(text => text && text.length > 1 && text.length < 50)
      .slice(0, 15);

    // 2. Form fields (tells us what the page expects from the user)
    const formFields = Array.from(document.querySelectorAll('input, select, textarea'))
      .map(el => el.placeholder || el.name || el.getAttribute('aria-label') || el.type)
      .filter(Boolean)
      .slice(0, 10);

    // 3. Heading text (tells us the page's purpose)
    const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
      .map(el => el.innerText?.trim())
      .filter(text => text && text.length < 100)
      .slice(0, 5);

    return {
      page_title: document.title,
      page_url: window.location.href,
      headings: headings,
      buttons: buttons,
      form_fields: formFields,
      form_count: document.querySelectorAll('form').length,
      input_count: document.querySelectorAll('input').length
    };
  }


  // =====================================================================
  // --- 3. IDENTITY POPUP FOR FOREIGN WEBSITES (Person 2 Feature) ---
  // On the Fidelity site, login already populates localStorage. No popup needed.
  // On foreign sites (bookmarklet), this collects phone + email once.
  // =====================================================================
  function showIdentityPopup(onSubmit) {
    const overlay = document.createElement('div');
    overlay.id = 'fidelity-identity-overlay';
    overlay.style.cssText = [
      'position:fixed', 'top:0', 'left:0', 'width:100%', 'height:100%',
      'background:rgba(0,0,0,0.5)', 'z-index:2147483647',
      'display:flex', 'align-items:center', 'justify-content:center',
      "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"
    ].join(';');

    const card = document.createElement('div');
    card.style.cssText = [
      'background:white', 'border-radius:16px', 'padding:28px',
      'width:340px', 'box-shadow:0 20px 60px rgba(0,0,0,0.3)'
    ].join(';');

    card.innerHTML = [
      '<div style="text-align:center;margin-bottom:20px;">',
      '<div style="font-size:28px;">\u{1F6E1}\uFE0F</div>',
      '<h2 style="margin:8px 0 4px;font-size:18px;color:#111;">Fidelity AI Advisor</h2>',
      '<p style="margin:0;font-size:13px;color:#666;">Enter your details to receive personalized alerts</p>',
      '</div>',
      '<input id="fid-phone" type="tel" placeholder="WhatsApp Number (e.g. +919...)" ',
      'style="width:100%;box-sizing:border-box;padding:12px;border:1px solid #ddd;',
      'border-radius:8px;font-size:14px;margin-bottom:10px;outline:none;" />',
      '<input id="fid-email" type="email" placeholder="Email address" ',
      'style="width:100%;box-sizing:border-box;padding:12px;border:1px solid #ddd;',
      'border-radius:8px;font-size:14px;margin-bottom:16px;outline:none;" />',
      '<button id="fid-submit" ',
      'style="width:100%;padding:13px;background:#00b050;color:white;border:none;',
      'border-radius:8px;font-size:14px;font-weight:bold;cursor:pointer;">',
      'Activate AI Alerts',
      '</button>',
      '<p style="text-align:center;font-size:11px;color:#999;margin:10px 0 0;">',
      'Powered by Fidelity Behavioral AI',
      '</p>'
    ].join('');

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    document.getElementById('fid-submit').addEventListener('click', function () {
      var phone = document.getElementById('fid-phone').value.trim();
      var email = document.getElementById('fid-email').value.trim();
      if (!phone || !email) { alert('Please enter both phone and email.'); return; }

      // Save to localStorage — never ask again on any site
      localStorage.setItem('fidelity_user_phone', phone);
      localStorage.setItem('fidelity_user_email', email);
      localStorage.setItem('fidelity_user_name', email.split('@')[0]);

      // Update sessionData immediately
      sessionData.user_phone = phone;
      sessionData.user_email = email;
      sessionData.user_name = email.split('@')[0];

      document.body.removeChild(overlay);
      if (CONFIG.DEBUG) console.log('[Fidelity] Identity captured:', email);
      onSubmit(phone, email);
    });
  }

  // Identity check: only show popup if no phone is stored (foreign site, first visit)
  if (!sessionData.user_phone) {
    showIdentityPopup(function (phone, email) {
      // Optional: register with backend
      try {
        fetch(CONFIG.ENDPOINT.replace('/ingest-telemetry', '/auth/register-consumer'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            consumer_id: sessionData.session_id,
            phone: phone,
            email: email
          })
        }).catch(function () { /* silent fail — backend may not have this endpoint yet */ });
      } catch (e) { /* ignore */ }
    });
  }


  // =====================================================================
  // --- 4. VANILLA JS NUDGE TOAST (Person 2 Feature) ---
  // On the Fidelity site, React's NudgeOverlay handles this.
  // On foreign sites (bookmarklet), this vanilla toast takes over.
  // =====================================================================
  function showNudgeToast(message) {
    // Remove any existing toast
    var existing = document.getElementById('fidelity-nudge-toast');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.id = 'fidelity-nudge-toast';
    toast.style.cssText = [
      'position:fixed', 'bottom:24px', 'right:24px', 'z-index:2147483646',
      'background:linear-gradient(135deg,#003b1e,#00b050)',
      'color:white', 'border-radius:16px', 'padding:18px 22px',
      'max-width:340px', 'box-shadow:0 8px 32px rgba(0,80,30,0.4)',
      "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      'animation:fid-slide-in 0.4s ease', 'cursor:pointer'
    ].join(';');

    // Inject keyframes if not already present
    if (!document.getElementById('fidelity-toast-styles')) {
      var styleEl = document.createElement('style');
      styleEl.id = 'fidelity-toast-styles';
      styleEl.textContent = '@keyframes fid-slide-in{from{transform:translateX(120%);opacity:0}to{transform:translateX(0);opacity:1}}';
      document.head.appendChild(styleEl);
    }

    toast.innerHTML = [
      '<div style="display:flex;align-items:flex-start;gap:12px;">',
      '<span style="font-size:22px;">\u{1F6E1}\uFE0F</span>',
      '<div>',
      '<div style="font-size:11px;font-weight:700;letter-spacing:0.1em;opacity:0.8;margin-bottom:4px;">FIDELITY AI ADVISOR</div>',
      '<div style="font-size:14px;line-height:1.5;">' + message + '</div>',
      '<div style="font-size:11px;opacity:0.7;margin-top:8px;">Tap to connect with an advisor \u2192</div>',
      '</div>',
      '</div>'
    ].join('');

    document.body.appendChild(toast);

    // Auto-dismiss after 8 seconds
    setTimeout(function () { if (toast.parentNode) toast.remove(); }, 8000);
    toast.addEventListener('click', function () { toast.remove(); });

    if (CONFIG.DEBUG) console.log('[Fidelity] Nudge toast displayed:', message);
  }


  // =====================================================================
  // --- 5. SCROLL DEPTH TRACKER (Throttled) ---
  // =====================================================================
  var scrollTimeout;
  window.addEventListener('scroll', function () {
    if (scrollTimeout) return;
    scrollTimeout = setTimeout(function () {
      var scrollTop = window.scrollY || document.documentElement.scrollTop;
      var docHeight = document.documentElement.scrollHeight;
      var winHeight = window.innerHeight;
      var scrollPercent = Math.round((scrollTop / (docHeight - winHeight)) * 100);

      if (scrollPercent > sessionData.behavioral_telemetry.max_scroll_depth_percent) {
        sessionData.behavioral_telemetry.max_scroll_depth_percent = scrollPercent;
      }
      scrollTimeout = null;
    }, 200);
  }, { passive: true });


  // =====================================================================
  // --- 6. DWELL TIME TRACKING (Replacing Hover) ---
  // =====================================================================
  var dwellTimers = {};

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      var elementId = entry.target.getAttribute('data-track');
      if (!elementId) return;

      if (entry.isIntersecting) {
        if (!dwellTimers[elementId]) {
          dwellTimers[elementId] = { start: Date.now() };
        }
      } else {
        if (dwellTimers[elementId]) {
          var duration = Date.now() - dwellTimers[elementId].start;
          delete dwellTimers[elementId];

          if (duration >= CONFIG.DWELL_THRESHOLD_MS) {
            sessionData.behavioral_telemetry.hesitation_zones.push({
              element_id: elementId,
              dwell_duration_ms: duration
            });
            if (CONFIG.DEBUG) console.log('\u26A0\uFE0F Dwell time logged: ' + elementId + ' (' + duration + 'ms)');
          }
        }
      }
    });
  }, { threshold: 0.5 });

  // Observe all trackable elements
  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll('[data-track]').forEach(function (el) { observer.observe(el); });
  });
  // Also observe dynamically added elements (simplified polling for demo)
  setInterval(function () {
    document.querySelectorAll('[data-track]:not(.ghost-observed)').forEach(function (el) {
      el.classList.add('ghost-observed');
      observer.observe(el);
    });
  }, 2000);


  // =====================================================================
  // --- 7. MOBILE FRICTION: SCROLL THRASHING ---
  // =====================================================================
  var lastTouchY = 0;
  var scrollDirections = [];
  var currentDirection = null;

  document.addEventListener('touchmove', function (e) {
    var currentY = e.touches[0].clientY;
    if (lastTouchY === 0) { lastTouchY = currentY; return; }

    var newDirection = currentY > lastTouchY ? 'down' : 'up';

    if (currentDirection !== newDirection) {
      currentDirection = newDirection;
      scrollDirections.push({ dir: newDirection, time: Date.now() });

      // Clean up old events
      scrollDirections = scrollDirections.filter(function (d) { return Date.now() - d.time < CONFIG.SCROLL_THRASH_TIME_MS; });

      if (scrollDirections.length >= 4) {
        sessionData.behavioral_telemetry.friction_signals.scroll_thrash_count += 1;
        if (CONFIG.DEBUG) console.log("\uD83C\uDF00 Scroll Thrashing Detected!");
        scrollDirections = [];
      }
    }
    lastTouchY = currentY;
  }, { passive: true });

  document.addEventListener('touchend', function () { lastTouchY = 0; });


  // =====================================================================
  // --- 8. HYBRID FRICTION: RAGE TAPPING (Supports Touch & Mouse) ---
  // =====================================================================
  var tapHistory = {};

  var handleRageEvent = function (e) {
    // Walk up the DOM: check the clicked element AND its closest data-track parent
    var trackedParent = e.target.closest('[data-track]');
    var target = e.target;

    // Use button text if it's a button, otherwise use data-track of parent card
    var elementText = target.innerText ? target.innerText.trim().substring(0, 30) : null;
    var dataTrack = target.getAttribute('data-track') || (trackedParent && trackedParent.getAttribute('data-track'));
    var elementKey = dataTrack || elementText || target.id || target.tagName;

    if (!tapHistory[elementKey]) tapHistory[elementKey] = [];

    var now = Date.now();
    tapHistory[elementKey].push(now);

    // Extended window: 2 seconds (catches modal-opening button rage)
    tapHistory[elementKey] = tapHistory[elementKey].filter(function (time) { return now - time < 2000; });

    // Trigger on 2 clicks for high-intent buttons, 3 for everything else
    var lowerText = (elementText || '').toLowerCase();
    var threshold = (lowerText.indexOf('quote') !== -1 || lowerText.indexOf('apply') !== -1 || lowerText.indexOf('submit') !== -1 || lowerText.indexOf('buy') !== -1) ? 2 : 3;

    if (tapHistory[elementKey].length >= threshold) {
      sessionData.behavioral_telemetry.friction_signals.rage_clicks += 1;
      if (CONFIG.DEBUG) console.log('\uD83D\uDCA2 Rage Click Detected on: ' + elementKey + ' (' + tapHistory[elementKey].length + ' clicks)');
      tapHistory[elementKey] = [];

      // Save the specific element that caused the rage
      sessionData.behavioral_telemetry.last_rage_element = elementKey;

      // LIVE TRIGGER: Send to backend immediately so the popup shows up NOW!
      fireBeacon('live_rage_click');
    }
  };

  document.addEventListener('touchstart', handleRageEvent, { passive: true });
  document.addEventListener('mousedown', handleRageEvent, { passive: true });


  // =====================================================================
  // --- 9. LEGACY DESKTOP FRICTION (Kept for hybrid fallback) ---
  // =====================================================================
  var lastMouseY = 0;
  var mouseVelocityTracker = [];
  var mouseTimeout;
  document.addEventListener('mousemove', function (e) {
    if (mouseTimeout) return;
    mouseTimeout = setTimeout(function () {
      var velocity = Math.abs(e.clientY - lastMouseY);
      mouseVelocityTracker.push(velocity);
      if (mouseVelocityTracker.length > 5) mouseVelocityTracker.shift();

      var avgVelocity = mouseVelocityTracker.reduce(function (a, b) { return a + b; }, 0) / mouseVelocityTracker.length;
      if (avgVelocity > 150) {
        sessionData.behavioral_telemetry.friction_signals.erratic_mouse_movements += 1;
      }
      lastMouseY = e.clientY;
      mouseTimeout = null;
    }, 100);
  }, { passive: true });

  document.addEventListener('selectionchange', function () {
    var selection = window.getSelection().toString().trim();
    if (selection.length > 5 && selection.length < 150) {
      sessionData.behavioral_telemetry.friction_signals.highlighted_text = selection;
    }
  });


  // =====================================================================
  // --- 10. THE BEACON (Mobile Kill-Switch) ---
  // =====================================================================
  var fireBeacon = function (exitCondition) {
    sessionData.behavioral_telemetry.total_time_seconds = Math.round((Date.now() - entryTime) / 1000);
    sessionData.behavioral_telemetry.exit_condition = exitCondition;

    // Rushed exit logic (legacy)
    if (lastMouseY > 0 && lastMouseY < 50) sessionData.behavioral_telemetry.exit_velocity = "high";

    // Attach fresh DOM context snapshot before every beacon
    sessionData.dom_context = extractDOMContext();

    var payload = JSON.stringify(sessionData);
    var success = navigator.sendBeacon(CONFIG.ENDPOINT, payload);

    if (CONFIG.DEBUG) {
      console.log('\uD83D\uDE80 Beacon Fired via ' + exitCondition + '. Success: ' + success);
      console.log(sessionData);
    }
  };

  // Mobile Kill-Switch: Strictly bind to visibilitychange
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
      fireBeacon('tab_hidden');
    }
  });


  // =====================================================================
  // --- 11. SOCKET.IO: REAL-TIME NUDGE LISTENER (Person 2 Feature) ---
  // Dynamically loads the Socket.io client and connects to the backend.
  // Listens for 'receive_nudge' events to show the vanilla JS toast.
  // On the Fidelity site, React's NudgeOverlay also listens — both work.
  // =====================================================================
  function initSocketConnection() {
    var script = document.createElement('script');
    script.src = CONFIG.SOCKET_URL + '/socket.io/socket.io.js';
    script.onload = function () {
      if (typeof io === 'undefined') {
        if (CONFIG.DEBUG) console.warn('[Fidelity] Socket.io client failed to load.');
        return;
      }

      var socket = io(CONFIG.SOCKET_URL, {
        transports: ['websocket', 'polling'],
        query: { consumer_id: sessionData.session_id }
      });

      socket.on('connect', function () {
        if (CONFIG.DEBUG) console.log('[Fidelity] Socket connected:', socket.id);
      });

      socket.on('receive_nudge', function (data) {
        if (CONFIG.DEBUG) console.log('[Fidelity] Nudge received from AI:', data);
        showNudgeToast(data.message || data);
      });

      socket.on('disconnect', function () {
        if (CONFIG.DEBUG) console.log('[Fidelity] Socket disconnected.');
      });
    };
    script.onerror = function () {
      if (CONFIG.DEBUG) console.warn('[Fidelity] Could not load Socket.io client from backend. Nudge toasts will not work.');
    };
    document.head.appendChild(script);
  }

  // Initialize the socket connection
  initSocketConnection();

})();