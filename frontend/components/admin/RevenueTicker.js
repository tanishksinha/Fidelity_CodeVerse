'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, Zap } from 'lucide-react';
import { useSocket } from '@/contexts/SocketContext';

/**
 * RevenueTicker — "Butterfly Effect Calculator"
 * 
 * A massive, glowing revenue counter at the top of the dashboard that
 * proves real-time ROI. Subscribes to WebSocket `conversion_recovered`
 * events and ticks up like a stock ticker.
 */
export default function RevenueTicker() {
  const { socket } = useSocket();
  const [revenue, setRevenue] = useState(0);
  const [atRisk, setAtRisk] = useState(0);
  const [normalConversions, setNormalConversions] = useState(0);
  const [smartConversions, setSmartConversions] = useState(0);
  const [nudgesSent, setNudgesSent] = useState(0);
  const [nudgesConverted, setNudgesConverted] = useState(0);

  // Framer Motion animated value for the slot-machine effect
  const motionRevenue = useMotionValue(0);
  const displayRevenue = useTransform(motionRevenue, (v) =>
    Math.floor(v).toLocaleString('en-IN')
  );

  // Subscribe to live conversion events
  useEffect(() => {
    if (!socket) return;

    const handleConversion = (data) => {
      const amount = data?.amount || 5000;
      setRevenue((prev) => {
        const next = prev + amount;
        animate(motionRevenue, next, { duration: 1.2, ease: 'easeOut' });
        return next;
      });
      setSmartConversions((prev) => prev + 1);
      setNudgesConverted((prev) => prev + 1);
    };

    const handleAtRisk = (data) => {
      const amount = data?.amount || 5000;
      setAtRisk((prev) => prev + amount);
      setNudgesSent((prev) => prev + 1);
    };

    const handleNormalConversion = () => {
      setNormalConversions((prev) => prev + 1);
    };

    socket.on('conversion_recovered', handleConversion);
    socket.on('revenue_at_risk', handleAtRisk);
    socket.on('normal_conversion', handleNormalConversion);

    return () => {
      socket.off('conversion_recovered', handleConversion);
      socket.off('revenue_at_risk', handleAtRisk);
      socket.off('normal_conversion', handleNormalConversion);
    };
  }, [socket, motionRevenue]);

  const successRate = nudgesSent > 0
    ? Math.round((nudgesConverted / nudgesSent) * 100)
    : 0;

  const chartData = [
    { name: 'Normal', value: normalConversions },
    { name: 'Smart', value: smartConversions },
  ];

  return (
    <div className="border-b border-warroom-border bg-gradient-to-r from-warroom-bg via-[#0d120e] to-warroom-bg">
      <div className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:gap-8 lg:px-8">
        {/* Main Revenue Counter */}
        <div className="flex-1">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-fidelity-green/70">
            <TrendingUp size={12} />
            Revenue Potential Saved
          </div>
          <div className="mt-1 flex items-baseline gap-3">
            <span className="text-[10px] font-bold text-fidelity-green/50">₹</span>
            <motion.span
              className="font-mono text-4xl font-black tracking-tight text-fidelity-green drop-shadow-[0_0_20px_rgba(0,122,51,0.5)] md:text-6xl"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {displayRevenue}
            </motion.span>
          </div>
          <div className="mt-2 flex items-center gap-4 text-[10px] text-warroom-text-secondary">
            <span>
              At Risk: <span className="font-mono text-intent-bounce">₹{atRisk.toLocaleString('en-IN')}</span>
            </span>
            <span className="text-warroom-border">|</span>
            <span>
              Nudge Efficiency: <span className="font-mono text-fidelity-green">{successRate}%</span>
            </span>
          </div>
        </div>

        {/* Comparison Bar Chart */}
        <div className="flex items-center gap-6 rounded-lg border border-warroom-border bg-warroom-surface px-4 py-3">
          <div className="w-40 h-16">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" barSize={10}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={44} tick={{ fill: '#A0AAB2', fontSize: 9 }} axisLine={false} tickLine={false} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  <Cell fill="#4B5563" />
                  <Cell fill="#007A33" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="text-[10px] text-warroom-text-secondary space-y-1">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-gray-600" />
              Normal: {normalConversions}
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-fidelity-green" />
              Smart: {smartConversions}
            </div>
          </div>
        </div>

        {/* Pulse Indicator */}
        <div className="flex items-center gap-2">
          <motion.div
            className="h-3 w-3 rounded-full bg-fidelity-green"
            animate={{ scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span className="text-[10px] font-bold uppercase tracking-widest text-fidelity-green/70">
            Live
          </span>
        </div>
      </div>
    </div>
  );
}
