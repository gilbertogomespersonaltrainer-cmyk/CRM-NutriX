import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/session";
import { evoGetStatus } from "@/lib/evolution";

export async function GET() {
  try {
    const tenantId = await getTenantId();
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { whatsappStatus: true, whatsappPhone: true, whatsappConnectedAt: true },
    });

    // Se já está conectado no banco, confirma com WAHA
    if (tenant?.whatsappStatus === "CONNECTED") {
      const wahaStatus = await evoGetStatus(tenantId);
      if (wahaStatus === "STOPPED" || wahaStatus === "FAILED") {
        await prisma.tenant.update({
          where: { id: tenantId },
          data: { whatsappStatus: "DISCONNECTED", whatsappQRCode: null },
        });
        return NextResponse.json({ whatsappStatus: "DISCONNECTED" });
      }
      return NextResponse.json(tenant);
    }

    // Se não está conectado, sempre verifica WAHA diretamente
    if (tenant?.whatsappStatus === "CONNECTING" || tenant?.whatsappStatus === "DISCONNECTED") {
      const wahaStatus = await evoGetStatus(tenantId);

      if (wahaStatus === "WORKING") {
        await prisma.tenant.update({
          where: { id: tenantId },
          data: {
            whatsappStatus: "CONNECTED",
            whatsappConnectedAt: new Date(),
            whatsappQRCode: null,
          },
        });
        return NextResponse.json({ whatsappStatus: "CONNECTED" });
      }

      // Timeout ou erro no WAHA — não muda o status no banco, só retorna o atual
      if (wahaStatus === "STOPPED") {
        return NextResponse.json({ whatsappStatus: tenant.whatsappStatus });
      }
    }

    return NextResponse.json(tenant);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar status" }, { status: 500 });
  }
}
