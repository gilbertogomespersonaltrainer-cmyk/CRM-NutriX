import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/session";

const MONTH_NAMES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

export async function GET() {
  try {
    const tenantId = await getTenantId();
    const now = new Date();

    // Últimos 6 meses
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      return { year: d.getFullYear(), month: d.getMonth(), label: MONTH_NAMES[d.getMonth()] };
    });

    // 1. Novos pacientes por mês
    const newPatients = await prisma.patient.findMany({
      where: {
        tenantId,
        createdAt: { gte: new Date(months[0].year, months[0].month, 1) },
        stage: { not: "LEAD" },
      },
      select: { createdAt: true },
    });
    const newPatientsPerMonth = months.map((m) => ({
      month: m.label,
      count: newPatients.filter(
        (p) => p.createdAt.getFullYear() === m.year && p.createdAt.getMonth() === m.month
      ).length,
    }));

    // 2. Taxa de comparecimento vs faltas por mês
    const appointments = await prisma.appointment.findMany({
      where: {
        tenantId,
        scheduledAt: { gte: new Date(months[0].year, months[0].month, 1) },
        status: { in: ["COMPLETED", "NO_SHOW", "CANCELLED"] },
      },
      select: { scheduledAt: true, status: true },
    });
    const attendancePerMonth = months.map((m) => {
      const apts = appointments.filter(
        (a) => a.scheduledAt.getFullYear() === m.year && a.scheduledAt.getMonth() === m.month
      );
      const total = apts.length;
      const completed = apts.filter((a) => a.status === "COMPLETED").length;
      const missed = apts.filter((a) => a.status === "NO_SHOW" || a.status === "CANCELLED").length;
      return { month: m.label, compareceu: completed, faltou: missed, total };
    });

    // 3. Distribuição por estágio do pipeline
    const stageLabels: Record<string, string> = {
      LEAD: "Lead",
      FIRST_CONSULTATION: "1ª Consulta",
      ACTIVE: "Ativo",
      INACTIVE: "Inativo",
      REACTIVATED: "Reativado",
    };
    const stageCounts = await prisma.patient.groupBy({
      by: ["stage"],
      where: { tenantId },
      _count: { stage: true },
    });
    const stageDistribution = stageCounts.map((s) => ({
      label: stageLabels[s.stage] ?? s.stage,
      count: s._count.stage,
    }));

    // 4. Ticket médio por mês
    const payments = await prisma.payment.findMany({
      where: {
        tenantId,
        status: "PAID",
        createdAt: { gte: new Date(months[0].year, months[0].month, 1) },
      },
      select: { createdAt: true, finalAmount: true },
    });
    const avgTicketPerMonth = months.map((m) => {
      const pms = payments.filter(
        (p) => p.createdAt.getFullYear() === m.year && p.createdAt.getMonth() === m.month
      );
      const avg = pms.length > 0 ? pms.reduce((s, p) => s + p.finalAmount, 0) / pms.length : 0;
      return { month: m.label, avg: parseFloat(avg.toFixed(2)) };
    });

    return NextResponse.json({ newPatientsPerMonth, attendancePerMonth, stageDistribution, avgTicketPerMonth });
  } catch {
    return NextResponse.json({ error: "Erro ao carregar gráficos" }, { status: 500 });
  }
}
