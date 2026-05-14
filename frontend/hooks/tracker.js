'use client';

import { useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';

/**
 * FIDELITY GHOST SDK INTERFACE
 * Safely pushes React state changes into the Vanilla JS telemetry payload.
 */
export function useTracker() {
  const pathname = usePathname();

  // Automatically log route changes in the SPA environment
  useEffect(() => {
    if (typeof window !== 'undefined' && window.FidelityTracker) {
      window.FidelityTracker.logEvent('page_view', { path: pathname });
    }
  }, [pathname]);

  // Expose a method to manually push high-value intent markers
  const pushIntentEvent = useCallback((eventName, metadata = {}) => {
    if (typeof window === 'undefined') return;

    // We dispatch a custom DOM event that our vanilla tracker.js is listening for
    const event = new CustomEvent('fidelity_intent', {
      detail: { eventName, metadata, timestamp: new Date().toISOString() }
    });
    window.dispatchEvent(event);
    
    // In dev mode, log it to the console so the judges see it working live
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Ghost SDK] Manual Intent Injected: ${eventName}`, metadata);
    }
  }, []);

  return { pushIntentEvent };
}