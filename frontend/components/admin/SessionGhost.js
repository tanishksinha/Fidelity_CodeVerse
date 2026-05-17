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
 * Includes timeline scrubbing, privacy mask, and narrative annotations.
 */

// ─── Rich Narrative Journey (~35 events) ───
// Tells the story: Land → Read → Engage Chart → Fee Anxiety → KYC Friction → Exit
const DEMO_EVENTS = [
  // ACT 1: Landing & Orientation (0–4s)
  { type: 'move', x: 80,  y: 30,  time: 0 },        // Cursor appears at nav
  { type: 'move', x: 120, y: 30,  time: 400 },       // Scanning nav items
  { type: 'move', x: 250, y: 30,  time: 800 },       // Moving across nav
  { type: 'move', x: 180, y: 80,  time: 1400 },      // Drops to hero text
  { type: 'move', x: 200, y: 110, time: 2200 },      // Reading intro copy slowly
  { type: 'move', x: 220, y: 130, time: 3200 },      // Still reading...
  { type: 'click', x: 220, y: 130, time: 3600 },     // Clicks "Learn More"

  // ACT 2: SIP Chart Engagement (4–9s)
  { type: 'scroll', x: 220, y: 130, scrollY: 180, time: 4000 },  // Scrolls to chart
  { type: 'move', x: 300, y: 160, time: 4800 },      // Enters chart area
  { type: 'move', x: 350, y: 145, time: 5400 },      // Tracing the green SIP line
  { type: 'move', x: 400, y: 130, time: 6000 },      // Following upward trend
  { type: 'move', x: 440, y: 120, time: 6600 },      // Peak of SIP curve
  { type: 'move', x: 460, y: 115, time: 7200 },      // Lingering on terminal value
  { type: 'click', x: 460, y: 115, time: 7600 },     // Clicks on chart tooltip

  // ACT 3: Fund Cards — Growing Interest (9–13s)
  { type: 'scroll', x: 460, y: 115, scrollY: 400, time: 8400 },  // Scrolls to fund cards
  { type: 'move', x: 140, y: 200, time: 9200 },      // Moves to first fund card
  { type: 'move', x: 160, y: 240, time: 9800 },      // Reading fund name
  { type: 'click', x: 200, y: 280, time: 10200 },    // Clicks "Know More"
  { type: 'move', x: 300, y: 200, time: 10800 },     // Moves to second card
  { type: 'move', x: 320, y: 240, time: 11400 },     // Comparing CAGR values

  // ACT 4: Fee Anxiety — Speed Increases (13–18s)
  { type: 'scroll', x: 320, y: 240, scrollY: 520, time: 12000 }, // Scrolls to fee details
  { type: 'move', x: 200, y: 310, time: 12600 },     // Expense ratio section
  { type: 'move', x: 280, y: 340, time: 13000 },     // Faster movement now
  { type: 'move', x: 310, y: 355, time: 13300 },     // "Exit Load: 1% before 12mo"
  { type: 'move', x: 315, y: 355, time: 13600 },     // Hovering on exit load...
  { type: 'move', x: 318, y: 356, time: 14200 },     // Still hovering (4s dwell!)
  { type: 'move', x: 320, y: 357, time: 14800 },     // Micro-movements = reading carefully
  { type: 'move', x: 200, y: 310, time: 15100 },     // Jerks back up (erratic)
  { type: 'move', x: 350, y: 370, time: 15400 },     // Shoots down (erratic)
  { type: 'move', x: 180, y: 300, time: 15700 },     // Back up again (scroll thrash)

  // ACT 5: PAN Input — Privacy Zone (18–21s)
  { type: 'scroll', x: 180, y: 300, scrollY: 600, time: 16200 }, // Scrolls to form area
  { type: 'move', x: 300, y: 320, time: 17000 },     // Approaches PAN field
  { type: 'move', x: 320, y: 330, time: 17600 },     // Cursor enters privacy zone
  { type: 'move', x: 340, y: 335, time: 18200 },     // Hovering over masked field
  { type: 'move', x: 330, y: 330, time: 18800 },     // Hesitating...

  // ACT 6: Exit Velocity — Abandonment (21–23s)
  { type: 'move', x: 300, y: 250, time: 19200 },     // Pulls away quickly
  { type: 'move', x: 400, y: 100, time: 19500 },     // Flying toward top-right
  { type: 'move', x: 520, y: 30,  time: 19800 },     // Exit velocity spike
  { type: 'move', x: 560, y: 10,  time: 20000 },     // Cursor at tab close zone
];

// ─── Timeline Annotations ───
const DEMO_ANNOTATIONS = [
  { time: 3600,  label: 'CTA CLICK' },
  { time: 7600,  label: 'CHART ENGAGEMENT' },
  { time: 10200, label: 'FUND INTEREST' },
  { time: 14200, label: '⚠ EXIT LOAD DWELL' },
  { time: 15700, label: '🌀 SCROLL THRASH' },
  { time: 18200, label: '🔒 PRIVACY ZONE' },
  { time: 19800, label: '🚀 EXIT VELOCITY' },
];

// Privacy zones — coordinate ranges to mask
const PRIVACY_ZONES = [
  { x: 280, y: 300, w: 200, h: 40, label: 'PAN Card' },
  { x: 280, y: 350, w: 200, h: 40, label: 'Password' },
];

