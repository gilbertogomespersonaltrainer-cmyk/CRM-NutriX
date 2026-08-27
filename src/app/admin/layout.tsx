"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { GlassIcon } from "@/components/ui/premium-icon";
import { LogOut } from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: "layout" as const },
  { href: "/admin/assinantes", label: "Assinantes", icon: "users" as const },
  { href: "/admin/financeiro", label: "Financeiro", icon: "trendingUp" as const },
  { href: "/admin/relatorios", label: "Relatórios", icon: "clipboard" as const },
  { href: "/admin/admins", label: "Administradores", icon: "settings" as const },
];

export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    fetch("/api/admin/dashboard").then((res) => {
      if (res.status === 401) {
        router.replace("/admin-login");
      } else {
        setVerified(true);
      }
    });
  }, [router]);

  async function handleLogout() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.replace("/admin-login");
  }

  if (!verified) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808]">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-[270px] bg-[#0a0a0a] border-r border-[#1e1e1e] flex flex-col z-50">
        <div className="p-6 pb-4">
          <Link href="/admin/dashboard" className="flex items-center gap-1">
            <span className="font-outfit text-2xl font-black text-white tracking-tighter">
              Nutri
            </span>
            <span className="font-outfit text-2xl font-black text-[#22c55e] tracking-tighter">
              X
            </span>
          </Link>
          <div className="h-px w-full bg-gradient-to-r from-[#22c55e] via-[#22c55e]/50 to-transparent mt-3" />
          <p className="text-[10px] font-semibold tracking-[0.2em] text-[#22c55e]/60 uppercase mt-2">
            Painel Admin
          </p>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-[#22c55e]/[0.08] text-white"
                    : "text-[#666] hover:text-white hover:bg-[#111]"
                }`}
              >
                <GlassIcon
                  icon={item.icon}
                  size="sm"
                  className={isActive ? "" : "opacity-50"}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#1e1e1e]">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-medium text-[#666] hover:text-[#ef4444] hover:bg-[#ef4444]/[0.05] transition-all duration-200"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.6} />
            Sair
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-[270px] p-8">{children}</main>
    </div>
  );
}
