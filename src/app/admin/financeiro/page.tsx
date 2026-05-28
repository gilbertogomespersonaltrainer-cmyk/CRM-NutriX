"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { GlassIcon } from "@/components/ui/premium-icon";
import { formatCurrency } from "@/lib/utils";

type FinanceiroData = {
  mrrTotal: number;
  totalRevenue: number;
  activeCount: number;
  revenueByPlan: Record<string, { count: number; revenue: number; price: number }>;
  monthlyGrowth: { label: string; count: number }[];
  monthlyCancelled: { label: string; count: number }[];
  monthlyMRR: { label: string; mrr: number }[];
};

function MiniBar({
  value,
  max,
  color = "#22c55e",
}: {
  value: number;
  max: number;
  color?: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-end gap-1 h-16">
      <div
        className="w-full rounded-t-sm transition-all duration-500"
        style={{ height: `${Math.max(pct, 4)}%`, backgroundColor: color }}
      />
    </div>
  );
}

export default function FinanceiroPage() {
  const [data, setData] = useState<FinanceiroData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/financeiro")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const maxMRR = Math.max(...data.monthlyMRR.map((m) => m.mrr), 1);
  const maxGrowth = Math.max(...data.monthlyGrowth.map((m) => m.count), 1);
  const maxCancelled = Math.max(...data.monthlyCancelled.map((m) => m.count), 1);
  const planEntries = Object.entries(data.revenueByPlan);
  const totalPlanRevenue = planEntries.reduce((s, [, v]) => s + v.revenue, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-outfit text-2xl font-bold text-white">Financeiro</h1>
        <p className="text-sm text-[#666] mt-1">Receita e crescimento do NutriX</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <GlassIcon icon="trendingUp" size="sm" />
              <p className="text-xs text-[#666] font-medium uppercase tracking-wider">MRR Atual</p>
            </div>
            <p className="text-3xl font-bold text-white">{formatCurrency(data.mrrTotal)}</p>
            <p className="text-xs text-[#666] mt-1">
              {data.activeCount} assinatura{data.activeCount !== 1 ? "s" : ""} ativa
              {data.activeCount !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <GlassIcon icon="receipt" size="sm" />
              <p className="text-xs text-[#666] font-medium uppercase tracking-wider">
                Receita Acumulada Est.
              </p>
            </div>
            <p className="text-3xl font-bold text-white">{formatCurrency(data.totalRevenue)}</p>
            <p className="text-xs text-[#666] mt-1">Estimativa baseada em meses ativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <GlassIcon icon="userCheck" size="sm" />
              <p className="text-xs text-[#666] font-medium uppercase tracking-wider">
                Ticket Médio
              </p>
            </div>
            <p className="text-3xl font-bold text-white">
              {formatCurrency(data.activeCount > 0 ? data.mrrTotal / data.activeCount : 0)}
            </p>
            <p className="text-xs text-[#666] mt-1">Por assinante ativo</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* MRR por mês */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-base font-semibold text-white mb-6">MRR por Mês</h2>
            <div className="flex items-end gap-2 h-32">
              {data.monthlyMRR.map((m) => {
                const pct = maxMRR > 0 ? Math.max((m.mrr / maxMRR) * 100, 4) : 4;
                return (
                  <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-[#666]">{formatCurrency(m.mrr)}</span>
                    <div className="w-full flex items-end" style={{ height: "80px" }}>
                      <div
                        className="w-full rounded-t-sm bg-[#22c55e]/70 hover:bg-[#22c55e] transition-colors"
                        style={{ height: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-[#666]">{m.label}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Receita por plano */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-base font-semibold text-white mb-6">Receita por Plano</h2>
            {planEntries.length === 0 ? (
              <p className="text-sm text-[#666] py-8 text-center">Nenhuma assinatura ativa</p>
            ) : (
              <div className="space-y-4">
                {planEntries.map(([name, val]) => {
                  const pct = totalPlanRevenue > 0
                    ? Math.round((val.revenue / totalPlanRevenue) * 100)
                    : 0;
                  return (
                    <div key={name}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div>
                          <span className="text-sm font-medium text-white">{name}</span>
                          <span className="text-xs text-[#666] ml-2">
                            {val.count} assinante{val.count !== 1 ? "s" : ""} · {formatCurrency(val.price)}/mês
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-semibold text-[#22c55e]">
                            {formatCurrency(val.revenue)}
                          </span>
                          <span className="text-xs text-[#666] ml-1">({pct}%)</span>
                        </div>
                      </div>
                      <div className="w-full bg-[#1a1a1a] rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-[#22c55e] to-[#16a34a] h-2 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Novos assinantes por mês */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-base font-semibold text-white mb-6">Novos Cadastros por Mês</h2>
            <div className="flex items-end gap-2" style={{ height: "120px" }}>
              {data.monthlyGrowth.map((m) => {
                const pct = maxGrowth > 0 ? Math.max((m.count / maxGrowth) * 100, 4) : 4;
                return (
                  <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-[#666]">{m.count}</span>
                    <div className="w-full flex items-end" style={{ height: "80px" }}>
                      <div
                        className="w-full rounded-t-sm bg-[#3b82f6]/70 hover:bg-[#3b82f6] transition-colors"
                        style={{ height: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-[#666]">{m.label}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Cancelamentos por mês */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-base font-semibold text-white mb-6">Cancelamentos por Mês</h2>
            <div className="flex items-end gap-2" style={{ height: "120px" }}>
              {data.monthlyCancelled.map((m) => {
                const pct = maxCancelled > 0 ? Math.max((m.count / maxCancelled) * 100, 4) : 4;
                return (
                  <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-[#666]">{m.count}</span>
                    <div className="w-full flex items-end" style={{ height: "80px" }}>
                      <div
                        className="w-full rounded-t-sm bg-[#ef4444]/50 hover:bg-[#ef4444]/70 transition-colors"
                        style={{ height: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-[#666]">{m.label}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
