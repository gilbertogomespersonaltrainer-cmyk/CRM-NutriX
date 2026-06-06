import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/session";
import { wahaStartSession, wahaGetQRCode } from "@/lib/waha";

export async function POST() {
  try {
    const tenantId = await getTenantId();

    // Limpa QR antigo e marca como conectando
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { whatsappStatus: "CONNECTING", whatsappQRCode: null },
    });

    // Inicia sessão WAHA para este tenant
    await wahaStartSession(tenantId);

    // Aguarda 2s para o WAHA gerar o QR
    await new Promise(r => setTimeout(r, 2000));

    // Tenta buscar QR
    const base64 = await wahaGetQRCode(tenantId);
    console.log("[whatsapp/connect] WAHA QR length:", base64?.length ?? 0);

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
