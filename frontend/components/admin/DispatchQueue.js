'use client';

import React, { useState } from 'react';
import { Send, Info } from 'lucide-react';
import { cn } from '@/lib/cn';
import ExplainabilityCard from './ExplainabilityCard';

export default function DispatchQueue({ queue, dispatchState, onSessionClick }) {
  const [openExplainId, setOpenExplainId] = useState(null);

  const toggleExplain = (e, id) => {
    e.stopPropagation();
    setOpenExplainId(openExplainId === id ? null : id);
  };

  return (
    <div className="warroom-panel xl:col-span-2">
      <div className="warroom-header">
        <div>
          <h2 className="font-bold">Dispatch Queue</h2>
          <p className="mt-1 text-sublabel">
            AI-generated emails mapped to individual hesitation signatures.
          </p>
        </div>
        <Send className="text-intent-analyzing" size={20} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-warroom-border bg-warroom-bg text-xs uppercase tracking-[0.12em] text-warroom-text-secondary">
            <tr>
              <th className="px-5 py-3">Session</th>
              <th className="px-5 py-3">AI intent</th>
              <th className="px-5 py-3">Telemetry Context</th>
              <th className="px-5 py-3">Email draft</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Audit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-warroom-border">
            {queue.map((row) => {
              const intent = row.intent || row.ai_intent || 'QUEUED';
              const subject = row.email_subject || row.ai_email_subject || row.emailSubject || '---';
              const status = row.dispatch_status === 'dispatched' ? 'dispatched' : row.status;

              return (
                <React.Fragment key={row.id}>
                  <tr
                    onClick={() => onSessionClick?.(row)}
                    className="cursor-pointer transition-colors hover:bg-warroom-bg"
                  >
                  <td className="px-5 py-4 font-mono text-white text-xs">{row.id}</td>
                  <td className="px-5 py-4">
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-widest",
                      intent === 'QUEUED' ? 'text-warroom-text-secondary' : 'text-intent-analyzing'
                    )}>
                      {intent}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-mono text-[10px] text-warroom-text-secondary">
                    {row.total_time_seconds || 0}s / {row.scroll_depth || row.scrollPercent || '0%'} scroll
                  </td>
                  <td className="px-5 py-4 text-xs text-warroom-text-primary truncate max-w-[240px]">
                    {subject}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={status} />
                  </td>
                  <td className="px-5 py-4 text-right">
                    {(status === 'dispatched' || status === 'processed') && (
                      <button
                        onClick={(e) => toggleExplain(e, row.id)}
                        className="inline-flex items-center gap-1 rounded border border-intent-analyzing/30 bg-intent-analyzing/10 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-intent-analyzing transition hover:bg-intent-analyzing/20"
                      >
                        <Info size={10} />
                        Why?
                      </button>
                    )}
                  </td>
                </tr>
                {openExplainId === row.id && (
                  <tr>
                    <td colSpan={6} className="bg-warroom-bg/50 p-0">
                      <ExplainabilityCard
                        data={row}
                        isOpen={true}
                        onToggle={(e) => toggleExplain(e, row.id)}
                      />
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  return (
    <span
      className={cn(
        'warroom-badge',
        status === 'dispatched' && 'border-fidelity-green/30 bg-fidelity-green/10 text-fidelity-green',
        status === 'processed' && 'border-intent-analyzing/30 bg-intent-analyzing/10 text-intent-analyzing',
        status === 'abandoned' && 'border-intent-hesitate/30 bg-intent-hesitate/10 text-intent-hesitate'
      )}
    >
      {status}
    </span>
  );
}
