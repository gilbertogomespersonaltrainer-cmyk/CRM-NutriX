import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/session";
import { deleteInstance } from "@/lib/whatsapp";

export async function DELETE() {
  try {
    const tenantId = await getTenantId();

    await deleteInstance(tenantId);

    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        whatsappStatus: "DISCONNECTED",
        whatsappPhone: null,
        whatsappConnectedAt: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Erro ao desconectar" }, { status: 500 });
  }
}
