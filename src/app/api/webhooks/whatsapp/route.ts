import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("[webhook/zapi] payload:", JSON.stringify(body).slice(0, 400));

    // Zapi envia instanceId no body
    const instanceId: string = body.instanceId ?? body.instance ?? "";
    if (!instanceId) return NextResponse.json({ received: true });

    // Encontra o tenant pelo zapiInstanceId
    const tenant = await prisma.tenant.findFirst({
      where: { zapiInstanceId: instanceId },
      select: { id: true },
    });

    if (!tenant) {
      console.warn("[webhook/zapi] tenant não encontrado para instanceId:", instanceId);
      return NextResponse.json({ received: true });
    }

    const type: string = (body.type ?? body.event ?? "").toLowerCase();
    console.log("[webhook/zapi] type:", type, "tenantId:", tenant.id);

    // Conectado
    if (type === "connected" || type === "connection.update.open") {
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: {
          whatsappStatus: "CONNECTED",
          whatsappPhone: body.phone ?? body.phoneNumber ?? null,
          whatsappConnectedAt: new Date(),
          whatsappQRCode: null,
        },
      });
    }

    // Desconectado
    if (type === "disconnected" || type === "connection.update.close") {
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { whatsappStatus: "DISCONNECTED", whatsappQRCode: null },
      });
    }

    // QR Code chegou via webhook
    if (type === "qrcode" || type === "qrcode.updated") {
      const base64 = body.qrcode ?? body.value ?? body.base64 ?? null;
      if (base64 && base64.length > 100) {
        await prisma.tenant.update({
          where: { id: tenant.id },
          data: { whatsappQRCode: base64, whatsappStatus: "CONNECTING" },
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[webhook/zapi] erro:", err);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}
