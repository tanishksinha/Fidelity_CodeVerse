/**
 * FIDELITY BEHAVIORAL BOOKMARKLET v1.0
 * 
 * HOW TO USE:
 * 1. Create a new bookmark in your browser.
 * 2. Set the URL/Location to the minified one-liner below.
 * 3. Navigate to ANY website (e.g., Zerodha, Amazon, SBI).
 * 4. Click the bookmark.
 * 5. The Fidelity Ghost SDK will inject itself and begin tracking.
 * 
 * BEFORE DEMO: Replace YOUR_NGROK_URL with the actual ngrok URL.
 * Example: If ngrok gives you https://abc123.ngrok-free.app,
 *          replace YOUR_NGROK_URL with abc123.ngrok-free.app
 * 
 * The tracker.js is served from the BACKEND (port 8080) for simplicity.
 * Make sure main.py has StaticFiles mounted, or use the frontend ngrok URL.
 */

// === READABLE VERSION (for development) ===
// Copy this into the browser console to test:

/*
(function(){
  if(window.__FIDELITY_TRACKER_LOADED__){
    alert('Fidelity Tracker already active on this page!');
    return;
  }
  window.__FIDELITY_TRACKER_LOADED__ = true;

  if(!localStorage.getItem('fidelity_ghost_id')){
    localStorage.setItem('fidelity_ghost_id', 'EXT_' + Math.random().toString(36).substring(2,9).toUpperCase());
  }

  var script = document.createElement('script');
  script.src = 'http://localhost:8080/static/tracker.js?t=' + Date.now();
  script.onload = function(){
    console.log('[Fidelity] Behavioral tracker active on: ' + window.location.hostname);
  };
  script.onerror = function(){
    alert('Could not load Fidelity tracker. Is the backend running?');
  };
  document.head.appendChild(script);
})();
*/


// === MINIFIED BOOKMARKLET (copy this as the bookmark URL) ===
// javascript:(function(){if(window.__FIDELITY_TRACKER_LOADED__){alert('Fidelity Tracker already active!');return}window.__FIDELITY_TRACKER_LOADED__=true;if(!localStorage.getItem('fidelity_ghost_id')){localStorage.setItem('fidelity_ghost_id','EXT_'+Math.random().toString(36).substring(2,9).toUpperCase())}var s=document.createElement('script');s.src='http://localhost:8080/static/tracker.js?t='+Date.now();s.onload=function(){console.log('[Fidelity] Tracker active on: '+location.hostname)};s.onerror=function(){alert('Could not load Fidelity tracker. Is the backend running?')};document.head.appendChild(s)})();
