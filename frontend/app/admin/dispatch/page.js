"use client";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/admin/DashboardLayout";
import DispatchQueue from "@/components/admin/DispatchQueue";
import IntentInspector from "@/components/admin/IntentInspector";
import { fetchBouncedSessions } from "@/services/api";
import { AnimatePresence } from "framer-motion";

export default function DispatchPage() {
  const [sessionRecords, setSessionRecords] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);

  useEffect(() => {
    fetchBouncedSessions().then(setSessionRecords);
  }, []);

  return (
    <DashboardLayout activeNav="dispatch">
      <div className="p-5 lg:p-8 h-screen overflow-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Intervention Logs</h1>
          <p className="text-sm text-warroom-text-secondary mt-1">
            Historical logs of AI-generated emails and WhatsApp interventions. Click on any record to open the Session Ghost and God Mode override controls.
          </p>
        </div>
        
        <div className="w-full xl:max-w-[1400px]">
          <DispatchQueue queue={sessionRecords} dispatchState="queued" onSessionClick={setSelectedSession} />
        </div>
        
        <AnimatePresence>
          {selectedSession && (
            <IntentInspector
              session={selectedSession}
              onClose={() => setSelectedSession(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
