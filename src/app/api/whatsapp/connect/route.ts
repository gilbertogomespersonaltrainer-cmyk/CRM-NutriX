import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/session";
import { createInstance, fetchAllInstances, instanceName } from "@/lib/whatsapp";

const EVO_URL = process.env.EVOLUTION_API_URL!;
const EVO_KEY = process.env.EVOLUTION_API_KEY!;

function evoHeaders() {
  return { "Content-Type": "application/json", apikey: EVO_KEY };
}

async function hardDelete(name: string) {
  try {
    await fetch(`${EVO_URL}/instance/logout/${name}`, { method: "DELETE", headers: evoHeaders() });
  } catch { /* ignora */ }
  try {
    await fetch(`${EVO_URL}/instance/delete/${name}`, { method: "DELETE", headers: evoHeaders() });
  } catch { /* ignora */ }
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

export async function POST() {
  try {
    const tenantId = await getTenantId();
    const newName = instanceName(tenantId); // "nx_<tenantId>"

    // 1) Apaga TODAS as instâncias associadas a este tenant (qualquer prefixo)
    try {
      const all = await fetchAllInstances();
      if (Array.isArray(all)) {
        for (const inst of all) {
          const n: string = inst?.instance?.instanceName ?? inst?.instanceName ?? "";
          if (
            n === newName ||
            n === `tenant_${tenantId}` ||
            n.includes(tenantId)
          ) {
            console.log("[whatsapp/connect] deletando instância antiga:", n);
            await hardDelete(n);
            await sleep(500);
          }
        }
      }
    } catch (e) {
      console.warn("[whatsapp/connect] fetchAllInstances error:", e);
    }

    // Fallback: deleta pelo nome novo e pelo nome antigo diretamente
    await hardDelete(newName);
    await hardDelete(`tenant_${tenantId}`);

    await sleep(2000);

    // 2) Atualiza banco
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { whatsappStatus: "CONNECTING", whatsappQRCode: null },
    });

    // 3) Cria instância com nome novo (sem credenciais antigas)
    const result = await createInstance(tenantId);
    console.log("[whatsapp/connect] createInstance response:", JSON.stringify(result).slice(0, 1000));

    // 4) QR code pode vir na resposta imediata do create
    const base64 = result?.qrcode?.base64 ?? result?.base64 ?? null;

    if (base64 && base64.length > 100) {
      console.log("[whatsapp/connect] QR na resposta do create! length:", base64.length);
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { whatsappQRCode: base64 },
      });
      return NextResponse.json({ ok: true, qrReady: true });
    }

    console.log("[whatsapp/connect] QR não veio no create. qrcode:", JSON.stringify(result?.qrcode));
    return NextResponse.json({ ok: true, qrReady: false });

  } catch (err) {
    console.error("[whatsapp/connect] ERRO:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