export default function SessionGhost({ events, sessionId }) {
  const frameEvents = events?.length > 0 ? events : DEMO_EVENTS;
  const annotations = events?.length > 0 ? [] : DEMO_ANNOTATIONS;
  const totalDuration = frameEvents[frameEvents.length - 1]?.time || 10000;

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0–1
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [isClick, setIsClick] = useState(false);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [activeAnnotation, setActiveAnnotation] = useState(null);
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

    // Show nearest annotation
    const nearestAnnotation = annotations.find(
      (a) => Math.abs(a.time - clamped) < 600
    );
    setActiveAnnotation(nearestAnnotation || null);

    return clamped >= totalDuration;
  }, [frameEvents, totalDuration, annotations]);

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
    setActiveAnnotation(null);
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

  // Annotation markers for the timeline
  const annotationMarkers = annotations.map((a) => ({
    pos: a.time / totalDuration,
    label: a.label,
  }));

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
            {/* Nav bar */}
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 rounded bg-synaptic-green/40" />
              <div className="h-4 w-20 rounded bg-warroom-border/30" />
              <div className="ml-auto flex gap-4">
                <div className="h-3 w-16 rounded bg-warroom-border/20" />
                <div className="h-3 w-16 rounded bg-warroom-border/20" />
                <div className="h-3 w-16 rounded bg-warroom-border/20" />
              </div>
            </div>
            {/* Hero Section */}
            <div className="mt-4">
              <div className="h-6 w-72 rounded bg-warroom-border/30" />
              <div className="mt-2 h-4 w-96 rounded bg-warroom-border/20" />
              <div className="mt-1 h-4 w-80 rounded bg-warroom-border/15" />
              <div className="mt-3 h-8 w-28 rounded bg-synaptic-green/25" /> {/* CTA button */}
            </div>
            {/* Chart Area */}
            <div className="mt-4 rounded border border-warroom-border/20 p-3">
              <div className="h-4 w-40 rounded bg-warroom-border/25 mb-2" />
              <div className="h-32 w-full rounded bg-warroom-border/10 relative overflow-hidden">
                {/* Simulated chart line */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 500 130">
                  <polyline
                    points="10,110 60,100 120,90 180,95 240,70 300,55 360,40 420,25 480,15"
                    fill="none" stroke="#007A33" strokeWidth="2" opacity="0.4"
                  />
                  <polyline
                    points="10,110 60,105 120,100 180,98 240,85 300,78 360,68 420,60 480,50"
                    fill="none" stroke="#6B7280" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.3"
                  />
                </svg>
              </div>
            </div>
            {/* Fund Cards */}
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="h-28 rounded bg-warroom-border/12 p-2">
                <div className="h-3 w-16 rounded bg-warroom-border/25" />
                <div className="mt-2 h-3 w-24 rounded bg-warroom-border/20" />
                <div className="mt-auto pt-4 h-6 w-full rounded bg-synaptic-green/15" />
              </div>
              <div className="h-28 rounded bg-warroom-border/12 p-2">
                <div className="h-3 w-16 rounded bg-warroom-border/25" />
                <div className="mt-2 h-3 w-24 rounded bg-warroom-border/20" />
                <div className="mt-auto pt-4 h-6 w-full rounded bg-synaptic-green/15" />
              </div>
              <div className="h-28 rounded bg-warroom-border/12 p-2">
                <div className="h-3 w-16 rounded bg-warroom-border/25" />
                <div className="mt-2 h-3 w-24 rounded bg-warroom-border/20" />
                <div className="mt-auto pt-4 h-6 w-full rounded bg-synaptic-green/15" />
              </div>
            </div>
            {/* Fee Section */}
            <div className="mt-4">
              <div className="h-4 w-32 rounded bg-warroom-border/25" />
              <div className="mt-2 h-3 w-48 rounded bg-intent-bounce/20" /> {/* Exit Load */}
              <div className="mt-1 h-3 w-40 rounded bg-warroom-border/15" />
            </div>
            {/* Form Fields */}
            <div className="mt-4 space-y-2">
              <div className="h-8 w-80 rounded bg-warroom-border/12 border border-warroom-border/20" />
              <div className="h-8 w-80 rounded bg-warroom-border/12 border border-warroom-border/20" />
            </div>
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

        {/* Cursor trail (last 3 positions ghosted) */}
        <div
          className="absolute z-5 rounded-full bg-intent-bounce/20 pointer-events-none"
          style={{ width: 8, height: 8, left: cursorPos.x - 4, top: cursorPos.y - 4, transition: 'all 0.2s ease', opacity: 0.3 }}
        />

        {/* Active annotation pill */}
        {activeAnnotation && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute top-3 right-3 rounded-full bg-intent-analyzing/20 border border-intent-analyzing/40 px-3 py-1 text-[9px] font-mono font-bold text-intent-analyzing uppercase tracking-wider z-20"
          >
            {activeAnnotation.label}
          </motion.div>
        )}

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
            className="flex h-8 w-8 min-w-[44px] min-h-[44px] items-center justify-center rounded bg-warroom-bg text-synaptic-green hover:bg-warroom-border transition"
          >
            {isPlaying ? <Pause size={12} /> : <Play size={12} />}
          </button>
          <button
            onClick={handleReset}
            className="flex h-8 w-8 min-w-[44px] min-h-[44px] items-center justify-center rounded bg-warroom-bg text-warroom-text-secondary hover:text-white transition"
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
            {/* Click event markers */}
            {clickMarkers.map((m, i) => (
              <div
                key={`c-${i}`}
                className="absolute top-0 h-full flex items-center pointer-events-none"
                style={{ left: `${m.pos * 100}%` }}
              >
                <div className="h-3 w-0.5 bg-intent-analyzing rounded-full" />
              </div>
            ))}
            {/* Annotation markers */}
            {annotationMarkers.map((m, i) => (
              <div
                key={`a-${i}`}
                className="absolute top-0 h-full flex items-center pointer-events-none"
                style={{ left: `${m.pos * 100}%` }}
              >
                <div className="h-4 w-0.5 bg-intent-bounce/60 rounded-full" />
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
