/**
 * FIDELITY BEHAVIORAL GHOST SDK v1.0
 * Zero-dependency, non-blocking telemetry engine.
 * Captures micro-hesitations and asynchronously fires via sendBeacon.
 */

(function () {
  'use strict';

  // --- 1. CONFIGURATION & STATE ---
    ENDPOINT: 'http://localhost:8080/api/ingest-telemetry', // FastAPI Backend Ingestion
    HESITATION_THRESHOLD_MS: 3000,     // Hover time before it's considered "Hesitation"
    DEBUG: true                        // Set to true for Hackathon Demo console logs
  };

  const sessionData = {
    session_id: 'usr_' + Math.random().toString(36).substring(2, 11), // Mock ID
    timestamp: new Date().toISOString(),
    page_url: window.location.pathname,
    behavioral_telemetry: {
      total_time_seconds: 0,
      max_scroll_depth_percent: 0,
      hesitation_zones: [], // e.g., [{ element_id: "tax-fees", hover_duration_ms: 4500 }]
      friction_signals: {
        erratic_mouse_movements: 0,
        highlighted_text: null
      },
      exit_condition: null,
      exit_velocity: "normal" // Can be "normal" or "high" based on mouse speed before exit
    }
  };

  let entryTime = Date.now();
  let hoverTimers = {};
  let lastMouseY = 0;
  let mouseVelocityTracker = [];

  if (CONFIG.DEBUG) console.log("🟢 Ghost SDK Initialized on: " + sessionData.page_url);


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
    }, 200); // Throttle to 200ms to protect main thread
  }, { passive: true });


  // --- 3. HESITATION TRACKER (Hover Zones) ---
  // To use this, add data-track="element_name" to any important HTML element
  document.addEventListener('mouseover', (e) => {
    const target = e.target.closest('[data-track]');
    if (!target) return;
    
    const elementId = target.getAttribute('data-track');
    if (!hoverTimers[elementId]) {
      hoverTimers[elementId] = { start: Date.now() };
    }
  });

  document.addEventListener('mouseout', (e) => {
    const target = e.target.closest('[data-track]');
    if (!target) return;

    const elementId = target.getAttribute('data-track');
    if (hoverTimers[elementId]) {
      const duration = Date.now() - hoverTimers[elementId].start;
      delete hoverTimers[elementId];

      if (duration >= CONFIG.HESITATION_THRESHOLD_MS) {
        sessionData.behavioral_telemetry.hesitation_zones.push({
          element_id: elementId,
          hover_duration_ms: duration
        });
        if (CONFIG.DEBUG) console.log(`⚠️ Hesitation logged: ${elementId} (${duration}ms)`);
      }
    }
  });


  // --- 4. FRICTION: ERRATIC MOUSE & SELECTION ---
  let mouseTimeout;
  document.addEventListener('mousemove', (e) => {
    if (mouseTimeout) return;
    mouseTimeout = setTimeout(() => {
      const velocity = Math.abs(e.clientY - lastMouseY);
      mouseVelocityTracker.push(velocity);
      if (mouseVelocityTracker.length > 5) mouseVelocityTracker.shift();

      // If average velocity is absurdly high over 5 ticks, flag it as erratic
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
    // Only capture short snippets to avoid massive payloads, but long enough to grab intent
    if (selection.length > 5 && selection.length < 150) {
      sessionData.behavioral_telemetry.friction_signals.highlighted_text = selection;
      if (CONFIG.DEBUG) console.log(`🔍 Text Highlighted: "${selection}"`);
    }
  });


  // --- 5. THE BEACON (Exit Interception) ---
  const fireBeacon = (exitCondition) => {
    // Only fire once
    if (sessionData.behavioral_telemetry.exit_condition) return;

    sessionData.behavioral_telemetry.total_time_seconds = Math.round((Date.now() - entryTime) / 1000);
    sessionData.behavioral_telemetry.exit_condition = exitCondition;

    // Check if the exit was "rushed" (cursor slammed to the top of the screen)
    if (lastMouseY < 50) sessionData.behavioral_telemetry.exit_velocity = "high";

    const payload = JSON.stringify(sessionData);
    
    // navigator.sendBeacon is non-blocking. It survives tab closure.
    const success = navigator.sendBeacon(CONFIG.ENDPOINT, payload);
    
    if (CONFIG.DEBUG) {
      console.log(`🚀 Beacon Fired via ${exitCondition}. Success: ${success}`);
      console.log(sessionData);
    }
  };

  // Trigger when tab is hidden, closed, or navigated away from
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') fireBeacon('tab_hidden');
  });

  // Fallback for Safari/Mobile
  window.addEventListener('pagehide', () => fireBeacon('page_hide'));

})();