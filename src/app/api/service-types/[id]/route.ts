import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/session";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = await getTenantId();
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.serviceType.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Tipo não encontrado" }, { status: 404 });
    }

    const serviceType = await prisma.serviceType.update({
      where: { id },
      data: {
        name: body.name,
        defaultPrice: body.defaultPrice,
        isActive: body.isActive,
        sortOrder: body.sortOrder,
      },
    });

    return NextResponse.json(serviceType);
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar tipo" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = await getTenantId();
    const { id } = await params;

    const existing = await prisma.serviceType.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Tipo não encontrado" }, { status: 404 });
    }

    await prisma.serviceType.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Erro ao excluir tipo" }, { status: 500 });
  }
}
