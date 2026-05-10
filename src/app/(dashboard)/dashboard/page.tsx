"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCardIcon } from "@/components/ui/premium-icon";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

type DashboardData = {
  todayAppointments: {
    id: string;
    scheduledAt: string;
    duration: number;
    status: string;
    patient: { name: string; phone: string };
  }[];
  activePatients: number;
  inactivePatients: number;
  monthRevenue: number;
  monthAppointments: number;
  whatsappStatus: string;
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const stats = [
    {
      title: "Consultas Hoje",
      value: data.todayAppointments.length.toString(),
      icon: "calendar" as const,
      variant: "green" as const,
    },
    {
      title: "Pacientes Ativos",
      value: data.activePatients.toString(),
      icon: "users" as const,
      variant: "blue" as const,
    },
    {
      title: "Pacientes Inativos",
      value: data.inactivePatients.toString(),
      icon: "userX" as const,
      variant: "amber" as const,
    },
    {
      title: "Receita do Mês",
      value: formatCurrency(data.monthRevenue),
      icon: "dollar" as const,
      variant: "emerald" as const,
    },
    {
      title: "Consultas no Mês",
      value: data.monthAppointments.toString(),
      icon: "clipboard" as const,
      variant: "purple" as const,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-outfit text-2xl font-bold text-white">
          Dashboard
        </h1>
        <p className="text-sm text-[#666] mt-1">
          Resumo do seu consultório
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-[#666] font-medium">
                  {stat.title}
                </span>
                <StatCardIcon icon={stat.icon} variant={stat.variant} />
              </div>
              <p className="font-outfit text-2xl font-bold text-white tracking-tight">
                {stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions + Today's Appointments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Atalhos Rápidos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: "Novo Paciente", href: "/pacientes?new=true" },
              { label: "Novo Agendamento", href: "/agendamentos?new=true" },
              { label: "Registrar Pagamento", href: "/financeiro?new=true" },
              { label: "Follow-up Inativos", href: "/inativos" },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-center justify-between px-4 py-3 rounded-xl bg-[#0d0d0d] border border-[#1e1e1e] hover:border-[#22c55e]/20 hover:bg-[#111] transition-all duration-200 group"
              >
                <span className="text-sm text-[#a1a1a1] group-hover:text-white transition-colors">
                  {action.label}
                </span>
                <div className="w-7 h-7 rounded-lg bg-[#161616] border border-[#222] flex items-center justify-center group-hover:border-[#22c55e]/30 group-hover:bg-[#22c55e]/5 transition-all duration-200">
                  <ArrowRight className="h-3.5 w-3.5 text-[#555] group-hover:text-[#4ade80] transition-colors" strokeWidth={1.6} />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Today's Appointments */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Consultas de Hoje</CardTitle>
            <Link
              href="/agendamentos"
              className="text-xs text-[#22c55e] hover:underline"
            >
              Ver todas
            </Link>
          </CardHeader>
          <CardContent>
            {data.todayAppointments.length === 0 ? (
              <p className="text-sm text-[#666] text-center py-8">
                Nenhuma consulta agendada para hoje
              </p>
            ) : (
              <div className="space-y-3">
                {data.todayAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="flex items-center justify-between px-4 py-3 rounded-xl bg-[#0d0d0d] border border-[#1e1e1e]"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#22c55e]/15 to-[#16a34a]/5 border border-[#22c55e]/20 flex items-center justify-center text-[#4ade80] font-bold text-sm shadow-[0_0_15px_rgba(34,197,94,0.06)]">
                        {apt.patient.name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {apt.patient.name}
                        </p>
                        <p className="text-xs text-[#666]">
                          {formatDateTime(apt.scheduledAt)} - {apt.duration}min
                        </p>
                      </div>
                    </div>
                    <Badge variant="active">Agendada</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
