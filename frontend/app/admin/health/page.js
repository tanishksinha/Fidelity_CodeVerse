"use client";
import DashboardLayout from "@/components/admin/DashboardLayout";
import ExplainabilityPulse from "@/components/admin/ExplainabilityPulse";

export default function HealthPage() {
  return (
    <DashboardLayout activeNav="health">
      <div className="p-5 lg:p-8 h-screen overflow-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Engine Health & XAI Logs</h1>
          <p className="text-sm text-warroom-text-secondary mt-1">
            Real-time terminal output of the Semantic Mapper and ML Decision Engine.
          </p>
        </div>
        <div className="w-full xl:max-w-[1400px] h-[75vh]">
          <ExplainabilityPulse />
        </div>
      </div>
    </DashboardLayout>
  );
}
