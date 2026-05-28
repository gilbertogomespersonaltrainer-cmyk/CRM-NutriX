"use client";

import { useSession } from "next-auth/react";
import { Clock, ExternalLink } from "lucide-react";

const HOTMART_URL = "https://pay.hotmart.com/H105769412F?off=8b1ck2sq&bid=1779979250140";

export function TrialBanner() {
  const { data: session } = useSession();

  const status = session?.user?.subscriptionStatus;
  const trialEndsAt = session?.user?.trialEndsAt;

  if (status !== "TRIAL" || !trialEndsAt) return null;

  const daysLeft = Math.ceil(
    (new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  if (daysLeft <= 0) return null;

  const isUrgent = daysLeft <= 2;

  return (
    <div
      className={`flex items-center justify-between gap-4 px-4 py-2.5 text-sm
        ${isUrgent
          ? "bg-[#f97316]/10 border-b border-[#f97316]/20 text-[#f97316]"
          : "bg-[#22c55e]/10 border-b border-[#22c55e]/20 text-[#22c55e]"
        }`}
    >
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 flex-shrink-0" />
        <span>
          {isUrgent ? (
            <>
              ⚠️ Seu teste expira em{" "}
              <strong>
                {daysLeft === 1 ? "1 dia" : `${daysLeft} dias`}
              </strong>
              . Não perca seus dados!
            </>
          ) : (
            <>
              Você está no período de teste gratuito —{" "}
              <strong>
                {daysLeft} {daysLeft === 1 ? "dia restante" : "dias restantes"}
              </strong>
            </>
          )}
        </span>
      </div>
      <button
        onClick={() => window.open(HOTMART_URL, "_blank")}
        className={`flex items-center gap-1 font-semibold whitespace-nowrap text-xs px-3 py-1 rounded-full border transition-colors
          ${isUrgent
            ? "border-[#f97316]/40 hover:bg-[#f97316]/20"
            : "border-[#22c55e]/40 hover:bg-[#22c55e]/20"
          }`}
      >
        Assinar agora
        <ExternalLink className="h-3 w-3" />
      </button>
    </div>
  );
}
