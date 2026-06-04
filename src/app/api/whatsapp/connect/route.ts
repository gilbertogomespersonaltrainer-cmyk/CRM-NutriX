import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/session";
import { createInstance, deleteInstance, logoutInstance } from "@/lib/whatsapp";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST() {
  try {
    const tenantId = await getTenantId();

    // 1) Logout para limpar TODAS as credenciais salvas (força novo QR code)
    try {
      const logoutResult = await logoutInstance(tenantId);
      console.log("[whatsapp/connect] logout:", JSON.stringify(logoutResult).slice(0, 200));
    } catch { /* instância não existe ainda */ }

    await sleep(1000);

    // 2) Delete para remover a instância completamente
    try {
      const deleteResult = await deleteInstance(tenantId);
      console.log("[whatsapp/connect] delete:", JSON.stringify(deleteResult).slice(0, 200));
    } catch { /* ignora */ }

    await sleep(2000);

    // 3) Limpa banco e marca como conectando
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { whatsappStatus: "CONNECTING", whatsappQRCode: null },
    });

    // 4) Cria instância nova e limpa (sem credenciais antigas)
    const instanceResult = await createInstance(tenantId);
    // Log completo para diagnóstico
    console.log("[whatsapp/connect] create FULL response:", JSON.stringify(instanceResult).slice(0, 800));

    // Se retornou erro, instância pode ainda existir
    if (instanceResult?.status === 400 || instanceResult?.status === 409 || instanceResult?.error) {
      console.error("[whatsapp/connect] create FAILED:", instanceResult?.error || instanceResult?.message);
      return NextResponse.json({ error: "Falha ao criar instância: " + (instanceResult?.message || instanceResult?.error || "Erro desconhecido") }, { status: 500 });
    }

    // 5) Verifica se o QR code veio na resposta do create
    const base64 =
      instanceResult?.qrcode?.base64 ??
      instanceResult?.base64 ??
      null;

    if (base64 && base64.length > 100) {
      console.log("[whatsapp/connect] QR code na resposta do create! length:", base64.length);
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { whatsappQRCode: base64, whatsappStatus: "CONNECTING" },
      });
      return NextResponse.json({ ok: true, qrReady: true });
    }

    console.log("[whatsapp/connect] QR não veio no create. qrcode field:", JSON.stringify(instanceResult?.qrcode));
    return NextResponse.json({ ok: true, qrReady: false });

  } catch (err) {
    console.error("[whatsapp/connect] error:", err);
    return NextResponse.json({ error: "Erro ao conectar WhatsApp", detail: String(err) }, { status: 500 });
  }
}
