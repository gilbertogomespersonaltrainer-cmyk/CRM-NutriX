import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();

  // Contagem por status
  const [active, trial, pastDue, cancelled, expired] = await Promise.all([
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.subscription.count({ where: { status: "TRIAL" } }),
    prisma.subscription.count({ where: { status: "PAST_DUE" } }),
    prisma.subscription.count({ where: { status: "CANCELLED" } }),
    prisma.subscription.count({ where: { status: "EXPIRED" } }),
  ]);

  const total = active + trial + pastDue + cancelled + expired;

  // Conversão trial → ativo (quantos dos trials de 30 dias atrás viraram ativos)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const trialsStarted30dAgo = await prisma.subscription.count({
    where: { startsAt: { gte: thirtyDaysAgo } },
  });
  const convertedFromTrial = await prisma.subscription.count({
    where: { status: "ACTIVE", startsAt: { gte: thirtyDaysAgo } },
  });
  const conversionRate =
    trialsStarted30dAgo > 0
      ? Math.round((convertedFromTrial / trialsStarted30dAgo) * 100)
      : 0;

  // Churn rate (cancelados nos últimos 30 dias / total ativo há 30 dias)
  const cancelledLast30d = await prisma.subscription.count({
    where: { status: "CANCELLED", cancelledAt: { gte: thirtyDaysAgo } },
  });
  const churnRate =
    active + cancelledLast30d > 0
      ? Math.round((cancelledLast30d / (active + cancelledLast30d)) * 100)
      : 0;

  // Novos por semana (últimas 8 semanas)
  const weeks: { label: string; start: Date; end: Date }[] = [];
  for (let i = 7; i >= 0; i--) {
    const end = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekNum = 8 - i;
    weeks.push({ label: `S${weekNum}`, start, end });
  }

  const weeklyGrowth = await Promise.all(
    weeks.map(async (w) => {
      const count = await prisma.tenant.count({
        where: { createdAt: { gte: w.start, lt: w.end } },
      });
      return { label: w.label, count };
    })
  );

  // Top planos mais usados
  const planStats = await prisma.subscription.groupBy({
    by: ["planId"],
    where: { status: { in: ["ACTIVE", "TRIAL"] } },
    _count: { planId: true },
    orderBy: { _count: { planId: "desc" } },
  });

  const planDetails = await prisma.plan.findMany({
    where: { id: { in: planStats.map((p) => p.planId) } },
    select: { id: true, name: true },
  });

  const topPlans = planStats.map((p) => {
    const plan = planDetails.find((d) => d.id === p.planId);
    return { name: plan?.name || "Desconhecido", count: p._count.planId };
  });

  // Crescimento total mês a mês (últimos 6 meses)
  const months: { label: string; start: Date; end: Date }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    months.push({
      label: d.toLocaleString("pt-BR", { month: "short" }),
      start: d,
      end,
    });
  }

  const monthlyNew = await Promise.all(
    months.map(async (m) => {
      const count = await prisma.tenant.count({
        where: { createdAt: { gte: m.start, lt: m.end } },
      });
      return { label: m.label, count };
    })
  );

  return NextResponse.json({
    statusBreakdown: { active, trial, pastDue, cancelled, expired, total },
    conversionRate,
    churnRate,
    weeklyGrowth,
    monthlyNew,
    topPlans,
  });
}
