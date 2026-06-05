import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getQRCode } from "@/lib/whatsapp";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const rawInstanceName: string = body.instance || body.instanceName || "";
    // Suporta prefixos "nx_" (novo) e "tenant_" (legado)
    const tenantId = rawInstanceName.replace(/^nx_/, "").replace(/^tenant_/, "");

    const event = (body.event || "").toLowerCase().replace(/_/g, ".");

    console.log("[webhook] event:", body.event, "| instance:", rawInstanceName, "| tenantId:", tenantId);

    if (!tenantId || tenantId === rawInstanceName) {
      console.warn("[webhook] tenantId inválido, instanceName não reconhecido:", rawInstanceName);
      return NextResponse.json({ received: true });
    }

    // ── QR Code chegou via evento ─────────────────────────────────────────────
    if (event === "qrcode.updated") {
      const base64 =
        body.data?.qrcode?.base64 ??
        body.data?.base64 ??
        body.qrcode?.base64 ??
        body.base64 ??
        null;
      console.log("[webhook] qrcode.updated — base64 length:", base64?.length ?? 0);
      if (base64 && base64.length > 100) {
        await prisma.tenant.update({
          where: { id: tenantId },
          data: { whatsappQRCode: base64, whatsappStatus: "CONNECTING" },
        });
      }
      return NextResponse.json({ received: true });
    }

    // ── Atualização de conexão ────────────────────────────────────────────────
    if (event === "connection.update") {
      const state: string = body.data?.state ?? "";
      console.log("[webhook] connection.update state:", state);

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
        return NextResponse.json({ received: true });
      }

      if (state === "close") {
        await prisma.tenant.update({
          where: { id: tenantId },
          data: { whatsappStatus: "DISCONNECTED", whatsappQRCode: null },
        });
        return NextResponse.json({ received: true });
      }

      // Quando "connecting" e ainda sem QR, tenta buscar direto na API
      if (state === "connecting") {
        const tenant = await prisma.tenant.findUnique({
          where: { id: tenantId },
          select: { whatsappQRCode: true },
        });

        if (!tenant?.whatsappQRCode) {
          try {
            const qrData = await getQRCode(tenantId);
            const base64 =
              qrData?.base64 ??
              qrData?.qrcode?.base64 ??
              null;
            console.log("[webhook] connecting — tentativa QR, count:", qrData?.count, "base64 length:", base64?.length ?? 0);
            if (base64 && base64.length > 100) {
              await prisma.tenant.update({
                where: { id: tenantId },
                data: { whatsappQRCode: base64, whatsappStatus: "CONNECTING" },
              });
              console.log("[webhook] QR SALVO via connecting event!");
            }
          } catch (e) {
            console.warn("[webhook] erro ao buscar QR no connecting:", e);
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[webhook] ERRO:", err);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}
