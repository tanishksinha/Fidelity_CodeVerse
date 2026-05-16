/**
 * FIDELITY BEHAVIORAL GHOST SDK v3.1 (Unified)
 * Works on: Fidelity site (via Next.js layout) + Any foreign site (via bookmarklet)
 *
 * v3.0 additions: DOM context extraction, identity popup, socket.io self-loader, vanilla toast
 * v3.1 additions: 3 live beacon triggers (scroll thrash, hesitation, idle)
 * v3.1 patches  : No double toast on Next.js site, no identity popup on own domain,
 *                 CONFIG exposed as window.__FIDELITY_CONFIG for bookmarklet URL override
 */

(function () {
  'use strict';

  // Prevent double-injection (critical for bookmarklet mode)
  if (window.__FIDELITY_TRACKER_LOADED__) return;
  window.__FIDELITY_TRACKER_LOADED__ = true;

  // =====================================================================
  // --- 1. CONFIGURATION & STATE ---
  // =====================================================================
  const CONFIG = {
    ENDPOINT:              'http://localhost:8080/api/ingest-telemetry',
    SOCKET_URL:            'http://localhost:8080',
    DWELL_THRESHOLD_MS:    3000,
    RAGE_TAP_THRESHOLD_MS: 600,
    SCROLL_THRASH_TIME_MS: 1500,
    DEBUG:                 true
  };

  // Expose CONFIG so bookmarklet can override ENDPOINT + SOCKET_URL after script load
  window.__FIDELITY_CONFIG = CONFIG;

  const sessionData = {
    session_id: localStorage.getItem('fidelity_ghost_id') || 'usr_' + Math.random().toString(36).substring(2, 11),
    timestamp:  new Date().toISOString(),
    page_url:   window.location.pathname,
    user_phone: localStorage.getItem('fidelity_user_phone') || null,
    user_email: localStorage.getItem('fidelity_user_email') || null,
    user_name:  localStorage.getItem('fidelity_user_name')  || null,
    behavioral_telemetry: {
      total_time_seconds:       0,
      max_scroll_depth_percent: 0,
      hesitation_zones:         [],
      friction_signals: {
        erratic_mouse_movements: 0,
        scroll_thrash_count:     0,
        rage_clicks:             0,
        highlighted_text:        null
      },
      last_rage_element: null,
      exit_condition:    null,
      exit_velocity:     'normal'
    }
  };

  // Persist ghost ID if newly generated
  if (!localStorage.getItem('fidelity_ghost_id')) {
    localStorage.setItem('fidelity_ghost_id', sessionData.session_id);
  }

  let entryTime = Date.now();
  if (CONFIG.DEBUG) console.log('🟢 Ghost SDK v3.1 Initialized on: ' + sessionData.page_url);


  // =====================================================================
  // --- 2. DOM CONTEXT EXTRACTION ---
  // Reads the live page structure so the backend AI knows what the user
  // is looking at — works on any website (financial, e-commerce, travel…)
  // =====================================================================
  function extractDOMContext() {
    const buttons = Array.from(document.querySelectorAll('button, a, [role="button"]'))
      .map(el => el.innerText && el.innerText.trim())
      .filter(text => text && text.length > 1 && text.length < 50)
      .slice(0, 15);

    const formFields = Array.from(document.querySelectorAll('input, select, textarea'))
      .map(el => el.placeholder || el.name || el.getAttribute('aria-label') || el.type)
      .filter(Boolean)
      .slice(0, 10);

    const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
      .map(el => el.innerText && el.innerText.trim())
      .filter(text => text && text.length < 100)
      .slice(0, 5);

    return {
      page_title:  document.title,
      page_url:    window.location.href,
      headings:    headings,
      buttons:     buttons,
      form_fields: formFields,
      form_count:  document.querySelectorAll('form').length,
      input_count: document.querySelectorAll('input').length
    };
  }


  // =====================================================================
  // --- 3. IDENTITY POPUP FOR FOREIGN WEBSITES ---
  // PATCH (Risk 2): Only shown on foreign sites — never on own domain.
  // On the Fidelity site, login already populates localStorage.
  // =====================================================================
  function showIdentityPopup(onSubmit) {
    const overlay = document.createElement('div');
    overlay.id = 'fidelity-identity-overlay';
    overlay.style.cssText = [
      'position:fixed', 'top:0', 'left:0', 'width:100%', 'height:100%',
      'background:rgba(0,0,0,0.55)', 'z-index:2147483647',
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
      '<div style="font-size:28px;">🛡️</div>',
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
      const phone = document.getElementById('fid-phone').value.trim();
      const email = document.getElementById('fid-email').value.trim();
      if (!phone || !email) { alert('Please enter both phone and email.'); return; }

      localStorage.setItem('fidelity_user_phone', phone);
      localStorage.setItem('fidelity_user_email', email);
      localStorage.setItem('fidelity_user_name',  email.split('@')[0]);

      sessionData.user_phone = phone;
      sessionData.user_email = email;
      sessionData.user_name  = email.split('@')[0];

      document.body.removeChild(overlay);
      if (CONFIG.DEBUG) console.log('[Fidelity] Identity captured:', email);
      onSubmit(phone, email);
    });
  }

  // PATCH — Risk 2: Detect own site — skip identity popup
  const isOwnSite = window.location.hostname === 'localhost' ||
                    window.location.hostname.includes('fidelity') ||
                    !!window.__NEXT_DATA__;

  if (!sessionData.user_phone && !isOwnSite) {
    showIdentityPopup(function (phone, email) {
      try {
        fetch(CONFIG.ENDPOINT.replace('/ingest-telemetry', '/register-identity'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            consumer_id: sessionData.session_id,
            user_phone:  phone,
            user_email:  email,
            user_name:   email.split('@')[0]
          })
        }).catch(function () {});
      } catch (e) {}
    });
  }


  // =====================================================================
  // --- 4. VANILLA JS NUDGE TOAST ---
  // On Fidelity/Next.js site: React NudgeOverlay handles receive_nudge.
  // On foreign sites (bookmarklet): this vanilla toast renders the nudge.
  // intensity: 'gentle' | 'standard' | 'urgent'
  // =====================================================================
  function showNudgeToast(message, intensity) {
    const existing = document.getElementById('fidelity-nudge-toast');
    if (existing) existing.remove();

    const bgColor = intensity === 'urgent'
      ? 'linear-gradient(135deg,#7b0000,#c62828)'
      : intensity === 'standard'
        ? 'linear-gradient(135deg,#00274d,#004b8d)'
        : 'linear-gradient(135deg,#003b1e,#00b050)';

    const toast = document.createElement('div');
    toast.id = 'fidelity-nudge-toast';
    toast.style.cssText = [
      'position:fixed', 'bottom:24px', 'right:24px', 'z-index:2147483646',
      'background:' + bgColor,
      'color:white', 'border-radius:16px', 'padding:18px 22px',
      'max-width:340px', 'box-shadow:0 8px 32px rgba(0,0,0,0.4)',
      "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      'animation:fid-slide-in 0.4s ease', 'cursor:pointer'
    ].join(';');

    if (!document.getElementById('fidelity-toast-styles')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'fidelity-toast-styles';
      styleEl.textContent = '@keyframes fid-slide-in{from{transform:translateX(120%);opacity:0}to{transform:translateX(0);opacity:1}}';
      document.head.appendChild(styleEl);
    }

    toast.innerHTML = [
      '<div style="display:flex;align-items:flex-start;gap:12px;">',
      '<span style="font-size:22px;">🛡️</span>',
      '<div>',
      '<div style="font-size:11px;font-weight:700;letter-spacing:0.1em;opacity:0.8;margin-bottom:4px;">FIDELITY AI ADVISOR</div>',
      '<div style="font-size:14px;line-height:1.5;">' + message + '</div>',
      '<div style="font-size:11px;opacity:0.7;margin-top:8px;">Tap to connect with an advisor →</div>',
      '</div>',
      '</div>'
    ].join('');

    document.body.appendChild(toast);
    setTimeout(function () { if (toast.parentNode) toast.remove(); }, 8000);
    toast.addEventListener('click', function () { toast.remove(); });
    if (CONFIG.DEBUG) console.log('[Fidelity] Toast displayed:', message);
  }


  // =====================================================================
  // --- 5. SCROLL DEPTH TRACKER (Throttled) ---
  // =====================================================================
  let scrollTimeout;
  window.addEventListener('scroll', function () {
    if (scrollTimeout) return;
    scrollTimeout = setTimeout(function () {
      const scrollTop   = window.scrollY || document.documentElement.scrollTop;
      const docHeight   = document.documentElement.scrollHeight;
      const winHeight   = window.innerHeight;
      const scrollPct   = Math.round((scrollTop / (docHeight - winHeight)) * 100);
      if (scrollPct > sessionData.behavioral_telemetry.max_scroll_depth_percent) {
        sessionData.behavioral_telemetry.max_scroll_depth_percent = scrollPct;
      }
      scrollTimeout = null;
    }, 200);
  }, { passive: true });


  // =====================================================================
  // --- 6. DWELL TIME TRACKING (IntersectionObserver) ---
  // LIVE TRIGGER: Fires beacon after 2nd hesitation zone logged.
  // =====================================================================
  const dwellTimers = {};

  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      const elementId = entry.target.getAttribute('data-track');
      if (!elementId) return;

      if (entry.isIntersecting) {
        if (!dwellTimers[elementId]) {
          dwellTimers[elementId] = { start: Date.now() };
        }
      } else {
        if (dwellTimers[elementId]) {
          const duration = Date.now() - dwellTimers[elementId].start;
          delete dwellTimers[elementId];

          if (duration >= CONFIG.DWELL_THRESHOLD_MS) {
            sessionData.behavioral_telemetry.hesitation_zones.push({
              element_id:       elementId,
              dwell_duration_ms: duration
            });
            if (CONFIG.DEBUG) console.log('⚠️ Dwell logged: ' + elementId + ' (' + duration + 'ms)');

            // LIVE TRIGGER: 2+ hesitation zones → HESITANT / CONFUSED signal
            if (sessionData.behavioral_telemetry.hesitation_zones.length >= 2) {
              fireBeacon('hesitation_trigger');
            }
          }
        }
      }
    });
  }, { threshold: 0.5 });

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-track]').forEach(function (el) { observer.observe(el); });
  });
  setInterval(function () {
    document.querySelectorAll('[data-track]:not(.ghost-observed)').forEach(function (el) {
      el.classList.add('ghost-observed');
      observer.observe(el);
    });
  }, 2000);


  // =====================================================================
  // --- 7. MOBILE FRICTION: SCROLL THRASHING ---
  // LIVE TRIGGER: Fires beacon after 3rd scroll thrash event.
  // =====================================================================
  let lastTouchY        = 0;
  let scrollDirections  = [];
  let currentDirection  = null;

  document.addEventListener('touchmove', function (e) {
    const currentY = e.touches[0].clientY;
    if (lastTouchY === 0) { lastTouchY = currentY; return; }

    const newDirection = currentY > lastTouchY ? 'down' : 'up';

    if (currentDirection !== newDirection) {
      currentDirection = newDirection;
      scrollDirections.push({ dir: newDirection, time: Date.now() });
      scrollDirections = scrollDirections.filter(function (d) {
        return Date.now() - d.time < CONFIG.SCROLL_THRASH_TIME_MS;
      });

      if (scrollDirections.length >= 4) {
        sessionData.behavioral_telemetry.friction_signals.scroll_thrash_count += 1;
        if (CONFIG.DEBUG) console.log('🌀 Scroll Thrashing Detected!');
        scrollDirections = [];

        // LIVE TRIGGER: 3+ thrashes → CONFUSED signal
        if (sessionData.behavioral_telemetry.friction_signals.scroll_thrash_count >= 3) {
          fireBeacon('scroll_thrash_trigger');
        }
      }
    }
    lastTouchY = currentY;
  }, { passive: true });

  document.addEventListener('touchend', function () { lastTouchY = 0; });


  // =====================================================================
  // --- 8. HYBRID FRICTION: RAGE CLICKING (Touch + Mouse) ---
  // LIVE TRIGGER: Fires immediately on detection.
  // =====================================================================
  const tapHistory = {};

  const handleRageEvent = function (e) {
    const trackedParent = e.target.closest('[data-track]');
    const target        = e.target;

    let elementText = target.innerText ? target.innerText.trim().substring(0, 30) : null;
    const dataTrack = target.getAttribute('data-track') ||
                      (trackedParent && trackedParent.getAttribute('data-track'));
    const elementKey = dataTrack || elementText || target.id || target.tagName;

    if (!tapHistory[elementKey]) tapHistory[elementKey] = [];

    const now = Date.now();
    tapHistory[elementKey].push(now);
    tapHistory[elementKey] = tapHistory[elementKey].filter(function (t) { return now - t < 2000; });

    const lowerText = (elementText || '').toLowerCase();
    const threshold = (lowerText.indexOf('quote') !== -1 ||
                       lowerText.indexOf('apply') !== -1 ||
                       lowerText.indexOf('submit') !== -1 ||
                       lowerText.indexOf('buy') !== -1) ? 2 : 3;

    if (tapHistory[elementKey].length >= threshold) {
      sessionData.behavioral_telemetry.friction_signals.rage_clicks += 1;
      if (CONFIG.DEBUG) console.log('💢 Rage Click: ' + elementKey + ' (' + tapHistory[elementKey].length + ' clicks)');
      tapHistory[elementKey] = [];
      sessionData.behavioral_telemetry.last_rage_element = elementKey;
      fireBeacon('live_rage_click');  // LIVE TRIGGER
    }
  };

  document.addEventListener('touchstart', handleRageEvent, { passive: true });
  document.addEventListener('mousedown',  handleRageEvent, { passive: true });


  // =====================================================================
  // --- 9. LEGACY DESKTOP FRICTION (erratic mouse + text highlight) ---
  // =====================================================================
  let lastMouseY           = 0;
  let mouseVelocityTracker = [];
  let mouseTimeout;

  document.addEventListener('mousemove', function (e) {
    if (mouseTimeout) return;
    mouseTimeout = setTimeout(function () {
      const velocity = Math.abs(e.clientY - lastMouseY);
      mouseVelocityTracker.push(velocity);
      if (mouseVelocityTracker.length > 5) mouseVelocityTracker.shift();
      const avg = mouseVelocityTracker.reduce(function (a, b) { return a + b; }, 0) / mouseVelocityTracker.length;
      if (avg > 150) {
        sessionData.behavioral_telemetry.friction_signals.erratic_mouse_movements += 1;
      }
      lastMouseY   = e.clientY;
      mouseTimeout = null;
    }, 100);
  }, { passive: true });

  document.addEventListener('selectionchange', function () {
    const sel = window.getSelection().toString().trim();
    if (sel.length > 5 && sel.length < 150) {
      sessionData.behavioral_telemetry.friction_signals.highlighted_text = sel;
    }
  });


  // =====================================================================
  // --- 10. IDLE DETECTION ---
  // LIVE TRIGGER: DISENGAGING signal fires after 30s idle + 60s on page.
  // =====================================================================
  let lastInteractionTime = Date.now();
  ['click', 'scroll', 'mousemove', 'keydown', 'touchstart'].forEach(function (evt) {
    document.addEventListener(evt, function () { lastInteractionTime = Date.now(); }, { passive: true });
  });

  let idleFired = false;
  setInterval(function () {
    const idleSecs  = Math.round((Date.now() - lastInteractionTime) / 1000);
    const totalSecs = Math.round((Date.now() - entryTime) / 1000);
    if (idleSecs >= 30 && totalSecs >= 60 && !idleFired) {
      idleFired = true;
      sessionData.behavioral_telemetry.inactivity_seconds = idleSecs;
      if (CONFIG.DEBUG) console.log('💤 Idle: ' + idleSecs + 's — firing DISENGAGING beacon');
      fireBeacon('idle_trigger');
    }
    if (idleSecs < 10) idleFired = false;
  }, 5000);


  // =====================================================================
  // --- 11. THE BEACON ---
  // Attaches a fresh DOM snapshot before every send.
  // Reads ENDPOINT from CONFIG so bookmarklet can override it.
  // =====================================================================
  const fireBeacon = function (exitCondition) {
    sessionData.behavioral_telemetry.total_time_seconds = Math.round((Date.now() - entryTime) / 1000);
    sessionData.behavioral_telemetry.exit_condition     = exitCondition;

    if (lastMouseY > 0 && lastMouseY < 50) sessionData.behavioral_telemetry.exit_velocity = 'high';

    // Attach live DOM snapshot — key for foreign site stage classification
    sessionData.dom_context = extractDOMContext();

    const payload = JSON.stringify(sessionData);
    const success = navigator.sendBeacon(CONFIG.ENDPOINT, payload);

    if (CONFIG.DEBUG) {
      console.log('🚀 Beacon fired via ' + exitCondition + '. Success: ' + success);
      console.log(sessionData);
    }
  };

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
      fireBeacon('tab_hidden');
    }
  });


  // =====================================================================
  // --- 12. SOCKET.IO: REAL-TIME NUDGE LISTENER ---
  // PATCH (Risk 1): Only initialised on foreign sites.
  // On Fidelity / Next.js site, React NudgeOverlay handles receive_nudge —
  // initialising here would cause double toasts.
  // =====================================================================
  function initSocketConnection() {
    const script = document.createElement('script');
    script.src = CONFIG.SOCKET_URL + '/socket.io/socket.io.js';
    script.onload = function () {
      if (typeof io === 'undefined') {
        if (CONFIG.DEBUG) console.warn('[Fidelity] Socket.io client failed to load.');
        return;
      }

      const socket = io(CONFIG.SOCKET_URL, {
        transports: ['websocket', 'polling'],
        query: { consumer_id: sessionData.session_id }
      });

      socket.on('connect',    function () { if (CONFIG.DEBUG) console.log('[Fidelity] Socket connected:', socket.id); });
      socket.on('disconnect', function () { if (CONFIG.DEBUG) console.log('[Fidelity] Socket disconnected.'); });

      socket.on('receive_nudge', function (data) {
        if (CONFIG.DEBUG) console.log('[Fidelity] Nudge received:', data);
        showNudgeToast(data.message || data, data.type);
      });
    };
    script.onerror = function () {
      if (CONFIG.DEBUG) console.warn('[Fidelity] Could not load Socket.io. Nudge toasts disabled.');
    };
    document.head.appendChild(script);
  }

  // PATCH — Risk 1: Skip socket init on own Next.js site
  if (!window.__NEXT_DATA__ && !isOwnSite) {
    initSocketConnection();
  }

})();