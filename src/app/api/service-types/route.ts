import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/session";

export async function GET() {
  try {
    const tenantId = await getTenantId();
    const types = await prisma.serviceType.findMany({
      where: { tenantId },
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json(types);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar tipos" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const tenantId = await getTenantId();
    const body = await req.json();

    const maxOrder = await prisma.serviceType.findFirst({
      where: { tenantId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const serviceType = await prisma.serviceType.create({
      data: {
        tenantId,
        name: body.name,
        defaultPrice: body.defaultPrice,
        sortOrder: (maxOrder?.sortOrder || 0) + 1,
      },
    });

    return NextResponse.json(serviceType, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar tipo" }, { status: 500 });
  }
}
