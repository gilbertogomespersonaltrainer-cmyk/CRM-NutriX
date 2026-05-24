import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/session";
import { sendTextMessage } from "@/lib/whatsapp";

export async function POST(req: Request) {
  try {
    const tenantId = await getTenantId();
    const body = await req.json() as { message: string; patientIds: string[] };
    const { message, patientIds } = body;

    if (!message || !Array.isArray(patientIds) || patientIds.length === 0) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { whatsappStatus: true },
    });

    if (tenant?.whatsappStatus !== "CONNECTED") {
      return NextResponse.json({ error: "WhatsApp não conectado" }, { status: 400 });
    }

    const patients = await prisma.patient.findMany({
      where: { id: { in: patientIds }, tenantId },
      select: { id: true, name: true, phone: true },
    });

    let sent = 0;
    let failed = 0;

    await Promise.allSettled(
      patients.map(async (patient) => {
        const personalizedMessage = message.replace(/\{nome_paciente\}/g, patient.name);
        try {
          await sendTextMessage(tenantId, patient.phone, personalizedMessage);
          await prisma.whatsAppLog.create({
            data: {
              tenantId,
              patientId: patient.id,
              messageType: "BROADCAST",
              phoneNumber: patient.phone,
              messageText: personalizedMessage,
              status: "SENT",
            },
          });
          sent++;
        } catch (err) {
          await prisma.whatsAppLog.create({
            data: {
              tenantId,
              patientId: patient.id,
              messageType: "BROADCAST",
              phoneNumber: patient.phone,
              messageText: personalizedMessage,
              status: "FAILED",
              errorMessage: err instanceof Error ? err.message : "Erro desconhecido",
            },
          });
          failed++;
        }
      })
    );

    return NextResponse.json({ sent, failed });
  } catch {
    return NextResponse.json({ error: "Erro ao realizar envio em massa" }, { status: 500 });
  }
}
