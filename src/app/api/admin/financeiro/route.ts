import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();

  // MRR atual: assinaturas ativas × preço do plano
  const activeSubs = await prisma.subscription.findMany({
    where: { status: "ACTIVE" },
    include: { plan: true },
  });
  const mrrTotal = activeSubs.reduce((sum, s) => sum + s.plan.priceMonthly, 0);

  // Receita por plano
  const revenueByPlan = activeSubs.reduce(
    (acc, s) => {
      const name = s.plan.name;
      if (!acc[name]) acc[name] = { count: 0, revenue: 0, price: s.plan.priceMonthly };
      acc[name].count += 1;
      acc[name].revenue += s.plan.priceMonthly;
      return acc;
    },
    {} as Record<string, { count: number; revenue: number; price: number }>
  );

  // Novos assinantes por mês (últimos 6 meses)
  const months: { label: string; start: Date; end: Date }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    months.push({
      label: d.toLocaleString("pt-BR", { month: "short", year: "2-digit" }),
      start: d,
      end,
    });
  }

  const monthlyGrowth = await Promise.all(
    months.map(async (m) => {
      const count = await prisma.tenant.count({
        where: { createdAt: { gte: m.start, lt: m.end } },
      });
      return { label: m.label, count };
    })
  );

  // Cancelamentos por mês (últimos 6 meses)
  const monthlyCancelled = await Promise.all(
    months.map(async (m) => {
      const count = await prisma.subscription.count({
        where: {
          status: "CANCELLED",
          cancelledAt: { gte: m.start, lt: m.end },
        },
      });
      return { label: m.label, count };
    })
  );

  // MRR estimado por mês (assinaturas que iniciaram até o fim do mês e ainda ativas ou canceladas depois)
  const monthlyMRR = await Promise.all(
    months.map(async (m) => {
      const subs = await prisma.subscription.findMany({
        where: {
          status: { in: ["ACTIVE", "CANCELLED", "PAST_DUE"] },
          startsAt: { lt: m.end },
          OR: [{ cancelledAt: null }, { cancelledAt: { gte: m.end } }],
        },
        include: { plan: true },
      });
      const mrr = subs.reduce((sum, s) => sum + s.plan.priceMonthly, 0);
      return { label: m.label, mrr };
    })
  );

  // Total de receita acumulada estimada (soma simples das assinaturas ativas × meses ativos)
  const totalRevenue = activeSubs.reduce((sum, s) => {
    const monthsActive = Math.max(
      1,
      Math.ceil((now.getTime() - new Date(s.startsAt).getTime()) / (30 * 24 * 60 * 60 * 1000))
    );
    return sum + s.plan.priceMonthly * monthsActive;
  }, 0);

  return NextResponse.json({
    mrrTotal,
    totalRevenue,
    activeCount: activeSubs.length,
    revenueByPlan,
    monthlyGrowth,
    monthlyCancelled,
    monthlyMRR,
  });
}
