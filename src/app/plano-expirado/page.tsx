"use client";

export const dynamic = "force-dynamic";

import { signOut, useSession } from "next-auth/react";
import { AlertCircle, ExternalLink, LogOut, Check, Zap } from "lucide-react";

const PLANS = [
  {
    name: "Essential",
    price: "R$ 57",
    period: "/mês",
    url: "https://pay.hotmart.com/H105769412F?off=8b1ck2sq&bid=1779979250140",
    highlight: false,
    features: [
      "Gestão de pacientes",
      "Agendamentos",
      "Controle financeiro",
      "Documentos e planos",
      "Relatórios básicos",
    ],
  },
  {
    name: "Professional",
    price: "R$ 97",
    period: "/mês",
    url: "https://pay.hotmart.com/H105769412F?off=6rficksd&bid=1779979322250",
    highlight: true,
    features: [
      "Tudo do Essential",
      "Automações de WhatsApp",
      "Lembretes automáticos",
      "Reativação de pacientes",
      "Suporte prioritário",
    ],
  },
];

function getStatusMessage(status?: string) {
  switch (status) {
    case "CANCELLED":
      return {
        title: "Sua assinatura foi cancelada",
        subtitle: "Renove agora para recuperar o acesso completo aos seus pacientes e dados.",
      };
    case "PAST_DUE":
      return {
        title: "Pagamento pendente",
        subtitle: "Houve um problema com seu pagamento. Renove sua assinatura para recuperar o acesso.",
      };
    case "EXPIRED":
    default:
      return {
        title: "Seu acesso expirou",
        subtitle: "Escolha um plano para continuar com acesso a todos os seus pacientes e dados.",
      };
  }
}

export default function PlanoExpiradoPage() {
  const { data: session } = useSession();
  const status = session?.user?.subscriptionStatus;
  const firstName = session?.user?.name?.split(" ")[0];
  const { title, subtitle } = getStatusMessage(status);

  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl space-y-8">
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

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-full bg-[#f97316]/10 border border-[#f97316]/20 flex items-center justify-center">
              <AlertCircle className="h-7 w-7 text-[#f97316]" />
            </div>
          </div>
          {firstName && (
            <p className="text-[#888] text-sm">Olá, <span className="text-white font-medium">{firstName}</span> 👋</p>
          )}
          <h1 className="text-white font-bold text-2xl">{title}</h1>
          <p className="text-[#666] text-sm leading-relaxed max-w-sm mx-auto">
            {subtitle}
          </p>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-6 flex flex-col gap-5 border transition-all
                ${plan.highlight
                  ? "bg-[#111111] border-[#22c55e]/40 shadow-[0_0_30px_-8px_rgba(34,197,94,0.2)]"
                  : "bg-[#111111] border-[#1e1e1e]"
                }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="flex items-center gap-1 bg-[#22c55e] text-black text-xs font-bold px-3 py-1 rounded-full">
                    <Zap className="h-3 w-3" />
                    Mais popular
                  </span>
                </div>
              )}

              <div className="space-y-1">
                <p className="text-[#888] text-sm font-medium">{plan.name}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-white text-3xl font-black">{plan.price}</span>
                  <span className="text-[#555] text-sm">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-2.5 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className={`h-4 w-4 flex-shrink-0 ${plan.highlight ? "text-[#22c55e]" : "text-[#555]"}`} />
                    <span className="text-[#888] text-sm">{f}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => window.open(plan.url, "_blank")}
                className={`w-full flex items-center justify-center gap-2 font-bold text-sm py-3 rounded-xl transition-colors
                  ${plan.highlight
                    ? "bg-[#22c55e] hover:bg-[#16a34a] text-black"
                    : "bg-[#1a1a1a] hover:bg-[#222] text-white border border-[#2a2a2a]"
                  }`}
              >
                Assinar {plan.name}
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Logout */}
        <div className="text-center">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="inline-flex items-center gap-2 text-[#444] hover:text-[#666] text-sm transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sair da conta
          </button>
        </div>
      </div>
    </div>
  );
}
