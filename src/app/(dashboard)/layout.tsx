"use client";

import { Sidebar } from "@/components/layout/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#080808]">
      <Sidebar />
      <main className="ml-[270px] p-8">{children}</main>
    </div>
  );
}
