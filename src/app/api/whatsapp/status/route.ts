import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/session";

export async function GET() {
  try {
    const tenantId = await getTenantId();
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        whatsappStatus: true,
        whatsappPhone: true,
        whatsappConnectedAt: true,
      },
    });

    return NextResponse.json(tenant);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar status" }, { status: 500 });
  }
}
