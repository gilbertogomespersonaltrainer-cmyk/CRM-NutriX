import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const secret = req.headers.get("x-webhook-secret");
    if (secret !== process.env.WHATSAPP_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    console.log("[webhook/whatsapp] event:", body.event, "instance:", body.instance);

    const instanceName = body.instance || "";
    const tenantId = instanceName.replace("tenant_", "");

    if (!tenantId) {
      return NextResponse.json({ error: "Invalid instance" }, { status: 400 });
    }

    // QR Code gerado pela Evolution API — salva no banco
    if (body.event === "qrcode.updated") {
      const base64 = body.data?.qrcode?.base64 ?? body.data?.base64 ?? null;
      console.log("[webhook/whatsapp] qrcode.updated, base64 length:", base64?.length ?? 0);
      if (base64) {
        await prisma.tenant.update({
          where: { id: tenantId },
          data: { whatsappQRCode: base64, whatsappStatus: "CONNECTING" },
        });
      }
    }

    // Conexão atualizada
    if (body.event === "connection.update") {
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
