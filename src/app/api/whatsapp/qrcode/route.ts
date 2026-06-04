import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/session";
import { getQRCode } from "@/lib/whatsapp";

export async function GET() {
  try {
    const tenantId = await getTenantId();
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { whatsappQRCode: true, whatsappStatus: true },
    });

    // 1) Se o webhook já salvou o QR code no banco, retorna direto
    if (tenant?.whatsappQRCode) {
      return NextResponse.json({
        base64: tenant.whatsappQRCode,
        status: tenant.whatsappStatus ?? "CONNECTING",
      });
    }

    // 2) Se está conectando mas o webhook ainda não chegou, tenta buscar direto na Evolution API
    if (tenant?.whatsappStatus === "CONNECTING") {
      try {
        const qrData = await getQRCode(tenantId);
        console.log("[whatsapp/qrcode] direct API result:", JSON.stringify(qrData).slice(0, 300));

        // Evolution API v2 pode retornar em vários formatos
        const base64 =
          qrData?.base64 ??
          qrData?.qrcode?.base64 ??
          qrData?.data?.base64 ??
          qrData?.data?.qrcode?.base64 ??
          null;

        if (base64) {
          // Salva no banco para próximas requisições
          await prisma.tenant.update({
            where: { id: tenantId },
            data: { whatsappQRCode: base64 },
          });
          return NextResponse.json({ base64, status: "CONNECTING" });
        }
      } catch (e) {
        console.warn("[whatsapp/qrcode] direct API error:", e);
      }
    }

    return NextResponse.json({
      base64: null,
      status: tenant?.whatsappStatus ?? "DISCONNECTED",
    });
  } catch {
    return NextResponse.json({ error: "Erro ao buscar QR Code" }, { status: 500 });
  }
}
