'use client';

import { motion } from 'framer-motion';

export default function LiveTelemetryBar({ events }) {
  return (
    <div className="border-b border-warroom-border bg-[#050606]/90 px-5 py-3 lg:px-8">
      <div className="flex gap-8 overflow-hidden font-mono text-xs text-warroom-text-secondary">
        {events.map((event, i) => (
          <motion.span
            key={event}
            className="min-w-fit"
            animate={{ opacity: [0.45, 1, 0.45] }}
            transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.3 }}
          >
            <span className="text-fidelity-green">&gt;</span> {event}
          </motion.span>
        ))}
      </div>
    </div>
  );
}
