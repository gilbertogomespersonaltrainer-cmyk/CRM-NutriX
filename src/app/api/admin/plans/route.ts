import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const plans = await prisma.plan.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { subscriptions: true } } },
  });

  return NextResponse.json(plans);
}

export async function POST(req: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await req.json();

  const plan = await prisma.plan.create({
    data: {
      name: data.name,
      description: data.description || null,
      priceMonthly: data.priceMonthly,
      maxPatients: data.maxPatients || 50,
      maxWhatsApp: data.maxWhatsApp || 500,
      features: data.features || [],
      sortOrder: data.sortOrder || 0,
    },
  });

  return NextResponse.json(plan, { status: 201 });
}

export async function PUT(req: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await req.json();

  const plan = await prisma.plan.update({
    where: { id: data.id },
    data: {
      name: data.name,
      description: data.description,
      priceMonthly: data.priceMonthly,
      maxPatients: data.maxPatients,
      maxWhatsApp: data.maxWhatsApp,
      features: data.features,
      isActive: data.isActive,
      sortOrder: data.sortOrder,
    },
  });

  return NextResponse.json(plan);
}
