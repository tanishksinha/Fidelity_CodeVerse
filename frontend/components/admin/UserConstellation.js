'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eye, Zap, Filter } from 'lucide-react';
import { useSocket } from '@/contexts/SocketContext';
import { cn } from '@/lib/cn';

/**
 * UserConstellation — Real-Time Intent Star Map
 *
 * SVG-based "Star Map" showing live users as glowing dots.
 * Size = time on site, Color = intent score (White→Yellow→Orange→Red).
 * Self-cleaning: fades stale users after 5 mins.
 * Interactivity: click for Quick View, slider for intent filter, zoom/pan.
 */

// Deterministic position from user_id (hash to x,y)
function hashPosition(userId, width, height) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash |= 0;
  }
  const x = 60 + Math.abs(hash % (width - 120));
  const y = 60 + Math.abs((hash * 2654435761) % (height - 120));
  return { x, y };
}

// Intent score → color interpolation
function scoreToColor(score) {
  if (score < 20) return '#FFFFFF';        // New / White
  if (score < 40) return '#E8E8C8';        // Warm White
  if (score < 55) return '#FFB703';        // Yellow / Researching
  if (score < 70) return '#FF8C00';        // Orange / Engaged
  if (score < 85) return '#E63946';        // Red / High Friction
  return '#FF1744';                         // Glowing Red / Critical
}

// Score → glow radius
function scoreToGlow(score) {
  if (score < 30) return 0;
  if (score < 60) return 4;
  return 8 + (score - 60) * 0.2;
}

// Time on site → dot radius (clamped 4-22)
function timeToRadius(seconds) {
  return Math.min(22, Math.max(4, 4 + seconds / 15));
}

// Deterministic pulse delay class from user_id (1–7)
function pulseDelayClass(userId) {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = ((h << 3) - h) + userId.charCodeAt(i);
  return `pulse-delay-${(Math.abs(h) % 7) + 1}`;
}

const MAP_WIDTH = 900;
const MAP_HEIGHT = 520;

