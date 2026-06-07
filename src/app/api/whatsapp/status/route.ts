import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/session";
import { wahaGetStatus } from "@/lib/waha";

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

    // Se está conectando, verifica o WAHA diretamente para detectar conexão sem webhook
    if (tenant?.whatsappStatus === "CONNECTING") {
      const wahaStatus = await wahaGetStatus(tenantId);

      if (wahaStatus === "WORKING") {
        await prisma.tenant.update({
          where: { id: tenantId },
          data: {
            whatsappStatus: "CONNECTED",
            whatsappConnectedAt: new Date(),
            whatsappQRCode: null,
          },
        });
        return NextResponse.json({ whatsappStatus: "CONNECTED", whatsappPhone: tenant.whatsappPhone, whatsappConnectedAt: new Date() });
      }

      if (wahaStatus === "FAILED" || wahaStatus === "STOPPED") {
        await prisma.tenant.update({
          where: { id: tenantId },
          data: { whatsappStatus: "DISCONNECTED", whatsappQRCode: null },
        });
        return NextResponse.json({ whatsappStatus: "DISCONNECTED", whatsappPhone: null, whatsappConnectedAt: null });
      }
    }

    return NextResponse.json(tenant);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar status" }, { status: 500 });
  }
}
