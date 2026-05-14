'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * SessionGhost — Journey Replay Engine
 *
 * Replays throttled mouse coordinates on a mini-site preview.
 * Uses requestAnimationFrame for smooth cursor interpolation.
 * Includes timeline scrubbing and privacy mask support.
 */

// Simulated mouse events for demo when real data isn't available
const DEMO_EVENTS = [
  { type: 'move', x: 120, y: 80, time: 0 },
  { type: 'move', x: 200, y: 150, time: 800 },
  { type: 'move', x: 350, y: 120, time: 1600 },
  { type: 'click', x: 350, y: 120, time: 2000 },
  { type: 'move', x: 400, y: 200, time: 2800 },
  { type: 'move', x: 300, y: 300, time: 3600 },
  { type: 'move', x: 250, y: 350, time: 4400 },
  { type: 'scroll', x: 250, y: 350, scrollY: 200, time: 5000 },
  { type: 'move', x: 180, y: 280, time: 5800 },
  { type: 'click', x: 180, y: 280, time: 6200 },
  { type: 'move', x: 400, y: 100, time: 7000 },
  { type: 'move', x: 500, y: 180, time: 7800 },
  { type: 'move', x: 450, y: 250, time: 8600 },
  { type: 'move', x: 300, y: 400, time: 9400 },
  { type: 'click', x: 300, y: 400, time: 9800 },
];

// Privacy zones — coordinates ranges to mask
const PRIVACY_ZONES = [
  { x: 280, y: 300, w: 200, h: 40, label: 'PAN Card' },
  { x: 280, y: 350, w: 200, h: 40, label: 'Password' },
];

