"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { GlassIcon } from "@/components/ui/premium-icon";

type RelatoriosData = {
  statusBreakdown: {
    active: number;
    trial: number;
    pastDue: number;
    cancelled: number;
    expired: number;
    total: number;
  };
  conversionRate: number;
  churnRate: number;
  weeklyGrowth: { label: string; count: number }[];
  monthlyNew: { label: string; count: number }[];
  topPlans: { name: string; count: number }[];
};

function StatBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-[#a1a1a1]">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">{value}</span>
          <span className="text-xs text-[#666]">({pct}%)</span>
        </div>
      </div>
      <div className="w-full bg-[#1a1a1a] rounded-full h-2">
        <div
          className="h-2 rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export default function RelatoriosPage() {
  const [data, setData] = useState<RelatoriosData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/relatorios")
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

  const { statusBreakdown } = data;
  const maxWeekly = Math.max(...data.weeklyGrowth.map((w) => w.count), 1);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-outfit text-2xl font-bold text-white">Relatórios</h1>
        <p className="text-sm text-[#666] mt-1">Métricas de crescimento e retenção</p>
      </div>

      {/* Métricas chave */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <GlassIcon icon="trendingUp" size="sm" />
              <p className="text-xs text-[#666] font-medium uppercase tracking-wider">
                Conversão Trial
              </p>
            </div>
            <p className="text-3xl font-bold text-white">{data.conversionRate}%</p>
            <p className="text-xs text-[#666] mt-1">Trials que viraram assinatura (30d)</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <GlassIcon icon="alert" size="sm" />
              <p className="text-xs text-[#666] font-medium uppercase tracking-wider">
                Churn Rate
              </p>
            </div>
            <p
              className={`text-3xl font-bold ${
                data.churnRate > 10 ? "text-[#ef4444]" : data.churnRate > 5 ? "text-[#f97316]" : "text-white"
              }`}
            >
              {data.churnRate}%
            </p>
            <p className="text-xs text-[#666] mt-1">Cancelamentos últimos 30 dias</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <GlassIcon icon="users" size="sm" />
              <p className="text-xs text-[#666] font-medium uppercase tracking-wider">
                Total Cadastros
              </p>
            </div>
            <p className="text-3xl font-bold text-white">{statusBreakdown.total}</p>
            <p className="text-xs text-[#666] mt-1">Todos os nutricionistas cadastrados</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribuição por status */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-base font-semibold text-white mb-6">
              Distribuição por Status
            </h2>
            <div className="space-y-4">
              <StatBar
                label="Ativos"
                value={statusBreakdown.active}
                total={statusBreakdown.total}
                color="#22c55e"
              />
              <StatBar
                label="Trial"
                value={statusBreakdown.trial}
                total={statusBreakdown.total}
                color="#3b82f6"
              />
              <StatBar
                label="Inadimplentes"
                value={statusBreakdown.pastDue}
                total={statusBreakdown.total}
                color="#f97316"
              />
              <StatBar
                label="Cancelados"
                value={statusBreakdown.cancelled}
                total={statusBreakdown.total}
                color="#ef4444"
              />
              <StatBar
                label="Expirados"
                value={statusBreakdown.expired}
                total={statusBreakdown.total}
                color="#6b7280"
              />
            </div>
          </CardContent>
        </Card>

        {/* Planos mais populares */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-base font-semibold text-white mb-6">
              Planos Mais Populares
            </h2>
            {data.topPlans.length === 0 ? (
              <p className="text-sm text-[#666] py-8 text-center">Nenhum dado disponível</p>
            ) : (
              <div className="space-y-4">
                {data.topPlans.map((p, i) => {
                  const totalPlans = data.topPlans.reduce((s, x) => s + x.count, 0);
                  const pct = totalPlans > 0 ? Math.round((p.count / totalPlans) * 100) : 0;
                  const colors = ["#22c55e", "#3b82f6", "#a855f7", "#f97316"];
                  return (
                    <div key={p.name} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: colors[i % colors.length] }}
                          />
                          <span className="text-sm text-[#a1a1a1]">{p.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">{p.count}</span>
                          <span className="text-xs text-[#666]">({pct}%)</span>
                        </div>
                      </div>
                      <div className="w-full bg-[#1a1a1a] rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: colors[i % colors.length],
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Crescimento mensal */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-base font-semibold text-white mb-6">
              Novos Cadastros por Mês
            </h2>
            <div className="flex items-end gap-2" style={{ height: "120px" }}>
              {data.monthlyNew.map((m) => {
                const maxM = Math.max(...data.monthlyNew.map((x) => x.count), 1);
                const pct = Math.max((m.count / maxM) * 100, 4);
                return (
                  <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-[#666]">{m.count}</span>
                    <div className="w-full flex items-end" style={{ height: "80px" }}>
                      <div
                        className="w-full rounded-t-sm bg-[#22c55e]/60 hover:bg-[#22c55e] transition-colors"
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

        {/* Crescimento semanal */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-base font-semibold text-white mb-6">
              Novos Cadastros por Semana (últimas 8 semanas)
            </h2>
            <div className="flex items-end gap-1.5" style={{ height: "120px" }}>
              {data.weeklyGrowth.map((w) => {
                const pct = Math.max((w.count / maxWeekly) * 100, 4);
                return (
                  <div key={w.label} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-[#666]">{w.count}</span>
                    <div className="w-full flex items-end" style={{ height: "80px" }}>
                      <div
                        className="w-full rounded-t-sm bg-[#a855f7]/60 hover:bg-[#a855f7] transition-colors"
                        style={{ height: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-[#666]">{w.label}</span>
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
