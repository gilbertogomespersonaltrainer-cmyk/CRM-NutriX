"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { LogOut } from "lucide-react";
import { GlassIcon } from "@/components/ui/premium-icon";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: "layout" as const, variant: "green" as const },
  { name: "Pipeline", href: "/pipeline", icon: "kanban" as const, variant: "purple" as const },
  { name: "Pacientes", href: "/pacientes", icon: "users" as const, variant: "blue" as const },
  { name: "Inativos", href: "/inativos", icon: "userX" as const, variant: "amber" as const },
  { name: "Agendamentos", href: "/agendamentos", icon: "calendar" as const, variant: "cyan" as const },
  { name: "Financeiro", href: "/financeiro", icon: "dollar" as const, variant: "emerald" as const },
  { name: "Mensagens", href: "/mensagens", icon: "messageCircle" as const, variant: "green" as const },
  { name: "Documentos", href: "/documentos", icon: "fileText" as const, variant: "blue" as const },
  { name: "Configurações", href: "/configuracoes", icon: "settings" as const, variant: "blue" as const },
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
    <aside className="fixed left-0 top-0 bottom-0 w-[270px] bg-[#0a0a0a] border-r border-[#1a1a1a] flex flex-col z-40">
      {/* Logo */}
      <div className="p-6 border-b border-[#1a1a1a]">
        <Link href="/dashboard" className="flex items-baseline gap-0">
          <span className="font-outfit text-3xl font-light text-white tracking-tighter">
            Nutri
          </span>
          <span className="font-outfit text-3xl font-black text-[#22c55e] tracking-tighter">
            X
          </span>
        </Link>
        <div className="h-[2px] bg-gradient-to-r from-[#22c55e]/80 via-[#22c55e]/20 to-transparent mt-3 rounded-full" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-300 group",
                isActive
                  ? "bg-white/[0.04]"
                  : "hover:bg-white/[0.03]"
              )}
            >
              <GlassIcon
                icon={item.icon}
                variant={item.variant}
                size="sm"
                className={cn(
                  "transition-all duration-300",
                  !isActive && "opacity-50 group-hover:opacity-80"
                )}
              />
              <span className={cn(
                "transition-colors duration-200",
                isActive ? "text-white" : "text-[#777] group-hover:text-[#bbb]"
              )}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* WhatsApp Status */}
      <div className="px-3 py-3 border-t border-[#1a1a1a]">
        <Link
          href="/configuracoes"
          className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/[0.03] transition-all duration-200 group"
        >
          <GlassIcon
            icon="message"
            variant={whatsappStatus === "CONNECTED" ? "green" : "red"}
            size="sm"
            className={whatsappStatus !== "CONNECTED" ? "opacity-50 group-hover:opacity-80" : ""}
          />
          <div className="flex-1">
            <span className="text-[11px] text-[#555] block leading-tight">WhatsApp</span>
            <span
              className={cn(
                "text-xs font-semibold flex items-center gap-1.5 mt-0.5",
                whatsappStatus === "CONNECTED"
                  ? "text-[#4ade80]"
                  : whatsappStatus === "CONNECTING"
                  ? "text-[#fbbf24]"
                  : "text-[#666]"
              )}
            >
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  whatsappStatus === "CONNECTED"
                    ? "bg-[#4ade80] shadow-[0_0_8px_rgba(74,222,128,0.6)]"
                    : whatsappStatus === "CONNECTING"
                    ? "bg-[#fbbf24] animate-pulse"
                    : "bg-[#555]"
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
      <div className="p-3 border-t border-[#1a1a1a]">
        <div className="flex items-center gap-3 px-3 py-2">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold"
            style={{
              background: "linear-gradient(135deg, #22c55e22, #059669 0a)",
              boxShadow: "0 0 20px rgba(34,197,94,0.12)",
              border: "1px solid rgba(34,197,94,0.25)",
              color: "#4ade80",
            }}
          >
            {session?.user?.name?.[0]?.toUpperCase() || "N"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {session?.user?.name}
            </p>
            <p className="text-[11px] text-[#555] truncate">
              {session?.user?.email}
            </p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#555] hover:text-[#f87171] hover:bg-[#ef4444]/5 transition-all duration-200"
            title="Sair"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </aside>
  );
}
