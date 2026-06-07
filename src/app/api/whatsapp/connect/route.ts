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

    // Aguarda WAHA recriar a sessão e gerar o QR (delete+create leva ~1s extra)
    await new Promise(r => setTimeout(r, 3000));

    // Tenta buscar QR (até 2 tentativas com 1.5s de intervalo — total <8s no Vercel)
    let base64: string | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      base64 = await wahaGetQRCode(tenantId);
      console.log(`[whatsapp/connect] tentativa ${attempt + 1} QR length:`, base64?.length ?? 0);
      if (base64) break;
      await new Promise(r => setTimeout(r, 1500));
    }

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
