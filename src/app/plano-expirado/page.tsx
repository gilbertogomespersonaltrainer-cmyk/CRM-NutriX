"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { AlertCircle, ExternalLink, LogOut } from "lucide-react";

const HOTMART_URL = process.env.NEXT_PUBLIC_HOTMART_CHECKOUT_URL ?? "https://pay.hotmart.com/";

export default function PlanoExpiradoPage() {
  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="flex items-baseline justify-center gap-0 mb-2">
            <span className="font-outfit text-5xl font-light text-white tracking-tighter">
              Nutri
            </span>
            <span className="font-outfit text-5xl font-black text-[#22c55e] tracking-tighter">
              X
            </span>
          </div>
          <div className="h-px w-32 mx-auto bg-gradient-to-r from-transparent via-[#22c55e] to-transparent" />
        </div>

        {/* Card */}
        <div className="bg-[#111111] border border-[#1e1e1e] rounded-2xl p-8 space-y-6 text-center">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-[#f97316]/10 border border-[#f97316]/20 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-[#f97316]" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-white font-bold text-xl">
              Seu período de teste encerrou
            </h1>
            <p className="text-[#666] text-sm leading-relaxed">
              Os 7 dias gratuitos chegaram ao fim. Para continuar usando o NutriX
              e ter acesso a todos os seus pacientes e dados, assine agora.
            </p>
          </div>

          <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl p-4 space-y-2 text-left">
            <p className="text-[#aaa] text-xs font-semibold uppercase tracking-wider">
              O que você mantém ao assinar
            </p>
            {[
              "Todos os seus pacientes e histórico",
              "Agendamentos e financeiro",
              "Automações de WhatsApp",
              "Documentos e planos alimentares",
              "Suporte prioritário",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] flex-shrink-0" />
                <span className="text-[#888] text-sm">{item}</span>
              </div>
            ))}
          </div>

          <Button
            className="w-full bg-[#22c55e] hover:bg-[#16a34a] text-black font-bold h-12 text-base"
            onClick={() => window.open(HOTMART_URL, "_blank")}
          >
            Assinar agora
            <ExternalLink className="h-4 w-4 ml-2" />
          </Button>

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-2 text-[#444] hover:text-[#666] text-sm mx-auto transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sair da conta
          </button>
        </div>
      </div>
    </div>
  );
}
