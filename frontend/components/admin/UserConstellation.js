'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eye, Zap, Filter } from 'lucide-react';
import { useSocket } from '@/contexts/SocketContext';
import { cn } from '@/lib/cn';
import IntentInspector from './IntentInspector';

/**
 * UserConstellation — Real-Time Intent Star Map
 *
 * SVG-based "Star Map" showing live users as glowing dots.
 * Size = time on site, Color = intent score (White→Yellow→Orange→Red).
 * Self-cleaning: fades stale users after 5 mins.
 * Interactivity: click for Quick View, slider for intent filter, zoom/pan.
 */

// Galaxy Definitions
const MAP_WIDTH = 1200;
const MAP_HEIGHT = 600;

const GALAXIES = [
  { name: 'Exploration', cx: MAP_WIDTH * 0.12, cy: MAP_HEIGHT * 0.55, color: '#3b82f6' }, // Blue
  { name: 'Planning', cx: MAP_WIDTH * 0.31, cy: MAP_HEIGHT * 0.55, color: '#8b5cf6' }, // Purple
  { name: 'Application', cx: MAP_WIDTH * 0.50, cy: MAP_HEIGHT * 0.55, color: '#ec4899' }, // Pink
  { name: 'KYC', cx: MAP_WIDTH * 0.69, cy: MAP_HEIGHT * 0.55, color: '#f59e0b' }, // Amber
  { name: 'Transaction', cx: MAP_WIDTH * 0.88, cy: MAP_HEIGHT * 0.55, color: '#10b981' }, // Green
];

function getGalaxy(page) {
  const p = (page || '').toLowerCase();
  if (p.includes('checkout') || p.includes('payment')) return GALAXIES[4]; // Transaction
  if (p.includes('kyc') || p.includes('verify')) return GALAXIES[3]; // KYC
  if (p.includes('invest') || p.includes('sip') || p.includes('apply')) return GALAXIES[2]; // Application
  if (p.includes('plan')) return GALAXIES[1]; // Planning
  return GALAXIES[0]; // Exploration
}

// Orbital physics: place dots in a circular orbit around the galaxy core
function hashPositionToGalaxy(userId, cx, cy) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = ((hash << 5) - hash) + userId.charCodeAt(i);
  const angle = Math.abs(hash % 360) * (Math.PI / 180);
  const distance = 25 + (Math.abs(hash * 2654435761) % 60); // Orbit distance between 25px and 85px
  return { 
    x: cx + Math.cos(angle) * distance, 
    y: cy + Math.sin(angle) * distance 
  };
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

