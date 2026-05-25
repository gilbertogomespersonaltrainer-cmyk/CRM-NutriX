"use client";

import { SessionProvider } from "next-auth/react";
import { Sidebar } from "@/components/layout/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <div className="min-h-screen bg-[#080808]">
        <Sidebar />
        <main className="ml-[270px] p-8">{children}</main>
      </div>
    </SessionProvider>
  );
}
