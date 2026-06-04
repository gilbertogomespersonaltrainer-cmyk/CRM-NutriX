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

    // Cria nova instância — Evolution API v2 entrega QR code via webhook
    const instanceResult = await createInstance(tenantId);
    console.log("[whatsapp/connect] createInstance:", JSON.stringify(instanceResult).slice(0, 500));

    return NextResponse.json({ ok: true, message: "Aguardando QR Code via webhook..." });
  } catch (err) {
    console.error("[whatsapp/connect] error:", err);
    return NextResponse.json({ error: "Erro ao conectar WhatsApp", detail: String(err) }, { status: 500 });
  }
}
