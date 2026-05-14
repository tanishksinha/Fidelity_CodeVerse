'use client';

import { motion } from 'framer-motion';
import { BrainCircuit, Mail, X, Activity } from 'lucide-react';
import SessionGhost from './SessionGhost';
import ManualNudge from './ManualNudge';

export default function IntentInspector({ session, onClose }) {
  if (!session) return null;

  const intent = session.intent || session.ai_intent || 'Pending Analysis';
  const confidence = session.confidence || session.ai_intent_confidence || 0;
  const profile = session.profile || session.ai_profile || 'User behavioral signature is currently being analyzed by the semantic intent engine.';
  const subject = session.email_subject || session.ai_email_subject || session.emailSubject || 'Drafting...';
  const body = session.email_body || session.ai_email_body || session.emailBody || '';

  return (
    <motion.aside
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
      className="fixed bottom-0 left-0 z-50 flex w-full h-[80vh] md:h-full md:max-w-[430px] md:right-0 md:left-auto md:top-0 flex-col rounded-t-3xl md:rounded-none border-t md:border-t-0 md:border-l border-warroom-border bg-warroom-surface shadow-2xl overflow-hidden"
    >
      {/* Visual Drag Handle (Mobile only) */}
      <div className="w-full flex justify-center pt-3 pb-1 md:hidden bg-warroom-bg cursor-grab">
        <div className="w-12 h-1.5 rounded-full bg-warroom-border" />
      </div>

      {/* Header */}
      <div className="flex items-start justify-between border-b border-warroom-border bg-warroom-bg p-5">
        <div>
          <p className="font-mono text-sm font-bold text-white">Session {session.id}</p>
          <p className="mt-2 inline-flex rounded-md bg-intent-bounce/10 px-2 py-1 text-xs font-bold uppercase tracking-[0.14em] text-intent-bounce">
            Abandoned at {session.stage}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-2 text-warroom-text-secondary hover:text-white transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        {/* Raw Telemetry Block */}
        <section>
          <h3 className="mb-3 text-label text-warroom-text-secondary">Raw Telemetry</h3>
          <pre className="warroom-code">
{`> session_id: ${session.id}
> time_on_site: ${session.total_time_seconds}s
> scroll_depth: ${session.scroll_depth || session.scrollDepth}
> erratic_mouse: ${session.erratic_mouse > 0 ? 'DETECTED' : 'LOW'}
> exit_condition: ${session.exit_condition || 'tab_hidden'}
> exit_velocity: ${session.exit_velocity}`}
          </pre>
        </section>

        {/* AI Semantic Intent */}
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-label text-warroom-text-secondary">
            <BrainCircuit size={14} className="text-intent-analyzing" />
            AI Semantic Intent
          </h3>
          <motion.div
            className="rounded-lg border border-intent-analyzing/30 bg-intent-analyzing/10 p-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <p className="text-lg font-bold text-white uppercase italic">{intent}</p>
            <p className="mt-3 text-sm leading-6 text-warroom-text-secondary">{profile}</p>
          </motion.div>
        </section>

        {/* Generated Intervention Email */}
        <section className="rounded-lg border border-warroom-border bg-warroom-bg p-4">
          <h3 className="flex items-center gap-2 text-label text-warroom-text-secondary">
            <Mail size={14} className="text-fidelity-green" />
            Generated Intervention
          </h3>
          {session.status === 'processed' || session.emailSubject ? (
            <>
              <p className="mt-3 text-sm font-bold text-white">{subject}</p>
              <div className="mt-3 space-y-2 text-sm leading-6 text-warroom-text-secondary">
                <p>Dear Investor,</p>
                <p>{body}</p>
                <p className="text-warroom-text-secondary/60 italic">Tone: reassuring, specific to observed friction.</p>
              </div>
            </>
          ) : (
            <div className="mt-4 flex items-center gap-3 text-xs text-warroom-text-secondary italic">
              <Activity className="animate-pulse" size={14} />
              Waiting for engine processing...
            </div>
          )}
        </section>

        {/* Confidence Score */}
        {confidence > 0 && (
          <section className="rounded-lg border border-warroom-border bg-warroom-bg p-4">
            <h3 className="text-label text-warroom-text-secondary">AI Confidence</h3>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1 h-2 rounded-full bg-warroom-border overflow-hidden">
                <motion.div
                  className="h-full bg-intent-analyzing rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${confidence * 100}%` }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                />
              </div>
              <span className="font-mono text-sm font-bold text-intent-analyzing">
                {Math.round(confidence * 100)}%
              </span>
            </div>
          </section>
        )}

        {/* Manual Nudge (God Mode) */}
        <ManualNudge userId={session.id} userName="Investor" />

        {/* Session Ghost */}
        <SessionGhost events={[]} sessionId={session.id} />
      </div>
    </motion.aside>
  );
}
