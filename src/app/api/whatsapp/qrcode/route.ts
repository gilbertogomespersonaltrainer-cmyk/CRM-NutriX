import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/session";
import { zapiGetQRCode } from "@/lib/zapi";

export async function GET() {
  try {
    const tenantId = await getTenantId();
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { whatsappQRCode: true, whatsappStatus: true, zapiInstanceId: true, zapiClientToken: true },
    });

    // QR já salvo no banco (do connect ou webhook anterior)
    if (tenant?.whatsappQRCode) {
      return NextResponse.json({ base64: tenant.whatsappQRCode, status: tenant.whatsappStatus });
    }

    // Tenta buscar QR direto do Zapi
    if (tenant?.whatsappStatus === "CONNECTING" && tenant.zapiInstanceId && tenant.zapiClientToken) {
      const base64 = await zapiGetQRCode(tenant.zapiInstanceId, tenant.zapiClientToken);
      if (base64) {
        await prisma.tenant.update({ where: { id: tenantId }, data: { whatsappQRCode: base64 } });
        return NextResponse.json({ base64, status: "CONNECTING" });
      }
    }

    return NextResponse.json({ base64: null, status: tenant?.whatsappStatus ?? "DISCONNECTED" });
  } catch {
    return NextResponse.json({ error: "Erro ao buscar QR Code" }, { status: 500 });
  }
}
