"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import LiveFunnel from "@/components/admin/LiveFunnel";
import IntentInspector from "@/components/admin/IntentInspector";
import DispatchQueue from "@/components/admin/DispatchQueue";
import TriggerOverride from "@/components/admin/TriggerOverride";
import LiveTelemetryBar from "@/components/admin/LiveTelemetryBar";
import KpiStrip from "@/components/admin/KpiStrip";
import DashboardLayout from "@/components/admin/DashboardLayout";
import RevenueTicker from "@/components/admin/RevenueTicker";
import { AuthService } from "@/services/auth";
import { fetchFunnelStats, fetchBouncedSessions, runEngine, dispatchInterventions } from "@/services/api";

export default function AdminPage() {
  const [sessionRecords, setSessionRecords] = useState([]);
  const [funnelData, setFunnelData] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [dispatchState, setDispatchState] = useState("queued"); // queued | processing | sent
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Authentication Check
  useEffect(() => {
    if (!AuthService.getAccessToken()) {
      router.push("/admin/login");
    }
  }, [router]);

  const loadData = async () => {
    try {
      const [stats, sessions] = await Promise.all([
        fetchFunnelStats(),
        fetchBouncedSessions()
      ]);
      
      setFunnelData([
        { label: 'Landing', users: stats.landing, status: 'healthy', caption: 'Trusted entry' },
        { label: 'SIPs', users: stats.investments, status: 'healthy', caption: 'Chart viewed' },
        { label: 'Checkout', users: stats.checkout, status: 'hesitating', caption: 'KYC friction' },
        { label: 'Bounce', users: stats.bounced, status: 'loss', caption: 'Exit captured' },
      ]);

      setSessionRecords(sessions);
      setLoading(false);
    } catch (err) {
      console.error("Dashboard data load failure", err);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const openInspector = (session) => {
    setSelectedSession(session);
    setIsInspectorOpen(true);
  };

  const handleRunEngine = async () => {
    await runEngine();
    await loadData();
    setDispatchState("ready");
  };

  const handleDispatch = async () => {
    setDispatchState("processing");
    await dispatchInterventions();
    await loadData();
    setDispatchState("sent");
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-warroom-bg font-mono text-fidelity-green uppercase tracking-widest">
      <div className="flex flex-col items-center gap-4">
        <div className="h-2 w-48 overflow-hidden bg-warroom-border rounded-full">
          <div className="h-full bg-fidelity-green animate-progress-indefinite" />
        </div>
        Decrypting Tactical Telemetry...
      </div>
    </div>
  );

  return (
    <DashboardLayout activeNav="funnel">
      <div className="warroom-grid min-h-screen flex flex-col">
        {/* Butterfly Effect Revenue Ticker */}
        <RevenueTicker />

        {/* Header */}
        <header className="border-b border-warroom-border bg-warroom-bg/95 px-5 py-4 lg:px-8">
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
            <div>
              <p className="text-label text-intent-analyzing">
                Smart Behavioral Re-Engagement Engine
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight">War Room telemetry cockpit</h1>
            </div>
            <KpiStrip
              sessions={funnelData?.[0]?.users || 0}
              hesitating={funnelData?.[2]?.users || 0}
              bounced={funnelData?.[3]?.users || 0}
              drafts={sessionRecords.filter(s => s.status === 'processed').length}
            />
          </div>
        </header>

        {/* Live Telemetry Feed */}
        <LiveTelemetryBar events={sessionRecords.map(s => `${s.id} | ${s.stage} | ${s.intent || 'analyzing'}`)} />

        {/* Main Grid */}
        <div className="grid gap-5 p-5 lg:p-8 xl:grid-cols-[1fr_420px]">
          {/* Funnel */}
          <LiveFunnel
            funnel={funnelData}
            onNodeClick={(node) => {
              if (node.status === "loss" || node.status === "hesitating") {
                const firstSession = sessionRecords.find(s => s.stage.toLowerCase() === node.label.toLowerCase());
                if (firstSession) openInspector(firstSession);
              }
            }}
          />

          {/* Trigger Override */}
          <TriggerOverride 
            onTrigger={handleRunEngine} 
            onDispatch={handleDispatch}
            status={dispatchState}
          />

          {/* Dispatch Queue */}
          <DispatchQueue
            queue={sessionRecords}
            dispatchState={dispatchState}
            onSessionClick={openInspector}
          />
        </div>

        {/* Slide-in Intent Inspector */}
        <AnimatePresence>
          {isInspectorOpen && selectedSession && (
            <IntentInspector
              session={selectedSession}
              onClose={() => setIsInspectorOpen(false)}
            />
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
