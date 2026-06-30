import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/session";
import { evoStartSession } from "@/lib/evolution";

export async function POST() {
  try {
    const tenantId = await getTenantId();

    // Limpa QR antigo e marca como conectando
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { whatsappStatus: "CONNECTING", whatsappQRCode: null },
    });

    // Inicia sessão WAHA (delete + recreate em background)
    await evoStartSession(tenantId);

    // Retorna imediatamente — o frontend vai buscar o QR via polling
    return NextResponse.json({ ok: true, qrReady: false });
  } catch (err) {
    console.error("[whatsapp/connect] erro:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
