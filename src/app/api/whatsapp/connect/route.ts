import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/session";
import { createInstance, getQRCode, deleteInstance } from "@/lib/whatsapp";

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
      console.log("[whatsapp/connect] nenhuma instância anterior encontrada");
    }

    // Aguarda 1s para garantir que foi deletada
    await sleep(1000);

    // Cria nova instância
    const instanceResult = await createInstance(tenantId);
    console.log("[whatsapp/connect] createInstance:", JSON.stringify(instanceResult));

    // Aguarda 2s para o QR code ser gerado
    await sleep(2000);

    // Busca o QR code
    const qrData = await getQRCode(tenantId);
    console.log("[whatsapp/connect] getQRCode:", JSON.stringify(qrData));

    // Extrai base64 de diferentes formatos da Evolution API
    const base64 =
      qrData?.base64 ??
      qrData?.qrcode?.base64 ??
      instanceResult?.qrcode?.base64 ??
      instanceResult?.base64;

    if (!base64) {
      console.error("[whatsapp/connect] base64 não encontrado na resposta:", JSON.stringify({ qrData, instanceResult }));
      return NextResponse.json(
        { error: "QR Code não disponível. Tente novamente em alguns segundos." },
        { status: 422 }
      );
    }

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { whatsappStatus: "CONNECTING" },
    });

    return NextResponse.json({ base64 });
  } catch (err) {
    console.error("[whatsapp/connect] error:", err);
    return NextResponse.json({ error: "Erro ao conectar WhatsApp", detail: String(err) }, { status: 500 });
  }
}
