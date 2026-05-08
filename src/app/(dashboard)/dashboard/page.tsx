"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import {
  Calendar,
  Users,
  UserX,
  DollarSign,
  ClipboardCheck,
  ArrowRight,
} from "lucide-react";
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
      icon: Calendar,
      color: "text-[#22c55e]",
      bg: "bg-[#22c55e]/10",
    },
    {
      title: "Pacientes Ativos",
      value: data.activePatients.toString(),
      icon: Users,
      color: "text-[#3b82f6]",
      bg: "bg-[#3b82f6]/10",
    },
    {
      title: "Pacientes Inativos",
      value: data.inactivePatients.toString(),
      icon: UserX,
      color: "text-[#f59e0b]",
      bg: "bg-[#f59e0b]/10",
    },
    {
      title: "Receita do Mês",
      value: formatCurrency(data.monthRevenue),
      icon: DollarSign,
      color: "text-[#22c55e]",
      bg: "bg-[#22c55e]/10",
    },
    {
      title: "Consultas no Mês",
      value: data.monthAppointments.toString(),
      icon: ClipboardCheck,
      color: "text-[#8b5cf6]",
      bg: "bg-[#8b5cf6]/10",
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
                <div className={`${stat.bg} p-2 rounded-lg`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
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
            <Link
              href="/pacientes?new=true"
              className="flex items-center justify-between px-4 py-3 rounded-lg bg-[#0d0d0d] border border-[#1e1e1e] hover:border-[#22c55e]/30 transition-colors group"
            >
              <span className="text-sm text-[#a1a1a1] group-hover:text-white">
                Novo Paciente
              </span>
              <ArrowRight className="h-4 w-4 text-[#666] group-hover:text-[#22c55e]" />
            </Link>
            <Link
              href="/agendamentos?new=true"
              className="flex items-center justify-between px-4 py-3 rounded-lg bg-[#0d0d0d] border border-[#1e1e1e] hover:border-[#22c55e]/30 transition-colors group"
            >
              <span className="text-sm text-[#a1a1a1] group-hover:text-white">
                Novo Agendamento
              </span>
              <ArrowRight className="h-4 w-4 text-[#666] group-hover:text-[#22c55e]" />
            </Link>
            <Link
              href="/financeiro?new=true"
              className="flex items-center justify-between px-4 py-3 rounded-lg bg-[#0d0d0d] border border-[#1e1e1e] hover:border-[#22c55e]/30 transition-colors group"
            >
              <span className="text-sm text-[#a1a1a1] group-hover:text-white">
                Registrar Pagamento
              </span>
              <ArrowRight className="h-4 w-4 text-[#666] group-hover:text-[#22c55e]" />
            </Link>
            <Link
              href="/inativos"
              className="flex items-center justify-between px-4 py-3 rounded-lg bg-[#0d0d0d] border border-[#1e1e1e] hover:border-[#22c55e]/30 transition-colors group"
            >
              <span className="text-sm text-[#a1a1a1] group-hover:text-white">
                Follow-up Inativos
              </span>
              <ArrowRight className="h-4 w-4 text-[#666] group-hover:text-[#22c55e]" />
            </Link>
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
                    className="flex items-center justify-between px-4 py-3 rounded-lg bg-[#0d0d0d] border border-[#1e1e1e]"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-[#22c55e]/10 flex items-center justify-center text-[#22c55e] font-bold text-sm">
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
