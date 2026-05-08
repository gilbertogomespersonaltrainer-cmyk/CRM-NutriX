import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTextMessage } from "@/lib/whatsapp";

export async function GET(req: Request) {
  try {
    const secret = req.headers.get("authorization")?.replace("Bearer ", "");
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startOfTomorrow = new Date(
      tomorrow.getFullYear(),
      tomorrow.getMonth(),
      tomorrow.getDate()
    );
    const endOfTomorrow = new Date(startOfTomorrow.getTime() + 24 * 60 * 60 * 1000);

    const appointments = await prisma.appointment.findMany({
      where: {
        scheduledAt: { gte: startOfTomorrow, lt: endOfTomorrow },
        status: "SCHEDULED",
      },
      include: {
        patient: { select: { name: true, phone: true } },
        tenant: {
          select: {
            id: true,
            name: true,
            clinicName: true,
            whatsappStatus: true,
          },
        },
      },
    });

    let sent = 0;
    let failed = 0;

    for (const apt of appointments) {
      if (apt.tenant.whatsappStatus !== "CONNECTED") continue;

      const template = await prisma.messageTemplate.findUnique({
        where: {
          tenantId_type: { tenantId: apt.tenantId, type: "REMINDER" },
        },
      });

      if (!template) continue;

      const scheduledDate = new Date(apt.scheduledAt);
      const message = template.content
        .replace(/{nome_paciente}/g, apt.patient.name)
        .replace(/{nome_nutricionista}/g, apt.tenant.name)
        .replace(/{nome_clinica}/g, apt.tenant.clinicName || "")
        .replace(
          /{data_consulta}/g,
          scheduledDate.toLocaleDateString("pt-BR")
        )
        .replace(
          /{hora_consulta}/g,
          scheduledDate.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          })
        );

      try {
        await sendTextMessage(apt.tenantId, apt.patient.phone, message);
        await prisma.whatsAppLog.create({
          data: {
            tenantId: apt.tenantId,
            patientId: apt.patientId,
            messageType: "REMINDER",
            phoneNumber: apt.patient.phone,
            messageText: message,
            status: "SENT",
          },
        });
        sent++;
      } catch (err) {
        await prisma.whatsAppLog.create({
          data: {
            tenantId: apt.tenantId,
            patientId: apt.patientId,
            messageType: "REMINDER",
            phoneNumber: apt.patient.phone,
            messageText: message,
            status: "FAILED",
            errorMessage: err instanceof Error ? err.message : "Erro",
          },
        });
        failed++;
      }
    }

    return NextResponse.json({ sent, failed, total: appointments.length });
  } catch {
    return NextResponse.json({ error: "Cron error" }, { status: 500 });
  }
}
