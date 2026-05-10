import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalTenants,
    activeSubs,
    trialSubs,
    pastDueSubs,
    cancelledSubs,
    newThisMonth,
    plans,
    recentTenants,
  ] = await Promise.all([
    prisma.tenant.count(),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.subscription.count({ where: { status: "TRIAL" } }),
    prisma.subscription.count({ where: { status: "PAST_DUE" } }),
    prisma.subscription.count({ where: { status: "CANCELLED" } }),
    prisma.tenant.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.plan.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.tenant.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        subscription: { include: { plan: true } },
        _count: { select: { patients: true } },
      },
    }),
  ]);

  const mrr = await prisma.subscription.findMany({
    where: { status: "ACTIVE" },
    include: { plan: true },
  });
  const mrrTotal = mrr.reduce((sum, s) => sum + s.plan.priceMonthly, 0);

  // Strip sensitive fields
  const safeTenants = recentTenants.map(({ password: _, ...rest }) => rest);

  return NextResponse.json({
    totalTenants,
    activeSubs,
    trialSubs,
    pastDueSubs,
    cancelledSubs,
    newThisMonth,
    mrrTotal,
    plans,
    recentTenants: safeTenants,
  });
}
