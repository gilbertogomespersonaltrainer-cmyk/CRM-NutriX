import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/session";
import { createInstance, deleteInstance, getQRCode } from "@/lib/whatsapp";

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

    await sleep(2000);

    // Limpa QR code antigo e marca como conectando
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { whatsappStatus: "CONNECTING", whatsappQRCode: null },
    });

    // Cria nova instância
    const instanceResult = await createInstance(tenantId);
    console.log("[whatsapp/connect] createInstance keys:", Object.keys(instanceResult || {}));

    // 1) Tenta extrair QR code da resposta direta do createInstance
    const base64FromCreate =
      instanceResult?.qrcode?.base64 ??
      instanceResult?.base64 ??
      null;

    if (base64FromCreate) {
      console.log("[whatsapp/connect] QR code veio no createInstance, length:", base64FromCreate.length);
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { whatsappQRCode: base64FromCreate, whatsappStatus: "CONNECTING" },
      });
      return NextResponse.json({ ok: true, qrReady: true });
    }

    // 2) QR não veio no create — polling direto na Evolution API até 30s
    console.log("[whatsapp/connect] QR não veio no create, iniciando polling...");
    for (let i = 0; i < 10; i++) {
      await sleep(3000);
      try {
        const qrData = await getQRCode(tenantId);
        console.log(`[whatsapp/connect] polling ${i + 1}/10:`, JSON.stringify(qrData).slice(0, 200));

        const base64 =
          qrData?.base64 ??
          qrData?.qrcode?.base64 ??
          qrData?.data?.base64 ??
          qrData?.data?.qrcode?.base64 ??
          null;

        if (base64 && base64.length > 100) {
          console.log("[whatsapp/connect] QR code encontrado no polling, length:", base64.length);
          await prisma.tenant.update({
            where: { id: tenantId },
            data: { whatsappQRCode: base64, whatsappStatus: "CONNECTING" },
          });
          return NextResponse.json({ ok: true, qrReady: true });
        }
      } catch (e) {
        console.warn(`[whatsapp/connect] polling ${i + 1} error:`, e);
      }
    }

    // Não conseguiu o QR code — retorna ok para o frontend continuar tentando via webhook
    console.log("[whatsapp/connect] polling esgotado, dependendo do webhook");
    return NextResponse.json({ ok: true, qrReady: false });

  } catch (err) {
    console.error("[whatsapp/connect] error:", err);
    return NextResponse.json({ error: "Erro ao conectar WhatsApp", detail: String(err) }, { status: 500 });
  }
}
