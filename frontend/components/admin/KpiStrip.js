'use client';

import { Users, Clock3, ShieldAlert, Mail } from 'lucide-react';

const tones = {
  green: 'text-synaptic-green',
  amber: 'text-intent-hesitate',
  red: 'text-intent-bounce',
  blue: 'text-intent-analyzing',
};

export default function KpiStrip({ sessions = 0, hesitating = 0, bounced = 0, drafts = 0 }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <KpiCard label="Live sessions" value={sessions} icon={Users} tone="green" />
      <KpiCard label="Hesitating" value={hesitating} icon={Clock3} tone="amber" />
      <KpiCard label="Bounced" value={bounced} icon={ShieldAlert} tone="red" />
      <KpiCard label="AI drafts" value={drafts} icon={Mail} tone="blue" />
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, tone }) {
  return (
    <div className="rounded-md border border-warroom-border bg-warroom-surface px-4 py-3">
      <div className="flex items-center gap-2 text-xs text-warroom-text-secondary">
        <Icon className={tones[tone]} size={16} />
        {label}
      </div>
      <p className="mt-2 text-kpi">{typeof value === 'number' ? value.toLocaleString() : value}</p>
    </div>
  );
}