// Map dimensions moved to top

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

  // Pre-populate with beautiful demo stars so the constellation is NEVER empty
  useEffect(() => {
    const demoStars = [
      {
        user_id: 'USR_LIVE_RAGE',
        x: hashPositionToGalaxy('USR_LIVE_RAGE', getGalaxy('/investments').cx, getGalaxy('/investments').cy).x,
        y: hashPositionToGalaxy('USR_LIVE_RAGE', getGalaxy('/investments').cx, getGalaxy('/investments').cy).y,
        score: 94,
        time_on_site: 45,
        last_page: '/investments',
        action: 'Rage Clicking on SIP calculator',
        last_seen: Date.now(),
        actions: [
          { action: 'Enter site', time: '15:10:02' },
          { action: 'Navigate to investments', time: '15:10:15' },
          { action: 'Rage click Calculator', time: '15:10:35' }
        ]
      },
      {
        user_id: 'USR_LIVE_HIGH',
        x: hashPositionToGalaxy('USR_LIVE_HIGH', getGalaxy('/checkout').cx, getGalaxy('/checkout').cy).x,
        y: hashPositionToGalaxy('USR_LIVE_HIGH', getGalaxy('/checkout').cx, getGalaxy('/checkout').cy).y,
        score: 98,
        time_on_site: 120,
        last_page: '/checkout',
        action: 'Checkout KYC Complete',
        last_seen: Date.now(),
        actions: [
          { action: 'Enter site', time: '15:08:12' },
          { action: 'KYC Verification', time: '15:09:05' },
          { action: 'Hesitation at checkout', time: '15:10:00' }
        ]
      },
      {
        user_id: 'USR_LIVE_IDLE',
        x: hashPositionToGalaxy('USR_LIVE_IDLE', getGalaxy('/').cx, getGalaxy('/').cy).x,
        y: hashPositionToGalaxy('USR_LIVE_IDLE', getGalaxy('/').cx, getGalaxy('/').cy).y,
        score: 81,
        time_on_site: 180,
        last_page: '/',
        action: 'Idle on Exit Load details',
        last_seen: Date.now(),
        actions: [
          { action: 'Enter site', time: '15:07:05' },
          { action: 'Scroll page', time: '15:07:30' },
          { action: 'Inactivity alert', time: '15:09:12' }
        ]
      },
      {
        user_id: 'USR_LIVE_CALM',
        x: hashPositionToGalaxy('USR_LIVE_CALM', getGalaxy('/planning').cx, getGalaxy('/planning').cy).x,
        y: hashPositionToGalaxy('USR_LIVE_CALM', getGalaxy('/planning').cx, getGalaxy('/planning').cy).y,
        score: 30,
        time_on_site: 30,
        last_page: '/planning',
        action: 'Healthy exploration of guides',
        last_seen: Date.now(),
        actions: [
          { action: 'Enter site', time: '15:11:45' },
          { action: 'View Wealth Roadmaps', time: '15:12:05' }
        ]
      }
    ];

    demoStars.forEach(star => {
      usersRef.current.set(star.user_id, star);
    });
    setUsers(Array.from(usersRef.current.values()));
  }, []);

  // Ingest real-time user activity
  useEffect(() => {
    if (!socket) return;

    const handleActivity = (data) => {
      const userId = data.user_id;
      const existing = usersRef.current.get(userId);
      const page = data.last_page ?? existing?.last_page ?? '/';
      const galaxy = getGalaxy(page);
      const pos = hashPositionToGalaxy(userId, galaxy.cx, galaxy.cy);

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
            className="h-1 w-24 cursor-pointer appearance-none rounded-full bg-warroom-border accent-fidelity-green"
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
        {/* Unified Star Map Canvas */}
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 pointer-events-none"
        >
          {/* Zoom & Pan Group for everything */}
          <g
            style={{
              transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
              transformOrigin: 'center center',
              transition: 'transform 0.15s ease-out',
            }}
          >
            <defs>
              {GALAXIES.map((g, i) => (
                <radialGradient key={`gal-glow-${i}`} id={`gal-glow-${i}`}>
                  <stop offset="0%" stopColor={g.color} stopOpacity="0.15" />
                  <stop offset="100%" stopColor={g.color} stopOpacity="0" />
                </radialGradient>
              ))}
              <linearGradient id="path-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.5" />
                <stop offset="50%" stopColor="#ec4899" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.5" />
              </linearGradient>
              {visibleUsers.map((u) => (
                <radialGradient key={`glow-${u.user_id}`} id={`glow-${u.user_id}`}>
                  <stop offset="0%" stopColor={scoreToColor(u.score)} stopOpacity="0.6" />
                  <stop offset="100%" stopColor={scoreToColor(u.score)} stopOpacity="0" />
                </radialGradient>
              ))}
            </defs>

            {/* Background Space Dust (Stars) */}
            {Array.from({ length: 80 }, (_, i) => (
              <circle
                key={`bg-${i}`}
                cx={Math.random() * MAP_WIDTH}
                cy={Math.random() * MAP_HEIGHT}
                r={Math.random() * 1.5}
                fill="#FFFFFF"
                opacity={0.2 + Math.random() * 0.4}
                className="animate-constellation-breathe"
                style={{ animationDelay: `${Math.random() * 5}s` }}
              />
            ))}

            {/* The Neural Constellation Path */}
            <path 
              d={`M ${GALAXIES.map(g => `${g.cx},${g.cy}`).join(' L ')}`} 
              fill="none" 
              stroke="url(#path-gradient)" 
              strokeWidth="3" 
              opacity="0.8"
            />

            {/* Flow Indicators (Arrows) to show progression */}
            {GALAXIES.slice(0, -1).map((g, i) => {
              const nextG = GALAXIES[i+1];
              const midX = (g.cx + nextG.cx) / 2;
              return (
                <text key={`arrow-${i}`} x={midX} y={g.cy + 4} fill="#ffffff" opacity="0.5" fontSize="14" fontWeight="bold" textAnchor="middle">
                  »
                </text>
              )
            })}

            {/* Galaxies */}
            {GALAXIES.map((g, i) => (
              <g key={`galaxy-${i}`}>
                {/* Glowing Core Aura */}
                <circle cx={g.cx} cy={g.cy} r="100" fill={`url(#gal-glow-${i})`} />
                
                {/* Core Star */}
                <circle cx={g.cx} cy={g.cy} r="3" fill="#ffffff" opacity="0.9" />
                <circle cx={g.cx} cy={g.cy} r="8" fill="none" stroke={g.color} strokeWidth="1" opacity="0.6" />
                
                {/* Orbit Rings */}
                <circle cx={g.cx} cy={g.cy} r="45" fill="none" stroke="#ffffff" strokeOpacity="0.06" strokeWidth="1" />
                <circle cx={g.cx} cy={g.cy} r="95" fill="none" stroke="#ffffff" strokeOpacity="0.04" strokeWidth="1" strokeDasharray="2 4" />
                
                <text x={g.cx} y={g.cy + 115} textAnchor="middle" fill="#aaa" fontSize="9" fontFamily="monospace" letterSpacing="3" fontWeight="bold">
                  {g.name.toUpperCase()}
                </text>
              </g>
            ))}



            {/* User Dots */}
            {visibleUsers.map((u) => {
              const r = timeToRadius(u.time_on_site);
              const color = scoreToColor(u.score);
              const glowR = scoreToGlow(u.score);

              return (
                <g 
                  key={u.user_id} 
                  onClick={() => setSelectedUser(u)} 
                  className="cursor-pointer pointer-events-auto"
                  style={{
                    transition: 'transform 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: `translate(${u.x}px, ${u.y}px)`
                  }}
                >
                  {/* Halo glow for high-intent — cardiac pulse */}
                  {glowR > 0 && (
                    <circle
                      cx={0}
                      cy={0}
                      r={r + glowR}
                      fill={`url(#glow-${u.user_id})`}
                      className={`animate-telemetry-pulse ${pulseDelayClass(u.user_id)}`}
                    />
                  )}
                  {/* Intervention pulse (green flash) */}
                  {u.pulse === 'green' && (
                    <circle cx={0} cy={0} r={r + 16} fill="none" stroke="#007A33" strokeWidth="2" opacity="0.7">
                      <animate attributeName="r" from={r} to={r + 30} dur="0.8s" fill="freeze" />
                      <animate attributeName="opacity" from="0.7" to="0" dur="0.8s" fill="freeze" />
                    </circle>
                  )}
                  {/* Main dot — subtle breathe animation */}
                  <circle
                    cx={0}
                    cy={0}
                    r={r}
                    fill={color}
                    stroke={color}
                    strokeWidth="0.5"
                    className={`animate-constellation-breathe ${pulseDelayClass(u.user_id)}`}
                  />
                  {/* Score label for large dots */}
                  {r > 10 && (
                    <text x={0} y={3} textAnchor="middle" fill="#000" fontSize="8" fontWeight="bold" fontFamily="monospace">
                      {u.score}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* Zoom level indicator */}
        <div className="absolute bottom-3 right-3 font-mono text-[9px] text-warroom-text-secondary/50">
          {zoom.toFixed(1)}x
        </div>
      </div>

      {/* Intent Inspector (Session Ghost & God Mode) */}
      <AnimatePresence>
        {selectedUser && (
          <IntentInspector 
            session={{
              id: selectedUser.user_id,
              stage: (() => {
                const p = (selectedUser.last_page || '').toLowerCase();
                if (p.includes('checkout') || p.includes('payment')) return 'Transaction (Checkout)';
                if (p.includes('kyc') || p.includes('verify')) return 'KYC Verification';
                if (p.includes('invest') || p.includes('sip') || p.includes('apply')) return 'Application (SIP)';
                if (p.includes('plan')) return 'Planning';
                return 'Exploration (Landing)';
              })(),
              total_time_seconds: selectedUser.time_on_site,
              intent: selectedUser.score > 70 ? 'HIGH CHURN RISK' : 'EXPLORING',
              confidence: selectedUser.score / 100,
              profile: selectedUser.action,
              status: 'live'
            }} 
            onClose={() => setSelectedUser(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
