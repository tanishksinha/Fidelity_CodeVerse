'use client';

import { Activity, BrainCircuit, Mail, Radar } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/cn';

export default function DashboardLayout({ children, activeNav = 'funnel' }) {
  return (
    <div className="min-h-screen bg-warroom-bg text-warroom-text-primary flex font-sans selection:bg-fidelity-green">
      {/* Institutional Sidebar */}
      <aside className="hidden w-64 border-r border-warroom-border bg-warroom-surface lg:flex lg:flex-col">
        <div className="p-6 border-b border-warroom-border">
          <h2 className="text-xl font-bold tracking-tight">FIDELITY</h2>
          <p className="text-xs text-warroom-text-secondary uppercase tracking-widest mt-1">Telemetry Command</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <NavItem icon={Activity} label="Live Funnel" href="/admin" active={activeNav === 'funnel'} />
          <NavItem icon={BrainCircuit} label="Intent Inspector" active={activeNav === 'inspector'} />
          <NavItem icon={Mail} label="Dispatch Queue" active={activeNav === 'dispatch'} />
          <NavItem icon={Radar} label="Engine Health" active={activeNav === 'health'} />
        </nav>
        <div className="p-4 border-t border-warroom-border text-xs text-warroom-text-secondary font-mono">
          SYSTEM_STATUS: ONLINE
        </div>
      </aside>

      {/* Main War Room Canvas */}
      <main className="flex-1 relative overflow-hidden">
        {children}
      </main>
    </div>
  );
}

function NavItem({ icon: Icon, label, active, href = '#' }) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-md px-4 py-3 text-sm font-semibold transition-colors',
        active
          ? 'border border-warroom-border bg-warroom-bg text-fidelity-green'
          : 'text-warroom-text-secondary hover:text-white hover:bg-warroom-bg'
      )}
    >
      <Icon size={18} />
      <span>{label}</span>
    </Link>
  );
}
