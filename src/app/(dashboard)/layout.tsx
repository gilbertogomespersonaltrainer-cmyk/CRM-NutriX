"use client";

import { SessionProvider } from "next-auth/react";
import { Sidebar } from "@/components/layout/sidebar";
import { TrialBanner } from "@/components/layout/trial-banner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <div className="min-h-screen bg-[#080808]">
        <Sidebar />
        <div className="ml-[270px] flex flex-col min-h-screen">
          <TrialBanner />
          <main className="p-8 flex-1">{children}</main>
        </div>
      </div>
    </SessionProvider>
  );
}
