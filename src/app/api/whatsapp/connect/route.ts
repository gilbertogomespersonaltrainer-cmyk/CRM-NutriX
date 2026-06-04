import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/session";
import { createInstance, deleteInstance } from "@/lib/whatsapp";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST() {
  try {
    const tenantId = await getTenantId();

    // Apaga instância existente
    try {
      await deleteInstance(tenantId);
    } catch { /* ignora */ }

    await sleep(1500);

    // Limpa QR code e marca como conectando
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { whatsappStatus: "CONNECTING", whatsappQRCode: null },
    });

    // Cria nova instância — retorna imediatamente (sem polling server-side)
    const instanceResult = await createInstance(tenantId);
    console.log("[whatsapp/connect] createInstance keys:", Object.keys(instanceResult || {}));

    // Tenta extrair QR code da resposta imediata do createInstance
    const base64 =
      instanceResult?.qrcode?.base64 ??
      instanceResult?.base64 ??
      null;

    if (base64 && base64.length > 100) {
      console.log("[whatsapp/connect] QR code na resposta do create, length:", base64.length);
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { whatsappQRCode: base64, whatsappStatus: "CONNECTING" },
      });
      return NextResponse.json({ ok: true, qrReady: true });
    }

    // QR não veio no create — cliente vai fazer polling
    console.log("[whatsapp/connect] QR não veio no create, cliente fará polling");
    return NextResponse.json({ ok: true, qrReady: false });

  } catch (err) {
    console.error("[whatsapp/connect] error:", err);
    return NextResponse.json({ error: "Erro ao conectar WhatsApp", detail: String(err) }, { status: 500 });
  }
}
