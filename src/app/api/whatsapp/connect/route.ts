import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/session";
import { createInstance, deleteInstance, logoutInstance, fetchAllInstances, instanceName } from "@/lib/whatsapp";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST() {
  try {
    const tenantId = await getTenantId();
    const targetName = instanceName(tenantId);

    // 1) Busca TODAS as instâncias na Evolution API e deleta as relacionadas a este tenant
    try {
      const allInstances = await fetchAllInstances();
      console.log("[whatsapp/connect] total instâncias encontradas:", Array.isArray(allInstances) ? allInstances.length : "N/A");

      if (Array.isArray(allInstances)) {
        for (const inst of allInstances) {
          const name = inst?.instance?.instanceName ?? inst?.instanceName ?? "";
          if (name === targetName || name.startsWith(`tenant_${tenantId}`)) {
            console.log("[whatsapp/connect] deletando instância:", name);
            try {
              await fetch(`${process.env.EVOLUTION_API_URL}/instance/logout/${name}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json", apikey: process.env.EVOLUTION_API_KEY || "" },
              });
              await sleep(500);
              await fetch(`${process.env.EVOLUTION_API_URL}/instance/delete/${name}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json", apikey: process.env.EVOLUTION_API_KEY || "" },
              });
            } catch { /* ignora */ }
          }
        }
      }
    } catch (e) {
      console.warn("[whatsapp/connect] erro ao listar instâncias:", e);
    }

    // 2) Fallback: tenta deletar pelo nome padrão
    try {
      await logoutInstance(tenantId);
    } catch { /* ignora */ }
    try {
      await deleteInstance(tenantId);
    } catch { /* ignora */ }

    // 3) Espera a limpeza ser concluída
    await sleep(3000);

    // 4) Limpa banco
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { whatsappStatus: "CONNECTING", whatsappQRCode: null },
    });

    // 5) Cria instância nova e limpa
    const instanceResult = await createInstance(tenantId);
    console.log("[whatsapp/connect] create FULL response:", JSON.stringify(instanceResult).slice(0, 1000));

    // Detecta erro no create
    if (instanceResult?.status >= 400 || instanceResult?.error || instanceResult?.message?.includes("already")) {
      console.error("[whatsapp/connect] create FAILED:", JSON.stringify(instanceResult));
      return NextResponse.json({ error: "Falha ao criar instância: " + (instanceResult?.message || instanceResult?.error) }, { status: 500 });
    }

    // 6) Verifica se QR code veio na resposta
    const base64 =
      instanceResult?.qrcode?.base64 ??
      instanceResult?.base64 ??
      null;

    if (base64 && base64.length > 100) {
      console.log("[whatsapp/connect] QR code na resposta! length:", base64.length);
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { whatsappQRCode: base64, whatsappStatus: "CONNECTING" },
      });
      return NextResponse.json({ ok: true, qrReady: true });
    }

    console.log("[whatsapp/connect] QR não veio no create. qrcode:", JSON.stringify(instanceResult?.qrcode));
    return NextResponse.json({ ok: true, qrReady: false });

  } catch (err) {
    console.error("[whatsapp/connect] error:", err);
    return NextResponse.json({ error: "Erro ao conectar WhatsApp", detail: String(err) }, { status: 500 });
  }
}
