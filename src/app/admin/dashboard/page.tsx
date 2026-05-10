"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GlassIcon } from "@/components/ui/premium-icon";
import { formatCurrency } from "@/lib/utils";

type DashboardData = {
  totalTenants: number;
  activeSubs: number;
  trialSubs: number;
  pastDueSubs: number;
  cancelledSubs: number;
  newThisMonth: number;
  mrrTotal: number;
  recentTenants: {
    id: string;
    name: string;
    email: string;
    clinicName: string | null;
    createdAt: string;
    subscription: { status: string; plan: { name: string } } | null;
    _count: { patients: number };
  }[];
};

const STATUS_MAP: Record<string, { label: string; variant: "active" | "pending" | "overdue" | "inactive" }> = {
  ACTIVE: { label: "Ativo", variant: "active" },
  TRIAL: { label: "Trial", variant: "pending" },
  PAST_DUE: { label: "Inadimplente", variant: "overdue" },
  CANCELLED: { label: "Cancelado", variant: "inactive" },
  EXPIRED: { label: "Expirado", variant: "inactive" },
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((res) => res.json())
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

  const stats = [
    { label: "Total Assinantes", value: data.totalTenants, icon: "users" as const },
    { label: "Ativos", value: data.activeSubs, icon: "userCheck" as const },
    { label: "Trial", value: data.trialSubs, icon: "clipboard" as const },
    { label: "Inadimplentes", value: data.pastDueSubs, icon: "alert" as const },
    { label: "MRR", value: formatCurrency(data.mrrTotal), icon: "trendingUp" as const },
    { label: "Novos no Mês", value: data.newThisMonth, icon: "userPlus" as const },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-outfit text-2xl font-bold text-white">Dashboard Admin</h1>
        <p className="text-sm text-[#666] mt-1">Visão geral do NutriX SaaS</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <GlassIcon icon={stat.icon} size="sm" />
                <p className="text-xs text-[#666] font-medium">{stat.label}</p>
              </div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Tenants */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Últimos Cadastros</h2>
          <div className="space-y-2">
            {data.recentTenants.map((tenant) => {
              const sub = tenant.subscription;
              const statusInfo = sub ? STATUS_MAP[sub.status] || STATUS_MAP.ACTIVE : null;

              return (
                <div
                  key={tenant.id}
                  className="flex items-center justify-between px-4 py-3 rounded-lg bg-[#0d0d0d] border border-[#1e1e1e]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#22c55e]/20 to-[#22c55e]/5 border border-[#22c55e]/20 flex items-center justify-center">
                      <span className="text-sm font-bold text-[#22c55e]">
                        {tenant.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{tenant.name}</p>
                      <p className="text-xs text-[#666]">
                        {tenant.clinicName || tenant.email} · {tenant._count.patients} pacientes
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {sub && (
                      <span className="text-xs text-[#888]">{sub.plan.name}</span>
                    )}
                    {statusInfo && (
                      <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
