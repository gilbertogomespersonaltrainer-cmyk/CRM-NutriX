import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const secret = req.headers.get("x-webhook-secret");
    if (secret !== process.env.WHATSAPP_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const instanceName = body.instance || "";
    const tenantId = instanceName.replace("tenant_", "");

    if (!tenantId) {
      return NextResponse.json({ error: "Invalid instance" }, { status: 400 });
    }

    if (body.event === "connection.update") {
      const state = body.data?.state;

      if (state === "open") {
        await prisma.tenant.update({
          where: { id: tenantId },
          data: {
            whatsappStatus: "CONNECTED",
            whatsappPhone: body.data?.phoneNumber || null,
            whatsappConnectedAt: new Date(),
          },
        });
      } else if (state === "close") {
        await prisma.tenant.update({
          where: { id: tenantId },
          data: { whatsappStatus: "DISCONNECTED" },
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}
