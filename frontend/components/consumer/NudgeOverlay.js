'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserCheck, ShieldCheck } from 'lucide-react';
import { io } from 'socket.io-client';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

/**
 * NudgeOverlay — Consumer-side "God Mode" Listener
 *
 * Listens for 'receive_nudge' events from the WebSocket and renders a
 * high-end "Fidelity Advisor" slide-in modal.
 */
export default function NudgeOverlay() {
  const [nudge, setNudge] = useState(null); // { message, type, offerLabel }

  useEffect(() => {
    // Disable nudge listener on admin routes to prevent admin from receiving user alerts
    if (window.location.pathname.startsWith('/admin')) return;

    // Generate a persistent anonymous ID for the consumer if not present
    let consumerId = localStorage.getItem('fidelity_ghost_id');
    if (!consumerId) {
      consumerId = `USR_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      localStorage.setItem('fidelity_ghost_id', consumerId);
    }

    // Connect to the socket (unauthenticated, consumer side)
    const socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      query: { consumer_id: consumerId },
    });

    socket.on('connect', () => {
      console.log('[GHOST] Consumer socket connected:', socket.id);
    });

    socket.on('receive_nudge', (data) => {
      console.log('[GHOST] Received manual nudge:', data);
      setNudge(data);
      
      // Auto-dismiss after 15 seconds
      setTimeout(() => setNudge(null), 15000);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  if (!nudge) return null;

  const isPreset = nudge.type !== 'custom';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed top-4 inset-x-4 md:inset-x-auto md:right-6 md:top-6 z-50 md:w-full md:max-w-sm rounded-2xl border border-fidelity-green/20 bg-white/95 backdrop-blur p-5 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)]"
      >
        <button
          onClick={() => setNudge(null)}
          className="absolute right-3 top-3 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
        >
          <X size={16} />
        </button>

        <div className="flex items-start gap-4">
          <div className="relative mt-1 h-12 w-12 shrink-0 overflow-hidden rounded-full border border-gray-200">
            {/* Simulated Advisor Photo */}
            <div className="absolute inset-0 bg-gradient-to-br from-fidelity-dark to-fidelity-green flex items-center justify-center text-white">
              <UserCheck size={20} />
            </div>
          </div>
          
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-fidelity-green">
              <ShieldCheck size={12} />
              Synaptic Wealth Advisor
            </div>
            
            {isPreset && (
              <p className="mt-1 font-bold text-gray-900">
                {nudge.offerLabel}
              </p>
            )}
            
            <p className="mt-2 text-sm leading-6 text-gray-600">
              {nudge.message}
            </p>

            <div className="mt-4 flex gap-2">
              {isPreset ? (
                <button 
                  onClick={() => setNudge(null)}
                  className="flex-1 rounded bg-fidelity-green px-4 py-2 text-xs font-bold text-white shadow-glow-green transition hover:bg-[#009940]"
                >
                  Claim Offer
                </button>
              ) : (
                <button 
                  onClick={() => setNudge(null)}
                  className="flex-1 rounded bg-fidelity-green px-4 py-2 text-xs font-bold text-white shadow-glow-green transition hover:bg-[#009940]"
                >
                  Connect with Advisor
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
