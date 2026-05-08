"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  UserX,
  Calendar,
  DollarSign,
  Settings,
  LogOut,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Pacientes", href: "/pacientes", icon: Users },
  { name: "Inativos", href: "/inativos", icon: UserX },
  { name: "Agendamentos", href: "/agendamentos", icon: Calendar },
  { name: "Financeiro", href: "/financeiro", icon: DollarSign },
  { name: "Configurações", href: "/configuracoes", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [whatsappStatus, setWhatsappStatus] = useState("DISCONNECTED");

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch("/api/whatsapp/status");
        if (res.ok) {
          const data = await res.json();
          setWhatsappStatus(data.whatsappStatus);
        }
      } catch {
        // ignore
      }
    }
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-[#0a0a0a] border-r border-[#1e1e1e] flex flex-col z-40">
      {/* Logo */}
      <div className="p-6 border-b border-[#1e1e1e]">
        <Link href="/dashboard" className="flex items-baseline gap-0">
          <span className="font-outfit text-3xl font-light text-white tracking-tighter">
            Nutri
          </span>
          <span className="font-outfit text-3xl font-black text-[#22c55e] tracking-tighter">
            X
          </span>
        </Link>
        <div className="h-px bg-gradient-to-r from-[#22c55e] to-transparent mt-2" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20"
                  : "text-[#a1a1a1] hover:text-white hover:bg-[#1a1a1a]"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* WhatsApp Status */}
      <div className="px-4 py-3 border-t border-[#1e1e1e]">
        <Link
          href="/configuracoes"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-[#1a1a1a] transition-colors"
        >
          <MessageCircle className="h-5 w-5 text-[#22c55e]" />
          <div className="flex-1">
            <span className="text-xs text-[#666] block">WhatsApp</span>
            <span
              className={cn(
                "text-xs font-semibold flex items-center gap-1.5",
                whatsappStatus === "CONNECTED"
                  ? "text-[#4ade80]"
                  : whatsappStatus === "CONNECTING"
                  ? "text-[#fbbf24]"
                  : "text-[#ef4444]"
              )}
            >
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  whatsappStatus === "CONNECTED"
                    ? "bg-[#4ade80]"
                    : whatsappStatus === "CONNECTING"
                    ? "bg-[#fbbf24]"
                    : "bg-[#ef4444]"
                )}
              />
              {whatsappStatus === "CONNECTED"
                ? "Conectado"
                : whatsappStatus === "CONNECTING"
                ? "Conectando..."
                : "Desconectado"}
            </span>
          </div>
        </Link>
      </div>

      {/* User */}
      <div className="p-4 border-t border-[#1e1e1e]">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-[#22c55e]/20 flex items-center justify-center text-[#22c55e] font-bold text-sm">
            {session?.user?.name?.[0]?.toUpperCase() || "N"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {session?.user?.name}
            </p>
            <p className="text-xs text-[#666] truncate">
              {session?.user?.email}
            </p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-[#666] hover:text-[#ef4444] transition-colors"
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
