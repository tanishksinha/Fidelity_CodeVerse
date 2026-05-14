'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Send, CheckCircle2 } from 'lucide-react';
import { useSocket } from '@/contexts/SocketContext';
import { cn } from '@/lib/cn';

/**
 * ManualNudge — "God Mode" Admin Intervention Panel
 *
 * Allows admin to bypass the AI and send a custom message or preset offer
 * directly to a user's browser via WebSocket.
 */

const PRESET_OFFERS = [
  { id: 'sip_bonus', label: '1% SIP Bonus (24hr)', message: 'Exclusive offer: Get an additional 1% bonus on your SIP investment for the next 24 hours. Act now!' },
  { id: 'consultation', label: 'Free Wealth Consultation', message: 'We noticed you are exploring investment options. Book a free 30-minute session with a Fidelity Wealth Advisor today.' },
  { id: 'cashback', label: '₹500 Cashback', message: 'Complete your first investment today and receive ₹500 cashback directly to your bank account. Limited time offer!' },
  { id: 'premium', label: 'Fidelity Premium Access', message: 'Unlock Fidelity Premium: advanced analytics, priority support, and exclusive market insights — free for 3 months.' },
];

export default function ManualNudge({ userId, userName }) {
  const { emit } = useSocket();
  const [selectedPreset, setSelectedPreset] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [sendState, setSendState] = useState('idle'); // idle | sending | sent

  const handleSend = () => {
    const preset = PRESET_OFFERS.find((p) => p.id === selectedPreset);
    const message = customMessage.trim() || preset?.message || '';
    
    if (!message) return;

    setSendState('sending');

    emit('manual_nudge', {
      userId: userId || 'unknown',
      message,
      type: selectedPreset || 'custom',
      offerLabel: preset?.label || 'Custom Message',
    });

    setTimeout(() => setSendState('sent'), 600);
    setTimeout(() => {
      setSendState('idle');
      setCustomMessage('');
      setSelectedPreset('');
    }, 3000);
  };

  return (
    <section className="rounded-lg border border-intent-bounce/20 bg-warroom-bg p-4">
      <h3 className="flex items-center gap-2 text-label text-intent-bounce/80">
        <Zap size={12} />
        God Mode — Manual Intervention
      </h3>
      <p className="mt-1 text-[9px] text-warroom-text-secondary">
        Bypass AI. Send a direct message to <span className="text-white font-mono">{userId || 'this user'}</span>.
      </p>

      {/* Preset Offers */}
      <div className="mt-3 grid grid-cols-2 gap-1.5">
        {PRESET_OFFERS.map((offer) => (
          <button
            key={offer.id}
            onClick={() => {
              setSelectedPreset(offer.id);
              setCustomMessage('');
            }}
            className={cn(
              'rounded border px-2 py-1.5 text-[9px] font-bold uppercase tracking-wider transition text-left',
              selectedPreset === offer.id
                ? 'border-intent-bounce/40 bg-intent-bounce/10 text-intent-bounce'
                : 'border-warroom-border bg-warroom-surface text-warroom-text-secondary hover:text-white'
            )}
          >
            {offer.label}
          </button>
        ))}
      </div>

      {/* Custom Message */}
      <textarea
        value={customMessage}
        onChange={(e) => {
          setCustomMessage(e.target.value);
          if (e.target.value) setSelectedPreset('');
        }}
        placeholder="Or type a custom message..."
        rows={2}
        className="mt-3 w-full rounded border border-warroom-border bg-warroom-surface px-3 py-2 text-xs text-white placeholder:text-warroom-text-secondary/50 outline-none focus:border-intent-bounce/40 resize-none"
      />

      {/* Send Button */}
      <motion.button
        onClick={handleSend}
        disabled={sendState !== 'idle' || (!customMessage.trim() && !selectedPreset)}
        whileTap={{ scale: 0.97 }}
        className={cn(
          'mt-3 flex w-full items-center justify-center gap-2 rounded py-2.5 text-[10px] font-black uppercase tracking-[0.18em] transition',
          sendState === 'sent'
            ? 'bg-fidelity-green/20 text-fidelity-green border border-fidelity-green/30'
            : sendState === 'sending'
              ? 'bg-intent-bounce/10 text-intent-bounce/60 border border-intent-bounce/20'
              : !customMessage.trim() && !selectedPreset
                ? 'bg-warroom-surface text-warroom-text-secondary/40 border border-warroom-border cursor-not-allowed'
                : 'bg-intent-bounce text-white shadow-glow-red hover:bg-[#ff2d3b] cursor-pointer'
        )}
      >
        {sendState === 'sent' ? (
          <><CheckCircle2 size={12} /> Nudge Delivered</>
        ) : sendState === 'sending' ? (
          <><Send size={12} className="animate-pulse" /> Transmitting...</>
        ) : (
          <><Zap size={12} /> Send Ultra-Nudge</>
        )}
      </motion.button>
    </section>
  );
}
