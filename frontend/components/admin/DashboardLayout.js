'use client';

import { Activity, BrainCircuit, Mail, Radar, Map, Users } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/cn';

export default function DashboardLayout({ children, activeNav = 'funnel' }) {
  return (
    <div className="min-h-screen bg-warroom-bg text-warroom-text-primary flex flex-col md:flex-row font-sans selection:bg-fidelity-green">
      {/* Institutional Sidebar (Desktop) */}
      <aside className="hidden w-64 border-r border-warroom-border bg-warroom-surface md:flex md:flex-col">
        <div className="p-6 border-b border-warroom-border">
          <h2 className="text-xl font-bold tracking-tight">FIDELITY</h2>
          <p className="text-xs text-warroom-text-secondary uppercase tracking-widest mt-1">Telemetry Command</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <NavItem icon={Activity} label="Live Funnel" href="/admin" active={activeNav === 'funnel'} />
          <NavItem icon={Users} label="Users" href="/admin/users" active={activeNav === 'users'} />
          <NavItem icon={Map} label="Constellation Map" href="/admin/constellation" active={activeNav === 'constellation'} />
          <NavItem icon={Mail} label="Intervention Logs" href="/admin/dispatch" active={activeNav === 'dispatch'} />
          <NavItem icon={Radar} label="Engine Health" href="/admin/health" active={activeNav === 'health'} />
        </nav>
        <div className="p-4 border-t border-warroom-border text-xs text-warroom-text-secondary font-mono">
          SYSTEM_STATUS: ONLINE
        </div>
      </aside>

      {/* Main War Room Canvas */}
      <main className="flex-1 relative overflow-hidden pb-16 md:pb-0">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 w-full flex justify-around items-center bg-warroom-surface border-t border-warroom-border pb-safe z-50 h-16">
        <MobileNavItem icon={Activity} label="Funnel" href="/admin" active={activeNav === 'funnel'} />
        <MobileNavItem icon={Map} label="Constellation" href="/admin/constellation" active={activeNav === 'constellation'} />
        <MobileNavItem icon={Mail} label="Interventions" href="/admin/dispatch" active={activeNav === 'dispatch'} />
      </nav>
    </div>
  );
}

function MobileNavItem({ icon: Icon, label, active, href = '#' }) {
  return (
    <Link
      href={href}
      className={cn(
        'flex flex-col items-center justify-center w-full h-full text-xs transition-colors',
        active ? 'text-fidelity-green' : 'text-warroom-text-secondary hover:text-white'
      )}
    >
      <Icon size={20} className="mb-1" />
      <span className="text-[10px] uppercase tracking-wider">{label}</span>
    </Link>
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