export default function SessionGhost({ events, sessionId }) {
  const frameEvents = events?.length > 0 ? events : DEMO_EVENTS;
  const totalDuration = frameEvents[frameEvents.length - 1]?.time || 10000;

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0–1
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [isClick, setIsClick] = useState(false);
  const [scrollOffset, setScrollOffset] = useState(0);
  const animRef = useRef(null);
  const startTimeRef = useRef(0);
  const pauseTimeRef = useRef(0);

  // Interpolate cursor position from events at given elapsed time
  const interpolate = useCallback((elapsed) => {
    const clamped = Math.min(elapsed, totalDuration);
    setProgress(clamped / totalDuration);

    // Find surrounding events
    let prevEvent = frameEvents[0];
    let nextEvent = frameEvents[0];
    for (let i = 0; i < frameEvents.length - 1; i++) {
      if (frameEvents[i].time <= clamped && frameEvents[i + 1].time >= clamped) {
        prevEvent = frameEvents[i];
        nextEvent = frameEvents[i + 1];
        break;
      }
      if (i === frameEvents.length - 2) {
        prevEvent = frameEvents[i + 1];
        nextEvent = frameEvents[i + 1];
      }
    }

    // Linear interpolation
    const dt = nextEvent.time - prevEvent.time;
    const t = dt > 0 ? (clamped - prevEvent.time) / dt : 1;
    const x = prevEvent.x + (nextEvent.x - prevEvent.x) * t;
    const y = prevEvent.y + (nextEvent.y - prevEvent.y) * t;

    setCursorPos({ x, y });

    // Flash on click events
    const clickEvent = frameEvents.find(
      (e) => e.type === 'click' && Math.abs(e.time - clamped) < 100
    );
    setIsClick(!!clickEvent);

    // Handle scroll
    const lastScroll = frameEvents
      .filter((e) => e.type === 'scroll' && e.time <= clamped)
      .pop();
    setScrollOffset(lastScroll?.scrollY || 0);

    return clamped >= totalDuration;
  }, [frameEvents, totalDuration]);

  // Animation loop
  const tick = useCallback((timestamp) => {
    if (!startTimeRef.current) startTimeRef.current = timestamp;
    const elapsed = (timestamp - startTimeRef.current) + pauseTimeRef.current;
    const done = interpolate(elapsed);

    if (done) {
      setIsPlaying(false);
      return;
    }
    animRef.current = requestAnimationFrame(tick);
  }, [interpolate]);

  useEffect(() => {
    if (isPlaying) {
      startTimeRef.current = 0;
      animRef.current = requestAnimationFrame(tick);
    }
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying, tick]);

  const handlePlay = () => {
    if (progress >= 1) {
      pauseTimeRef.current = 0;
      setProgress(0);
    }
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
    pauseTimeRef.current = progress * totalDuration;
    if (animRef.current) cancelAnimationFrame(animRef.current);
  };

  const handleReset = () => {
    setIsPlaying(false);
    pauseTimeRef.current = 0;
    startTimeRef.current = 0;
    setProgress(0);
    setCursorPos({ x: frameEvents[0]?.x || 0, y: frameEvents[0]?.y || 0 });
    setScrollOffset(0);
    if (animRef.current) cancelAnimationFrame(animRef.current);
  };

  const handleScrub = (e) => {
    const val = parseFloat(e.target.value);
    setProgress(val);
    pauseTimeRef.current = val * totalDuration;
    interpolate(val * totalDuration);
  };

  // Check if cursor is in a privacy zone
  const inPrivacyZone = PRIVACY_ZONES.some(
    (z) => cursorPos.x >= z.x && cursorPos.x <= z.x + z.w &&
           cursorPos.y >= z.y && cursorPos.y <= z.y + z.h
  );

  // Event markers for the timeline
  const clickMarkers = frameEvents
    .filter((e) => e.type === 'click')
    .map((e) => ({ pos: e.time / totalDuration, type: 'click' }));

  return (
    <section className="rounded-lg border border-warroom-border bg-warroom-bg overflow-hidden">
      <div className="flex items-center justify-between border-b border-warroom-border px-4 py-2">
        <h3 className="flex items-center gap-2 text-label text-warroom-text-secondary">
          <ShieldAlert size={12} className="text-intent-bounce" />
          Session Ghost — Journey Replay
        </h3>
        <span className="font-mono text-[9px] text-warroom-text-secondary">
          {sessionId || 'DEMO'}
        </span>
      </div>

      {/* Mini-Site Preview */}
      <div
        className="relative bg-[#0d0f0e] overflow-hidden"
        style={{ height: 450, position: 'relative' }}
      >
        {/* Mock Site Frame */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ transform: `translateY(-${scrollOffset}px)`, transition: 'transform 0.3s ease' }}
        >
          {/* Simulated site elements */}
          <div className="p-4 space-y-4">
            <div className="h-10 w-48 rounded bg-fidelity-green/20" />
            <div className="h-6 w-72 rounded bg-warroom-border/30" />
            <div className="h-4 w-96 rounded bg-warroom-border/20" />
            <div className="h-4 w-80 rounded bg-warroom-border/20" />
            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="h-24 rounded bg-warroom-border/15" />
              <div className="h-24 rounded bg-warroom-border/15" />
              <div className="h-24 rounded bg-warroom-border/15" />
            </div>
            <div className="mt-6 h-6 w-40 rounded bg-warroom-border/30" />
            <div className="h-4 w-64 rounded bg-warroom-border/20" />
            <div className="mt-4 space-y-2">
              <div className="h-8 w-80 rounded bg-warroom-border/15" />
              <div className="h-8 w-80 rounded bg-warroom-border/15" />
            </div>
            {/* Privacy-masked fields */}
            {PRIVACY_ZONES.map((z, i) => (
              <div
                key={i}
                className="absolute flex items-center justify-center bg-black border border-intent-bounce/30 rounded"
                style={{ left: z.x, top: z.y, width: z.w, height: z.h }}
              >
                <span className="text-[8px] font-mono text-intent-bounce/60 uppercase tracking-widest">
                  {z.label} — Masked
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Shadow Cursor */}
        <motion.div
          className={cn(
            'absolute z-10 rounded-full pointer-events-none',
            isClick ? 'bg-intent-bounce shadow-glow-red' : 'bg-intent-bounce/60',
          )}
          style={{
            width: isClick ? 20 : 12,
            height: isClick ? 20 : 12,
            left: cursorPos.x - (isClick ? 10 : 6),
            top: cursorPos.y - (isClick ? 10 : 6),
          }}
          animate={isClick ? { scale: [1, 1.8, 1] } : {}}
          transition={{ duration: 0.3 }}
        />

        {/* Privacy mask indicator */}
        {inPrivacyZone && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded bg-intent-bounce/20 border border-intent-bounce/30 px-2 py-1 text-[8px] font-mono text-intent-bounce uppercase">
            <ShieldAlert size={10} />
            Privacy Zone Active
          </div>
        )}
      </div>

      {/* Timeline + Controls */}
      <div className="border-t border-warroom-border bg-warroom-surface px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Play/Pause */}
          <button
            onClick={isPlaying ? handlePause : handlePlay}
            className="flex h-7 w-7 items-center justify-center rounded bg-warroom-bg text-fidelity-green hover:bg-warroom-border transition"
          >
            {isPlaying ? <Pause size={12} /> : <Play size={12} />}
          </button>
          <button
            onClick={handleReset}
            className="flex h-7 w-7 items-center justify-center rounded bg-warroom-bg text-warroom-text-secondary hover:text-white transition"
          >
            <RotateCcw size={12} />
          </button>

          {/* Timeline Scrubber */}
          <div className="relative flex-1 h-6 flex items-center">
            <input
              type="range"
              min="0"
              max="1"
              step="0.001"
              value={progress}
              onChange={handleScrub}
              className="w-full h-1 appearance-none rounded-full bg-warroom-border accent-intent-bounce cursor-pointer"
            />
            {/* Event markers */}
            {clickMarkers.map((m, i) => (
              <div
                key={i}
                className="absolute top-0 h-full flex items-center pointer-events-none"
                style={{ left: `${m.pos * 100}%` }}
              >
                <div className="h-3 w-0.5 bg-intent-analyzing rounded-full" />
              </div>
            ))}
          </div>

          <span className="font-mono text-[9px] text-warroom-text-secondary w-10 text-right">
            {((progress * totalDuration) / 1000).toFixed(1)}s
          </span>
        </div>
      </div>
    </section>
  );
}
