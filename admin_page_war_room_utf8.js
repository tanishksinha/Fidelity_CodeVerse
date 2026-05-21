"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import LiveFunnel from "@/components/admin/LiveFunnel";
import IntentInspector from "@/components/admin/IntentInspector";
import DispatchQueue from "@/components/admin/DispatchQueue";
import ExplainabilityPulse from "@/components/admin/ExplainabilityPulse";
import TriggerOverride from "@/components/admin/TriggerOverride";
import KpiStrip from "@/components/admin/KpiStrip";
import DashboardLayout from "@/components/admin/DashboardLayout";
import RevenueTicker from "@/components/admin/RevenueTicker";
import UserBehaviorTable from "@/components/admin/UserBehaviorTable";
import { AuthService } from "@/services/auth";
import { fetchFunnelStats, fetchBouncedSessions, runEngine, dispatchInterventions } from "@/services/api";
import { useSocket } from "@/contexts/SocketContext";

export default function AdminPage() {
  const [sessionRecords, setSessionRecords] = useState([]);
  const [funnelData, setFunnelData] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [dispatchState, setDispatchState] = useState("queued"); // queued | processing | sent
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { socket } = useSocket();
  const reloadTimeoutRef = useRef(null);

  useEffect(() => {
    if (!AuthService.getAccessToken()) {
      // router.push("/admin/login");
    }
  }, [router]);

  const loadData = async () => {
    try {
      const [stats, sessions] = await Promise.all([
        fetchFunnelStats(),
        fetchBouncedSessions()
      ]);
      
      setFunnelData([
        { label: 'Landing', users: stats?.landing || 0, status: 'healthy', caption: 'Trusted entry' },
        { label: 'SIPs', users: stats?.investments || 0, status: 'healthy', caption: 'Chart viewed' },
        { label: 'Checkout', users: stats?.checkout || 0, status: 'hesitating', caption: 'KYC friction' },
        { label: 'Bounce', users: stats?.bounced || 0, status: 'loss', caption: 'Exit captured' },
      ]);

      setSessionRecords(sessions);
      setLoading(false);
    } catch (err) {
      console.error("Dashboard data load failure", err);
    }
  };

  useEffect(() => {
    if (!socket) return;

    const handleAdminUpdate = (data) => {
      console.log("[SOCKET] Live admin_update received in page:", data);
      
      // Update session records optimistically
      setSessionRecords((prev) => {
        const index = prev.findIndex((s) => s.session_id === data.session_id);
        
        let stage = "landing";
        const ustage = data.universal_stage || "Exploration";
        if (ustage === "KYC") {
          stage = "investments";
        } else if (ustage === "Application") {
          stage = "checkout";
        } else if (ustage === "Transaction") {
          stage = "bounced";
        }

        const formattedBehavior = (data.behavior_type || "UNKNOWN")
          .split("_")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(" ");

        const newRecord = {
          id: data.session_id,
          session_id: data.session_id,
          page_url: data.domain || "/",
          stage: stage,
          universal_stage: ustage,
          total_time_seconds: data.total_time_seconds || 45,
          scroll_depth: `${data.scroll_depth || 0}%`,
          scrollPercent: `${data.scroll_depth || 0}%`,
          erratic_mouse: data.scroll_thrash_count > 0 ? 1 : 0,
          exit_condition: data.exit_condition || "tab_hidden",
          exit_velocity: data.exit_velocity || "normal",
          intent: formattedBehavior,
          ai_intent: formattedBehavior,
          confidence: data.churn_risk,
          ai_intent_confidence: data.churn_risk,
          ai_profile: data.xai_log || "Processed by ML Engine",
          email_subject: "Complete your Fidelity portfolio details",
          email_body: "We observed some interaction anomalies. Here is a direct line to our support chat.",
          status: "processed",
          dispatch_status: "processed",
          ai_tone_selected: "Empathetic & Reassuring",
          primary_event: "TELEMETRY_INGEST",
          supporting_data: [
            `Churn probability: ${(data.churn_risk * 100).toFixed(1)}%`,
            `Rage clicks: ${data.rage_clicks || 0}`,
            `Scroll thrashes: ${data.scroll_thrash_count || 0}`,
            `Time: ${data.total_time_seconds || 0}s`
          ]
        };

        if (index > -1) {
          const updated = [...prev];
          updated[index] = { ...updated[index], ...newRecord };
          return updated;
        } else {
          return [newRecord, ...prev];
        }
      });

      // Update funnel data optimistically
      setFunnelData((prevFunnel) => {
        if (!prevFunnel) return prevFunnel;
        const nextFunnel = [...prevFunnel];
        const ustage = data.universal_stage || "Exploration";
        let targetIdx = 0;
        if (ustage === "KYC") targetIdx = 1;
        else if (ustage === "Application") targetIdx = 2;
        else if (ustage === "Transaction") targetIdx = 3;

        nextFunnel[targetIdx] = {
          ...nextFunnel[targetIdx],
          users: (nextFunnel[targetIdx].users || 0) + 1
        };
        return nextFunnel;
      });

      // Debounced fetch reload
      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current);
      }
      reloadTimeoutRef.current = setTimeout(() => {
        loadData();
      }, 600);
    };

    const handleIdentitySync = (data) => {
      console.log("[SOCKET] Live identity_sync received in page:", data);
      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current);
      }
      reloadTimeoutRef.current = setTimeout(() => {
        loadData();
      }, 600);
    };

    socket.on("admin_update", handleAdminUpdate);
    socket.on("identity_sync", handleIdentitySync);

    return () => {
      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current);
      }
      socket.off("admin_update", handleAdminUpdate);
      socket.off("identity_sync", handleIdentitySync);
    };
  }, [socket]);

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

        {/* Main Grid */}
        <div className="grid gap-5 p-5 lg:p-8 xl:grid-cols-[1fr_420px]">
          {/* Funnel */}
          <LiveFunnel
            funnel={funnelData}
            onNodeClick={(node) => {
              if (node.status === "loss" || node.status === "hesitating") {
                const searchStage = node.label.toLowerCase() === "bounce" ? "bounced" : node.label.toLowerCase();
                const firstSession = sessionRecords.find(
                  (s) => s.stage.toLowerCase() === searchStage
                );
                if (firstSession) openInspector(firstSession);
              }
            }}
          />

          {/* Right Sidebar Stack */}
          <div className="space-y-5">
            <ExplainabilityPulse />
            <TriggerOverride
              onTrigger={handleRunEngine}
              onDispatch={handleDispatch}
              status={dispatchState}
            />
          </div>

          {/* User Behavior Table */}
          <UserBehaviorTable />

          {/* Dispatch Queue / Email Log */}
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
