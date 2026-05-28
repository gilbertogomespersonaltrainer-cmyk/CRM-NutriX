import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const search = req.nextUrl.searchParams.get("search") || "";
  const status = req.nextUrl.searchParams.get("status") || "";

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { clinicName: { contains: search, mode: "insensitive" } },
    ];
  }

  if (status) {
    where.subscription = { status };
  }

  const tenants = await prisma.tenant.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      subscription: { include: { plan: true } },
      _count: { select: { patients: true, appointments: true } },
    },
  });

  const safeTenants = tenants.map(({ password: _, ...rest }) => rest);
  return NextResponse.json(safeTenants);
}

export async function PATCH(req: NextRequest) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tenantId, action, planId, expiresAt, trialDays } = await req.json();

  if (action === "activate") {
    await prisma.subscription.update({
      where: { tenantId },
      data: { status: "ACTIVE", expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    });
  } else if (action === "suspend") {
    await prisma.subscription.update({
      where: { tenantId },
      data: { status: "PAST_DUE" },
    });
  } else if (action === "cancel") {
    await prisma.subscription.update({
      where: { tenantId },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
  } else if (action === "changePlan" && planId) {
    await prisma.subscription.update({
      where: { tenantId },
      data: { planId },
    });
  } else if (action === "giftSubscription" && expiresAt) {
    await prisma.subscription.update({
      where: { tenantId },
      data: {
        status: "ACTIVE",
        startsAt: new Date(),
        expiresAt: new Date(expiresAt),
        cancelledAt: null,
      },
    });
  } else if (action === "extendTrial") {
    const days = trialDays || 7;
    const sub = await prisma.subscription.findUnique({ where: { tenantId } });
    const base = sub?.trialEndsAt && new Date(sub.trialEndsAt) > new Date()
      ? new Date(sub.trialEndsAt)
      : new Date();
    await prisma.subscription.update({
      where: { tenantId },
      data: {
        status: "TRIAL",
        trialEndsAt: new Date(base.getTime() + days * 24 * 60 * 60 * 1000),
      },
    });
  }

  const updated = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      subscription: { include: { plan: true } },
      _count: { select: { patients: true, appointments: true } },
    },
  });

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { password: _, ...safe } = updated;
  return NextResponse.json(safe);
}
