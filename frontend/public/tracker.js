/**
 * FIDELITY BEHAVIORAL GHOST SDK v2.0 (Mobile-Native)
 * Zero-dependency, non-blocking telemetry engine.
 * Captures micro-hesitations, scroll thrashing, and rage taps.
 */

(function () {
  'use strict';

  // --- 1. CONFIGURATION & STATE ---
  const CONFIG = {
    ENDPOINT: 'http://localhost:8080/api/ingest-telemetry',
    DWELL_THRESHOLD_MS: 3000,     
    RAGE_TAP_THRESHOLD_MS: 600,   
    SCROLL_THRASH_TIME_MS: 1500,  
    DEBUG: true                   
  };

  const sessionData = {
    session_id: 'usr_' + Math.random().toString(36).substring(2, 11),
    timestamp: new Date().toISOString(),
    page_url: window.location.pathname,
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
      exit_condition: null,
      exit_velocity: "normal" 
    }
  };

  let entryTime = Date.now();

  if (CONFIG.DEBUG) console.log("🟢 Mobile Ghost SDK v2 Initialized on: " + sessionData.page_url);

  // --- 2. SCROLL DEPTH TRACKER (Throttled) ---
  let scrollTimeout;
  window.addEventListener('scroll', () => {
    if (scrollTimeout) return;
    scrollTimeout = setTimeout(() => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight;
      const winHeight = window.innerHeight;
      const scrollPercent = Math.round((scrollTop / (docHeight - winHeight)) * 100);
      
      if (scrollPercent > sessionData.behavioral_telemetry.max_scroll_depth_percent) {
        sessionData.behavioral_telemetry.max_scroll_depth_percent = scrollPercent;
      }
      scrollTimeout = null;
    }, 200); 
  }, { passive: true });


  // --- 3. DWELL TIME TRACKING (Replacing Hover) ---
  const dwellTimers = {};
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const elementId = entry.target.getAttribute('data-track');
      if (!elementId) return;

      if (entry.isIntersecting) {
        // Element entered viewport
        if (!dwellTimers[elementId]) {
          dwellTimers[elementId] = { start: Date.now() };
        }
      } else {
        // Element left viewport
        if (dwellTimers[elementId]) {
          const duration = Date.now() - dwellTimers[elementId].start;
          delete dwellTimers[elementId];

          if (duration >= CONFIG.DWELL_THRESHOLD_MS) {
            sessionData.behavioral_telemetry.hesitation_zones.push({
              element_id: elementId,
              dwell_duration_ms: duration
            });
            if (CONFIG.DEBUG) console.log(`⚠️ Dwell time logged: ${elementId} (${duration}ms)`);
          }
        }
      }
    });
  }, { threshold: 0.5 }); // Element must be at least 50% visible

  // Observe all trackable elements
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll('[data-track]').forEach(el => observer.observe(el));
  });
  // Also observe dynamically added elements (simplified polling for demo)
  setInterval(() => {
    document.querySelectorAll('[data-track]:not(.ghost-observed)').forEach(el => {
      el.classList.add('ghost-observed');
      observer.observe(el);
    });
  }, 2000);


  // --- 4. MOBILE FRICTION: SCROLL THRASHING ---
  let lastTouchY = 0;
  let scrollDirections = [];
  let currentDirection = null;

  document.addEventListener('touchmove', (e) => {
    const currentY = e.touches[0].clientY;
    if (lastTouchY === 0) { lastTouchY = currentY; return; }

    const newDirection = currentY > lastTouchY ? 'down' : 'up';
    
    if (currentDirection !== newDirection) {
      currentDirection = newDirection;
      scrollDirections.push({ dir: newDirection, time: Date.now() });
      
      // Clean up old events
      scrollDirections = scrollDirections.filter(d => Date.now() - d.time < CONFIG.SCROLL_THRASH_TIME_MS);
      
      if (scrollDirections.length >= 4) {
        sessionData.behavioral_telemetry.friction_signals.scroll_thrash_count += 1;
        if (CONFIG.DEBUG) console.log("🌀 Scroll Thrashing Detected!");
        scrollDirections = []; // reset after detection
      }
    }
    lastTouchY = currentY;
  }, { passive: true });

  document.addEventListener('touchend', () => { lastTouchY = 0; });


  // --- 5. MOBILE FRICTION: RAGE TAPPING ---
  const tapHistory = {};

  document.addEventListener('touchstart', (e) => {
    const target = e.target.closest('[data-track]') || e.target;
    // Generate a quick pseudo-ID if no data-track exists
    const elementKey = target.getAttribute('data-track') || target.tagName + target.className;
    
    if (!tapHistory[elementKey]) tapHistory[elementKey] = [];
    
    const now = Date.now();
    tapHistory[elementKey].push(now);
    
    // Clean up taps older than threshold
    tapHistory[elementKey] = tapHistory[elementKey].filter(time => now - time < CONFIG.RAGE_TAP_THRESHOLD_MS);
    
    if (tapHistory[elementKey].length >= 3) {
      sessionData.behavioral_telemetry.friction_signals.rage_clicks += 1;
      if (CONFIG.DEBUG) console.log(`💢 Rage Tap Detected on: ${elementKey}`);
      tapHistory[elementKey] = []; // reset
    }
  }, { passive: true });


  // --- 6. LEGACY DESKTOP FRICTION (Kept for hybrid fallback) ---
  let lastMouseY = 0;
  let mouseVelocityTracker = [];
  let mouseTimeout;
  document.addEventListener('mousemove', (e) => {
    if (mouseTimeout) return;
    mouseTimeout = setTimeout(() => {
      const velocity = Math.abs(e.clientY - lastMouseY);
      mouseVelocityTracker.push(velocity);
      if (mouseVelocityTracker.length > 5) mouseVelocityTracker.shift();

      const avgVelocity = mouseVelocityTracker.reduce((a, b) => a + b, 0) / mouseVelocityTracker.length;
      if (avgVelocity > 150) { 
        sessionData.behavioral_telemetry.friction_signals.erratic_mouse_movements += 1;
      }
      lastMouseY = e.clientY;
      mouseTimeout = null;
    }, 100);
  }, { passive: true });

  document.addEventListener('selectionchange', () => {
    const selection = window.getSelection().toString().trim();
    if (selection.length > 5 && selection.length < 150) {
      sessionData.behavioral_telemetry.friction_signals.highlighted_text = selection;
    }
  });


  // --- 7. THE BEACON (Mobile Kill-Switch) ---
  const fireBeacon = (exitCondition) => {
    if (sessionData.behavioral_telemetry.exit_condition) return;

    sessionData.behavioral_telemetry.total_time_seconds = Math.round((Date.now() - entryTime) / 1000);
    sessionData.behavioral_telemetry.exit_condition = exitCondition;

    // Rushed exit logic (legacy)
    if (lastMouseY > 0 && lastMouseY < 50) sessionData.behavioral_telemetry.exit_velocity = "high";

    const payload = JSON.stringify(sessionData);
    const success = navigator.sendBeacon(CONFIG.ENDPOINT, payload);
    
    if (CONFIG.DEBUG) {
      console.log(`🚀 Beacon Fired via ${exitCondition}. Success: ${success}`);
      console.log(sessionData);
    }
  };

  // Mobile Kill-Switch: Strictly bind to visibilitychange
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      fireBeacon('tab_hidden');
    }
  });

})();