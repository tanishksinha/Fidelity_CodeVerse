"use client";
import DashboardLayout from "@/components/admin/DashboardLayout";
import UserBehaviorTable from "@/components/admin/UserBehaviorTable";

export default function UsersPage() {
  return (
    <DashboardLayout activeNav="users">
      <div className="p-5 lg:p-8 h-screen overflow-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">User Database</h1>
          <p className="text-sm text-warroom-text-secondary mt-1">
            Aggregated behavioral metrics and session histories across all users.
          </p>
        </div>
        <UserBehaviorTable />
      </div>
    </DashboardLayout>
  );
}
