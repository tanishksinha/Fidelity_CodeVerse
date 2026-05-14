"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/admin/DashboardLayout";
import RevenueTicker from "@/components/admin/RevenueTicker";
import UserConstellation from "@/components/admin/UserConstellation";
import { AuthService } from "@/services/auth";

export default function ConstellationPage() {
  const router = useRouter();

  // Authentication Check
  useEffect(() => {
    if (!AuthService.getAccessToken()) {
      router.push("/admin/login");
    }
  }, [router]);

  return (
    <DashboardLayout activeNav="constellation">
      <div className="warroom-grid min-h-screen flex flex-col">
        {/* Butterfly Effect Revenue Ticker */}
        <RevenueTicker />

        {/* Header */}
        <header className="border-b border-warroom-border bg-warroom-bg/95 px-5 py-4 lg:px-8">
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
            <div>
              <p className="text-label text-intent-analyzing">
                User Constellation
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight">Real-Time Intent Map</h1>
            </div>
          </div>
        </header>

        {/* Constellation Map Canvas */}
        <div className="p-5 lg:p-8 flex-1">
          <UserConstellation />
        </div>
      </div>
    </DashboardLayout>
  );
}
