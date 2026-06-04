import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/session";
import { createInstance, deleteInstance, setWebhook } from "@/lib/whatsapp";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST() {
  try {
    const tenantId = await getTenantId();

    // Apaga instância existente
    try {
      await deleteInstance(tenantId);
      console.log("[whatsapp/connect] instância anterior deletada");
    } catch {
      console.log("[whatsapp/connect] nenhuma instância anterior");
    }

    await sleep(1000);

    // Limpa QR code antigo e marca como conectando
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { whatsappStatus: "CONNECTING", whatsappQRCode: null },
    });

    // Cria nova instância
    const instanceResult = await createInstance(tenantId);
    console.log("[whatsapp/connect] createInstance:", JSON.stringify(instanceResult).slice(0, 500));

    // Aguarda instância inicializar e configura webhook separadamente
    await sleep(2000);
    try {
      const webhookResult = await setWebhook(tenantId);
      console.log("[whatsapp/connect] setWebhook:", JSON.stringify(webhookResult).slice(0, 300));
    } catch (e) {
      console.warn("[whatsapp/connect] setWebhook error (non-fatal):", e);
    }

    return NextResponse.json({ ok: true, message: "Aguardando QR Code..." });
  } catch (err) {
    console.error("[whatsapp/connect] error:", err);
    return NextResponse.json({ error: "Erro ao conectar WhatsApp", detail: String(err) }, { status: 500 });
  }
}
