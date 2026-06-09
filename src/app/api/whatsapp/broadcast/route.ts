import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/session";
import { wahaSendText } from "@/lib/waha";

const DELAY_MS = 1500; // 1.5s entre cada mensagem para evitar banimento

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

    // Envio sequencial com delay — evita comportamento de disparo em massa
    for (let i = 0; i < patients.length; i++) {
      const patient = patients[i];
      const personalizedMessage = message.replace(/\{nome_paciente\}/g, patient.name.split(" ")[0]);

      try {
        await wahaSendText(tenantId, patient.phone, personalizedMessage);
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

      // Aguarda entre mensagens (exceto após a última)
      if (i < patients.length - 1) {
        await sleep(DELAY_MS);
      }
    }

    return NextResponse.json({ sent, failed });
  } catch {
    return NextResponse.json({ error: "Erro ao enviar mensagens" }, { status: 500 });
  }
}
