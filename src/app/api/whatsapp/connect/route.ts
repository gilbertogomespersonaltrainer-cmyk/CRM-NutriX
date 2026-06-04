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

    // Apaga instância existente (ignora erro se não existir)
    try {
      await deleteInstance(tenantId);
      console.log("[whatsapp/connect] instância anterior deletada");
    } catch {
      console.log("[whatsapp/connect] nenhuma instância anterior");
    }

    await sleep(1500);

    // Limpa QR code antigo e marca como conectando
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { whatsappStatus: "CONNECTING", whatsappQRCode: null },
    });

    // Cria nova instância
    const instanceResult = await createInstance(tenantId);

    // Log completo para diagnóstico (sem truncar)
    console.log("[whatsapp/connect] createInstance keys:", Object.keys(instanceResult || {}));
    console.log("[whatsapp/connect] qrcode field:", JSON.stringify(instanceResult?.qrcode)?.slice(0, 200));

    // Evolution API v2 retorna o base64 diretamente na resposta do createInstance
    const base64 =
      instanceResult?.qrcode?.base64 ??
      instanceResult?.base64 ??
      instanceResult?.data?.qrcode?.base64 ??
      null;

    if (base64) {
      console.log("[whatsapp/connect] QR code obtido da resposta, length:", base64.length);
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { whatsappQRCode: base64, whatsappStatus: "CONNECTING" },
      });
      return NextResponse.json({ ok: true, qrReady: true });
    }

    // Se não veio na resposta, configura webhook para receber async
    console.log("[whatsapp/connect] QR não veio na resposta, aguardando via webhook...");
    try {
      const webhookResult = await setWebhook(tenantId);
      console.log("[whatsapp/connect] setWebhook:", JSON.stringify(webhookResult).slice(0, 300));
    } catch (e) {
      console.warn("[whatsapp/connect] setWebhook error:", e);
    }

    return NextResponse.json({ ok: true, qrReady: false });
  } catch (err) {
    console.error("[whatsapp/connect] error:", err);
    return NextResponse.json({ error: "Erro ao conectar WhatsApp", detail: String(err) }, { status: 500 });
  }
}
