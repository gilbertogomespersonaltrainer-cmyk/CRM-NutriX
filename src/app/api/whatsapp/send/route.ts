import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/session";
import { sendTextMessage } from "@/lib/whatsapp";

export async function POST(req: Request) {
  try {
    const tenantId = await getTenantId();
    const body = await req.json();

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { whatsappStatus: true },
    });

    if (tenant?.whatsappStatus !== "CONNECTED") {
      return NextResponse.json(
        { error: "WhatsApp não conectado" },
        { status: 400 }
      );
    }

    try {
      await sendTextMessage(tenantId, body.phone, body.message);

      await prisma.whatsAppLog.create({
        data: {
          tenantId,
          patientId: body.patientId || null,
          messageType: body.messageType || "MANUAL",
          phoneNumber: body.phone,
          messageText: body.message,
          status: "SENT",
        },
      });

      return NextResponse.json({ success: true });
    } catch (err) {
      await prisma.whatsAppLog.create({
        data: {
          tenantId,
          patientId: body.patientId || null,
          messageType: body.messageType || "MANUAL",
          phoneNumber: body.phone,
          messageText: body.message,
          status: "FAILED",
          errorMessage: err instanceof Error ? err.message : "Erro desconhecido",
        },
      });

      return NextResponse.json({ error: "Falha ao enviar mensagem" }, { status: 500 });
    }
  } catch {
    return NextResponse.json({ error: "Erro ao enviar mensagem" }, { status: 500 });
  }
}
