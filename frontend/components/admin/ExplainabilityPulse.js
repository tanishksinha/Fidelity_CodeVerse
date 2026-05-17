'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '@/contexts/SocketContext';
import { Terminal } from 'lucide-react';

export default function ExplainabilityPulse() {
  const { socket } = useSocket();
  const [logs, setLogs] = useState([]);
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    // Initial boot sequence log
    setLogs([
      { id: 'boot1', time: new Date().toLocaleTimeString(), text: '🌐 System Online. Awaiting telemetry.', type: 'info' }
    ]);
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleUpdate = (data) => {
      const time = new Date().toLocaleTimeString();
      const newLogs = [];

      // 1. Semantic Mapper Log
      if (data.universal_stage) {
        newLogs.push({
          id: `${data.session_id}-stage-${Date.now()}`,
          time,
          text: `🧠 Semantic Mapper: Classified user on ${data.universal_stage} stage.`,
          type: 'info'
        });
      }

      // 2. ML Engine Log
      if (data.churn_risk > 0) {
        newLogs.push({
          id: `${data.session_id}-ml-${Date.now()}`,
          time,
          text: `⚠️ ML Engine: ${data.session_id} Risk hit ${(data.churn_risk * 100).toFixed(0)}%. Behavior: ${data.behavior_type}.`,
          type: data.churn_risk > 0.7 ? 'alert' : 'warn'
        });
      }

      // 3. Decision Engine Log
      if (data.xai_log) {
        newLogs.push({
          id: `${data.session_id}-xai-${Date.now()}`,
          time,
          text: `💬 Decision Engine: ${data.xai_log}`,
          type: 'action'
        });
      }

      setLogs(prev => [...prev, ...newLogs].slice(-50)); // keep last 50 logs to prevent memory leak
    };

    socket.on('admin_update', handleUpdate);
    return () => socket.off('admin_update', handleUpdate);
  }, [socket]);

  useEffect(() => {
    // Auto-scroll the terminal content exclusively without moving the entire browser page
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="warroom-panel flex flex-col h-[400px]">
      <div className="warroom-header flex items-center gap-2 border-b border-warroom-border p-4">
        <Terminal size={14} className="text-fidelity-green" />
        <h2 className="font-bold">Explainability Pulse (XAI)</h2>
      </div>
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#050708] font-mono text-[11px] scrollbar-thin scrollbar-thumb-warroom-border"
      >
        <AnimatePresence initial={false}>
          {logs.map((log) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex gap-3 leading-relaxed"
            >
              <span className="text-warroom-text-secondary whitespace-nowrap">[{log.time}]</span>
              <span className={`
                ${log.type === 'alert' ? 'text-intent-bounce font-bold' : ''}
                ${log.type === 'warn' ? 'text-intent-hesitating' : ''}
                ${log.type === 'info' ? 'text-warroom-text-primary' : ''}
                ${log.type === 'action' ? 'text-fidelity-green' : ''}
              `}>
                {log.text}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
