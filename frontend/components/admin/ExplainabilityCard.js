'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * ExplainabilityCard — AI Audit Trail
 *
 * Shows exactly WHY the AI chose a specific intervention tone and message.
 * Renders as an accordion below the dispatch row when "ℹ️ Why?" is clicked.
 */
export default function ExplainabilityCard({ data, isOpen, onToggle }) {
  // Build explainability data from session data (real or derived)
  const trigger = data?.primary_event || data?.action || 'EXIT_INTENT_DETECTED';
  const evidence = data?.supporting_data || [
    `Time on page: ${data?.total_time_seconds || 0}s`,
    `Scroll depth: ${data?.scroll_depth || '0%'}`,
    `Erratic mouse: ${(data?.erratic_mouse || 0) > 0 ? 'YES' : 'NO'}`,
    `Exit velocity: ${data?.exit_velocity || 'N/A'}`,
  ];
  const score = data?.intent_score ?? data?.confidence ?? 0;
  const scorePercent = score > 1 ? score : Math.round(score * 100);
  const tone = data?.ai_tone_selected || data?.intent || 'Empathetic / Reassuring';

  const scoreColor = scorePercent < 40
    ? 'text-synaptic-green'
    : scorePercent < 70
      ? 'text-intent-hesitate'
      : 'text-intent-bounce';

  return (
    <div className="border-t border-warroom-border/50">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-5 py-2 text-[9px] font-bold uppercase tracking-widest text-intent-analyzing/70 hover:text-intent-analyzing transition-colors"
      >
        <BrainCircuit size={10} />
        AI Logic
        {isOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="grid gap-3 px-5 pb-4 md:grid-cols-2">
              {/* The Trigger */}
              <div className="rounded border border-warroom-border bg-warroom-bg p-3">
                <p className="text-[8px] font-bold uppercase tracking-widest text-warroom-text-secondary mb-1.5">
                  Trigger Event
                </p>
                <p className="font-mono text-xs text-intent-bounce font-bold">{trigger}</p>
              </div>

              {/* Intent Score */}
              <div className="rounded border border-warroom-border bg-warroom-bg p-3">
                <p className="text-[8px] font-bold uppercase tracking-widest text-warroom-text-secondary mb-1.5">
                  Confidence Level
                </p>
                <div className="flex items-center gap-2">
                  <span className={cn('font-mono text-xl font-black', scoreColor)}>
                    {scorePercent}
                  </span>
                  <span className="text-[9px] text-warroom-text-secondary">/100</span>
                  <div className="flex-1 h-1.5 rounded-full bg-warroom-border overflow-hidden ml-2">
                    <div
                      className={cn('h-full rounded-full', scorePercent < 40 ? 'bg-synaptic-green' : scorePercent < 70 ? 'bg-intent-hesitate' : 'bg-intent-bounce')}
                      style={{ width: `${scorePercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Behavioral Evidence */}
              <div className="rounded border border-warroom-border bg-warroom-bg p-3">
                <p className="text-[8px] font-bold uppercase tracking-widest text-warroom-text-secondary mb-1.5">
                  Behavioral Evidence
                </p>
                <ul className="space-y-1">
                  {evidence.map((point, i) => (
                    <li key={i} className="flex items-start gap-1.5 font-mono text-[10px] text-warroom-text-secondary">
                      <span className="text-intent-analyzing mt-0.5">&#x2022;</span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Tone Rationale */}
              <div className="rounded border border-warroom-border bg-warroom-bg p-3">
                <p className="text-[8px] font-bold uppercase tracking-widest text-warroom-text-secondary mb-1.5">
                  AI Tone Selected
                </p>
                <p className="font-mono text-xs text-intent-analyzing font-bold">{tone}</p>
                <p className="mt-1 text-[9px] text-warroom-text-secondary/70 italic">
                  Tone selected based on behavioral friction signals and user engagement pattern.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