export default function UserConstellation() {
  const { socket, emit } = useSocket();
  const usersRef = useRef(new Map()); // userId → user data
  const [users, setUsers] = useState([]); // render snapshot
  const [filter, setFilter] = useState(0);
  const [selectedUser, setSelectedUser] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  // Ingest real-time user activity
  useEffect(() => {
    if (!socket) return;

    const handleActivity = (data) => {
      const userId = data.user_id;
      const existing = usersRef.current.get(userId);
      const pos = existing
        ? { x: existing.x, y: existing.y }
        : hashPosition(userId, MAP_WIDTH, MAP_HEIGHT);

      usersRef.current.set(userId, {
        user_id: userId,
        x: pos.x,
        y: pos.y,
        score: data.current_score ?? data.score ?? 0,
        time_on_site: data.time_on_site ?? (existing?.time_on_site || 0) + 2,
        last_page: data.last_page ?? existing?.last_page ?? '/',
        action: data.action ?? '',
        last_seen: Date.now(),
        pulse: data.pulse ?? null, // 'green' if intervention triggered
        actions: [
          ...(existing?.actions || []).slice(-4),
          { action: data.action, time: new Date().toLocaleTimeString() },
        ],
      });
    };

    const handlePulse = (data) => {
      const userId = data.user_id;
      const existing = usersRef.current.get(userId);
      if (existing) {
        existing.pulse = 'green';
        setTimeout(() => { existing.pulse = null; }, 1200);
      }
    };

    socket.on('user_activity', handleActivity);
    socket.on('intervention_sent', handlePulse);

    return () => {
      socket.off('user_activity', handleActivity);
      socket.off('intervention_sent', handlePulse);
    };
  }, [socket]);

  // Self-cleaning loop: fade stale users every 10s
  // Also sync render snapshot
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const STALE_THRESHOLD = 300_000; // 5 minutes

      for (const [uid, user] of usersRef.current) {
        if (now - user.last_seen > STALE_THRESHOLD) {
          usersRef.current.delete(uid);
        }
      }

      setUsers(Array.from(usersRef.current.values()));
    }, 2000); // update render every 2s for smooth UX

    return () => clearInterval(interval);
  }, []);

  // Filtered users
  const visibleUsers = useMemo(
    () => users.filter((u) => u.score >= filter),
    [users, filter]
  );

  // Zoom via mouse wheel
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    setZoom((prev) => Math.min(3, Math.max(0.5, prev + (e.deltaY > 0 ? -0.1 : 0.1))));
  }, []);

  // Pan via mouse drag
  const handleMouseDown = useCallback((e) => {
    isDragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  return (
    <div className="warroom-panel relative">
      <div className="warroom-header">
        <div>
          <h2 className="font-bold">User Constellation</h2>
          <p className="mt-1 text-sublabel">
            {visibleUsers.length} active user{visibleUsers.length !== 1 ? 's' : ''} on map
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Filter size={14} className="text-warroom-text-secondary" />
          <input
            type="range"
            min="0"
            max="100"
            value={filter}
            onChange={(e) => setFilter(Number(e.target.value))}
            className="h-1 w-24 cursor-pointer appearance-none rounded-full bg-warroom-border accent-synaptic-green"
          />
          <span className="font-mono text-[10px] text-warroom-text-secondary w-6">{filter}</span>
        </div>
      </div>

      {/* Star Map Canvas */}
      <div
        className="relative w-full overflow-hidden bg-[#050708] cursor-grab active:cursor-grabbing"
        style={{ height: MAP_HEIGHT, touchAction: 'pan-x pan-y' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Background Stars (decorative) */}
        <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none">
          {Array.from({ length: 60 }, (_, i) => (
            <circle
              key={`bg-${i}`}
              cx={Math.random() * MAP_WIDTH}
              cy={Math.random() * MAP_HEIGHT}
              r={Math.random() * 1.2}
              fill="#FFFFFF"
              opacity={0.3 + Math.random() * 0.5}
            />
          ))}
        </svg>

        {/* User Dots */}
        <svg
          width="100%"
          height={MAP_HEIGHT}
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          className="absolute inset-0"
          style={{
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
            transformOrigin: 'center center',
            transition: 'transform 0.15s ease-out',
          }}
        >
          <defs>
            {visibleUsers.map((u) => (
              <radialGradient key={`glow-${u.user_id}`} id={`glow-${u.user_id}`}>
                <stop offset="0%" stopColor={scoreToColor(u.score)} stopOpacity="0.6" />
                <stop offset="100%" stopColor={scoreToColor(u.score)} stopOpacity="0" />
              </radialGradient>
            ))}
          </defs>

          {visibleUsers.map((u) => {
            const r = timeToRadius(u.time_on_site);
            const color = scoreToColor(u.score);
            const glowR = scoreToGlow(u.score);

            return (
              <g key={u.user_id} onClick={() => setSelectedUser(u)} className="cursor-pointer">
                {/* Halo glow for high-intent — cardiac pulse */}
                {glowR > 0 && (
                  <circle
                    cx={u.x}
                    cy={u.y}
                    r={r + glowR}
                    fill={`url(#glow-${u.user_id})`}
                    className={`animate-telemetry-pulse ${pulseDelayClass(u.user_id)}`}
                  />
                )}
                {/* Intervention pulse (green flash) */}
                {u.pulse === 'green' && (
                  <circle cx={u.x} cy={u.y} r={r + 16} fill="none" stroke="#007A33" strokeWidth="2" opacity="0.7">
                    <animate attributeName="r" from={r} to={r + 30} dur="0.8s" fill="freeze" />
                    <animate attributeName="opacity" from="0.7" to="0" dur="0.8s" fill="freeze" />
                  </circle>
                )}
                {/* Main dot — subtle breathe animation */}
                <circle
                  cx={u.x}
                  cy={u.y}
                  r={r}
                  fill={color}
                  stroke={color}
                  strokeWidth="0.5"
                  className={`animate-constellation-breathe ${pulseDelayClass(u.user_id)}`}
                />
                {/* Score label for large dots */}
                {r > 10 && (
                  <text x={u.x} y={u.y + 3} textAnchor="middle" fill="#000" fontSize="8" fontWeight="bold" fontFamily="monospace">
                    {u.score}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Zoom level indicator */}
        <div className="absolute bottom-3 right-3 font-mono text-[9px] text-warroom-text-secondary/50">
          {zoom.toFixed(1)}x
        </div>
      </div>

      {/* Quick View Panel */}
      <AnimatePresence>
        {selectedUser && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-0 left-0 right-0 z-20 border-t border-warroom-border bg-warroom-surface/95 backdrop-blur-md p-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-xs font-bold text-white">{selectedUser.user_id}</p>
                <div className="mt-1 flex items-center gap-3 text-[10px] text-warroom-text-secondary">
                  <span>Score: <span className="font-bold" style={{ color: scoreToColor(selectedUser.score) }}>{selectedUser.score}</span></span>
                  <span>Page: <span className="text-white">{selectedUser.last_page}</span></span>
                  <span>Time: <span className="text-white">{selectedUser.time_on_site}s</span></span>
                </div>
              </div>
              <button onClick={() => setSelectedUser(null)} className="p-1 text-warroom-text-secondary hover:text-white">
                <X size={14} />
              </button>
            </div>

            {/* Recent Actions */}
            <div className="mt-3 space-y-1">
              <p className="text-[9px] font-bold uppercase tracking-widest text-warroom-text-secondary">Recent Actions</p>
              {(selectedUser.actions || []).slice(-3).map((a, i) => (
                <div key={i} className="flex items-center gap-2 text-[10px] font-mono text-warroom-text-secondary">
                  <span className="text-warroom-border">{a.time}</span>
                  <span className="text-white">{a.action}</span>
                </div>
              ))}
            </div>

            {/* God Mode Actions */}
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => {
                  emit('manual_nudge', {
                    userId: selectedUser.user_id,
                    message: 'Special offer: 1% SIP Bonus for the next 24 hours!',
                    type: 'preset_offer',
                  });
                }}
                className="flex items-center gap-1.5 rounded border border-intent-bounce/40 bg-intent-bounce/10 px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-intent-bounce transition hover:bg-intent-bounce/20"
              >
                <Zap size={10} />
                Send Ultra-Nudge
              </button>
              <button
                onClick={() => setSelectedUser(null)}
                className="flex items-center gap-1.5 rounded border border-warroom-border bg-warroom-bg px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-warroom-text-secondary transition hover:text-white"
              >
                <Eye size={10} />
                Session Ghost
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
