import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // Log completo do payload para diagnóstico
    console.log("[webhook/whatsapp] PAYLOAD:", JSON.stringify(body).slice(0, 600));

    // Evolution API v2 pode usar 'instance' ou 'instanceName'
    const instanceName = body.instance || body.instanceName || "";
    // Suporta prefixos "nx_" (novo) e "tenant_" (legado)
    const tenantId = instanceName.replace(/^nx_/, "").replace(/^tenant_/, "");

    if (!tenantId) {
      return NextResponse.json({ error: "Invalid instance" }, { status: 400 });
    }

    // Normaliza event name para lowercase (Evolution API v2 pode enviar QRCODE_UPDATED ou qrcode.updated)
    const event = (body.event || "").toLowerCase().replace(/_/g, ".");

    // QR Code gerado pela Evolution API — salva no banco
    if (event === "qrcode.updated") {
      // Tenta todos os campos possíveis onde o base64 pode estar
      const base64 =
        body.data?.qrcode?.base64 ??
        body.data?.base64 ??
        body.qrcode?.base64 ??
        body.base64 ??
        null;
      console.log("[webhook/whatsapp] qrcode.updated, tenantId:", tenantId, "base64 length:", base64?.length ?? 0);
      if (base64) {
        await prisma.tenant.update({
          where: { id: tenantId },
          data: { whatsappQRCode: base64, whatsappStatus: "CONNECTING" },
        });
      }
    }

    // Conexão atualizada
    if (event === "connection.update") {
      const state = body.data?.state;
      console.log("[webhook/whatsapp] connection.update state:", state);

      if (state === "open") {
        await prisma.tenant.update({
          where: { id: tenantId },
          data: {
            whatsappStatus: "CONNECTED",
            whatsappPhone: body.data?.phoneNumber || null,
            whatsappConnectedAt: new Date(),
            whatsappQRCode: null,
          },
        });
      } else if (state === "close") {
        await prisma.tenant.update({
          where: { id: tenantId },
          data: { whatsappStatus: "DISCONNECTED", whatsappQRCode: null },
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[webhook/whatsapp] error:", err);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}
