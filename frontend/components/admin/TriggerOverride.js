'use client';

import { useState } from 'react';
import { Activity, CheckCircle2, Play, Zap, Send } from 'lucide-react';
import { cn } from '@/lib/cn';

export default function TriggerOverride({ onTrigger, onDispatch, status: parentStatus }) {
  const [localStatus, setLocalStatus] = useState('idle'); // idle | processing

  const handleRunEngine = async () => {
    setLocalStatus('processing');
    await onTrigger?.();
    setLocalStatus('idle');
  };

  const handleDispatch = async () => {
    setLocalStatus('dispatching');
    await onDispatch?.();
    setLocalStatus('idle');
  };

  const isSent = parentStatus === 'sent';
  const isReady = parentStatus === 'ready';

  return (
    <div className="warroom-panel p-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="font-bold">Engine Command</h2>
          <p className="mt-1 text-sublabel">Execute behavioral intent analysis.</p>
        </div>
        <Zap className={cn(isSent ? "text-synaptic-green" : "text-intent-hesitate")} size={22} />
      </div>

      <div className="space-y-3">
        {!isSent && !isReady && (
          <button
            type="button"
            onClick={handleRunEngine}
            disabled={localStatus === 'processing'}
            className={cn(
              'flex min-h-[60px] w-full items-center justify-center gap-3 rounded border border-synaptic-green bg-synaptic-green/10 text-[10px] font-black uppercase tracking-[0.2em] text-synaptic-green transition hover:bg-synaptic-green/20',
              localStatus === 'processing' && 'opacity-50'
            )}
          >
            {localStatus === 'processing' ? (
              <>
                <Activity className="animate-spin" size={16} />
                Processing Telemetry...
              </>
            ) : (
              <>
                <Play size={16} />
                Run AI Engine
              </>
            )}
          </button>
        )}

        {isReady && !isSent && (
          <button
            type="button"
            onClick={handleDispatch}
            disabled={localStatus === 'dispatching'}
            className={cn(
              'flex min-h-[60px] w-full items-center justify-center gap-3 rounded bg-synaptic-green text-[10px] font-black uppercase tracking-[0.2em] text-white transition hover:bg-[#009940] shadow-glow-green',
              localStatus === 'dispatching' && 'opacity-50'
            )}
          >
            {localStatus === 'dispatching' ? (
              <>
                <Activity className="animate-spin" size={16} />
                Dispatching Emails...
              </>
            ) : (
              <>
                <Send size={16} />
                Dispatch Interventions
              </>
            )}
          </button>
        )}

        {isSent && (
          <div className="flex min-h-[60px] w-full items-center justify-center gap-3 rounded border border-synaptic-green bg-synaptic-green/5 text-[10px] font-black uppercase tracking-[0.2em] text-synaptic-green">
            <CheckCircle2 size={16} />
            Operations Complete
          </div>
        )}
      </div>

      <div className="mt-5 warroom-code">
        model: gpt-4o-behavioral<br />
        window: real-time telemetry<br />
        status: {isSent ? 'ALL_SENT' : isReady ? 'READY_TO_DISPATCH' : 'AWAITING_TRIGGER'}
      </div>
    </div>
  );
}
