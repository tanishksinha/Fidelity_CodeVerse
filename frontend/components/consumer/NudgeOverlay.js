'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserCheck, ShieldCheck, Send, Bot, MessageCircle, Sparkles } from 'lucide-react';
import { io } from 'socket.io-client';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

/**
 * Profiles that route to the pre-contextualized Chat UI instead of a standard nudge widget.
 */
const CHATBOT_PROFILES = new Set(['BLOCKED', 'STRUGGLING', 'HESITANT']);


/**
 * NudgeOverlay — Consumer-side "God Mode" Listener
 *
 * Listens for 'receive_nudge' events from the WebSocket and renders a
 * high-end "Synaptic Advisor" slide-in modal.
 *
 * Phase 1 Routing:
 *   - routing_target === "CHATBOT"   → opens pre-seeded Chat UI Modal (no redirect)
 *   - routing_target === "UI_WIDGET" → standard nudge toast (existing behaviour)
 */
export default function NudgeOverlay() {
  const pathname = usePathname();

  // ── Nudge toast state ──────────────────────────────────────────────────────
  const [nudge, setNudge] = useState(null);

  // ── Chat modal state ───────────────────────────────────────────────────────
  const [chatOpen, setChatOpen]       = useState(false);
  const [messages, setMessages]       = useState([]);
  const [inputValue, setInputValue]   = useState('');
  const [isTyping, setIsTyping]       = useState(false);
  // Behavioral context captured when the chat opens — sent with every message
  const [chatContext, setChatContext] = useState({ behavior_type: '', friction_element: '' });
  const messagesEndRef                = useRef(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // ── Socket connection ──────────────────────────────────────────────────────
  useEffect(() => {
    if (pathname && pathname.toLowerCase().startsWith('/admin')) return;

    let consumerId = localStorage.getItem('synaptic_ghost_id') || sessionStorage.getItem('synaptic_ghost_id');
    if (!consumerId) {
      consumerId = `usr_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('synaptic_ghost_id', consumerId);
    }

    const socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      query: { consumer_id: consumerId },
    });

    socket.on('connect', () => {
      console.log('[GHOST] Consumer socket connected:', socket.id);
    });

    socket.on('receive_nudge', (data) => {
      console.log('[GHOST] Received nudge:', data);
      
      if (data.routing_target === 'CHATBOT') {
        // Forcefully slide in the chatbot
        setMessages([{ role: 'bot', text: data.message, ts: Date.now() }]);
        setChatContext({
          behavior_type:    data.behavior_type    || '',
          friction_element: data.friction_element || '',
        });
        setChatOpen(true);
      } else {
        setNudge(data);
        // Auto-dismiss toast after 15 s (only relevant for UI_WIDGET route)
        setTimeout(() => setNudge(null), 15000);
      }
    });

    return () => socket.disconnect();
  }, [pathname]);

  // ── Guard: never render on admin pages ────────────────────────────────────
  if (pathname && pathname.toLowerCase().startsWith('/admin')) return null;

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleCTAClick = () => {
    if (nudge?.routing_target === 'CHATBOT') {
      // Phase 1 Spec §B.3 — prevent redirect, open Chat UI Modal
      // Phase 1 Spec §B.4 — seed the chat with the AI-generated message
      setMessages([{ role: 'bot', text: nudge.message, ts: Date.now() }]);
      // Phase 2 — capture behavioral context for every subsequent message
      setChatContext({
        behavior_type:    nudge.behavior_type    || '',
        friction_element: nudge.friction_element || '',
      });
      setChatOpen(true);
      setNudge(null); // dismiss the toast
    } else {
      // Standard route: close the widget (existing behaviour)
      setNudge(null);
    }
  };

  const handleSendMessage = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    const userMsg = { role: 'user', text: trimmed, ts: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    // Build history for the API (exclude the seeded bot opening message if desired,
    // but include it so the LLM knows how the conversation started)
    const historyForApi = [...messages, userMsg].map((m) => ({
      role:    m.role === 'bot' ? 'assistant' : 'user',
      content: m.text,
    }));

    try {
      const res = await fetch(`${BACKEND_URL}/api/chat`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message:          trimmed,
          behavior_type:    chatContext.behavior_type,
          friction_element: chatContext.friction_element,
          history:          historyForApi.slice(0, -1), // history before the current message
        }),
      });

      const json = await res.json();
      const botReply = json.reply || "I'm sorry, I couldn't process that. Please try again.";

      setIsTyping(false);
      setMessages((prev) => [...prev, { role: 'bot', text: botReply, ts: Date.now() }]);
    } catch (err) {
      console.error('[CHAT] API error:', err);
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          text: "I'm having trouble connecting right now. Please try again in a moment.",
          ts:   Date.now(),
        },
      ]);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const isPreset = nudge?.type !== 'custom';
  const isChatbotRoute = nudge?.routing_target === 'CHATBOT';

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════
          NUDGE TOAST
          Appears for both CHATBOT and UI_WIDGET routes.
          The CTA label and icon differ based on routing_target.
      ═══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {nudge && (
          <motion.div
            key="nudge-toast"
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-4 inset-x-4 md:inset-x-auto md:right-6 md:top-6 z-50 md:w-full md:max-w-sm rounded-2xl border border-synaptic-green/20 bg-white/95 backdrop-blur p-5 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)]"
          >
            <button
              onClick={() => setNudge(null)}
              className="absolute right-3 top-3 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
            >
              <X size={16} />
            </button>

            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="relative mt-1 h-12 w-12 shrink-0 overflow-hidden rounded-full border border-gray-200">
                <div className="absolute inset-0 bg-gradient-to-br from-synaptic-dark to-synaptic-green flex items-center justify-center text-white">
                  {isChatbotRoute ? <MessageCircle size={20} /> : <UserCheck size={20} />}
                </div>
              </div>

              <div className="min-w-0">
                {/* Badge */}
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-synaptic-green">
                  <ShieldCheck size={12} />
                  {isChatbotRoute ? 'AI Support Assistant' : 'Synaptic Wealth Advisor'}
                </div>

                {isPreset && (
                  <p className="mt-1 font-bold text-gray-900">{nudge.offerLabel}</p>
                )}

                <p className="mt-2 text-sm leading-6 text-gray-600">{nudge.message}</p>

                <div className="mt-4 flex gap-2">
                  <button
                    id="nudge-cta-btn"
                    onClick={handleCTAClick}
                    className="flex-1 rounded bg-synaptic-green px-4 py-2 text-xs font-bold text-white shadow-glow-green transition hover:bg-[#009940] flex items-center justify-center gap-1.5"
                  >
                    {isChatbotRoute ? (
                      <>
                        <MessageCircle size={13} />
                        Chat with AI
                      </>
                    ) : isPreset ? (
                      'Claim Offer'
                    ) : (
                      'Connect with Advisor'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════════
          CHAT UI MODAL
          Opens only when routing_target === "CHATBOT".
          Pre-seeded with the AI nudge message as the first bot turn.
      ═══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            key="chat-modal"
            initial={{ opacity: 0, scale: 0.94, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 24 }}
            transition={{ type: 'spring', damping: 26, stiffness: 260 }}
            className="fixed bottom-6 right-6 z-50 w-full max-w-sm rounded-2xl overflow-hidden flex flex-col border border-synaptic-green/20 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.25)]"
            style={{ height: 500 }}
          >
            {/* ── Header ───────────────────────────────────────────────── */}
            <div className="shrink-0 bg-gradient-to-r from-synaptic-dark to-synaptic-green px-5 py-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-white/15 flex items-center justify-center ring-2 ring-white/20">
                <Bot size={18} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white leading-tight">Synaptic AI Assistant</p>
                <p className="text-[10px] text-white/70 flex items-center gap-1.5 mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-300 animate-pulse" />
                  Online · Pre-contextualized
                </p>
              </div>
              <button
                id="chat-modal-close-btn"
                onClick={() => setChatOpen(false)}
                className="rounded-full p-1.5 text-white/60 hover:bg-white/10 hover:text-white transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* ── Context pill ─────────────────────────────────────────── */}
            <div className="shrink-0 bg-synaptic-green/5 border-b border-synaptic-green/10 px-4 py-2 flex items-center gap-2">
              <Sparkles size={11} className="text-synaptic-green shrink-0" />
              <p className="text-[10px] text-synaptic-green font-medium leading-tight">
                I already know what you&apos;re struggling with — let&apos;s fix it together.
              </p>
            </div>

            {/* ── Messages ─────────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'bot' && (
                    <div className="h-6 w-6 rounded-full bg-gradient-to-br from-synaptic-dark to-synaptic-green flex items-center justify-center shrink-0 mb-0.5">
                      <Bot size={11} className="text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-synaptic-green text-white rounded-br-sm'
                        : 'bg-white text-gray-800 shadow-sm border border-gray-100/80 rounded-bl-sm'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex items-end gap-2 justify-start">
                  <div className="h-6 w-6 rounded-full bg-gradient-to-br from-synaptic-dark to-synaptic-green flex items-center justify-center shrink-0">
                    <Bot size={11} className="text-white" />
                  </div>
                  <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm border border-gray-100/80 flex gap-1 items-center">
                    {[0, 150, 300].map((delay) => (
                      <span
                        key={delay}
                        className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce"
                        style={{ animationDelay: `${delay}ms` }}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* ── Input ────────────────────────────────────────────────── */}
            <div className="shrink-0 border-t border-gray-100 bg-white px-3 py-3 flex gap-2 items-center">
              <input
                id="chat-input"
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message…"
                className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-synaptic-green focus:bg-white transition"
              />
              <button
                id="chat-send-btn"
                onClick={handleSendMessage}
                disabled={!inputValue.trim()}
                className="h-10 w-10 rounded-xl bg-synaptic-green flex items-center justify-center text-white transition hover:bg-[#009940] disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                <Send size={15} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
