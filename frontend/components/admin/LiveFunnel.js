'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';

export default function LiveFunnel({ funnel, onNodeClick }) {
  return (
    <div className="warroom-panel">
      <div className="warroom-header">
        <div>
          <h2 className="font-bold">Live Funnel Node Graph</h2>
          <p className="mt-1 text-sublabel">
            Click the bounce node or a session to inspect raw telemetry.
          </p>
        </div>
        <span className="warroom-badge border-fidelity-green/30 bg-fidelity-green/10 text-fidelity-green">
          STREAMING
        </span>
      </div>
      <div className="overflow-x-auto p-6">
        <div className="flex min-w-[760px] items-center justify-between gap-5 py-8">
          {funnel.map((node, index) => (
            <div key={node.label} className="flex flex-1 items-center gap-5 last:flex-none">
              <FunnelNode
                node={node}
                onClick={() => onNodeClick?.(node)}
              />
              {index < funnel.length - 1 && (
                <motion.div
                  className="h-px flex-1 bg-warroom-border"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: index * 0.2, duration: 0.6 }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FunnelNode({ node, onClick }) {
  const config = {
    healthy: {
      border: 'border-fidelity-green',
      text: 'text-fidelity-green',
      glow: 'shadow-glow-green',
      pulse: 'bg-fidelity-green',
    },
    hesitating: {
      border: 'border-intent-hesitate',
      text: 'text-intent-hesitate',
      glow: 'shadow-glow-amber',
      pulse: 'bg-intent-hesitate',
    },
    loss: {
      border: 'border-intent-bounce',
      text: 'text-intent-bounce',
      glow: 'shadow-glow-red',
      pulse: 'bg-intent-bounce',
    },
  }[node.status];

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex w-32 flex-col items-center gap-3 text-center"
    >
      {(node.status === 'hesitating' || node.status === 'loss') && (
        <motion.span
          className={cn('absolute top-1 h-20 w-20 rounded-full opacity-30 blur-md', config.pulse)}
          animate={{ scale: [1, 1.25, 1], opacity: [0.2, 0.55, 0.2] }}
          transition={{ duration: node.status === 'loss' ? 1.25 : 1.8, repeat: Infinity }}
        />
      )}
      <motion.span
        className={cn(
          'relative flex h-20 w-20 items-center justify-center rounded-lg border-2 bg-warroom-bg font-mono text-sm font-bold',
          config.border,
          config.text,
          config.glow
        )}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        whileHover={{ scale: 1.08 }}
      >
        {node.users.toLocaleString()}
      </motion.span>
      <span>
        <span className="block text-xs font-bold uppercase tracking-[0.14em] text-warroom-text-primary">
          {node.label}
        </span>
        <span className="mt-1 block text-sublabel">{node.caption}</span>
      </span>
    </button>
  );
}
