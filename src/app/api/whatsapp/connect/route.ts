import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/session";
import { zapiGetQRCode } from "@/lib/zapi";

export async function POST() {
  try {
    const tenantId = await getTenantId();

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { zapiInstanceId: true, zapiClientToken: true },
    });

    if (!tenant?.zapiInstanceId || !tenant?.zapiClientToken) {
      return NextResponse.json(
        { error: "Configure o Instance ID e o Client Token do Zapi primeiro." },
        { status: 400 }
      );
    }

    // Limpa QR antigo e marca como conectando
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { whatsappStatus: "CONNECTING", whatsappQRCode: null },
    });

    // Zapi retorna o QR code de forma síncrona
    const base64 = await zapiGetQRCode(tenant.zapiInstanceId, tenant.zapiClientToken);
    console.log("[whatsapp/connect] Zapi QR base64 length:", base64?.length ?? 0);

    if (base64) {
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { whatsappQRCode: base64 },
      });
      return NextResponse.json({ ok: true, qrReady: true });
    }

    return NextResponse.json({ ok: true, qrReady: false });
  } catch (err) {
    console.error("[whatsapp/connect] erro:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
