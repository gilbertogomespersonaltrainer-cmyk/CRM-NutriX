import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/session";
import { sendTextMessage } from "@/lib/whatsapp";
import { replaceTemplateVars, formatDateBR, formatTimeBR } from "@/lib/templates";

export async function GET(req: Request) {
  try {
    const tenantId = await getTenantId();
    const { searchParams } = new URL(req.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    const patientId = searchParams.get("patientId");

    const where: Record<string, unknown> = { tenantId };

    if (start && end) {
      where.scheduledAt = {
        gte: new Date(start),
        lte: new Date(end),
      };
    }

    if (patientId) where.patientId = patientId;

    const appointments = await prisma.appointment.findMany({
      where,
      include: { patient: { select: { name: true, phone: true } } },
      orderBy: { scheduledAt: "asc" },
    });

    return NextResponse.json(appointments);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar agendamentos" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const tenantId = await getTenantId();
    const body = await req.json();

    const patient = await prisma.patient.findFirst({
      where: { id: body.patientId, tenantId },
    });
    if (!patient) {
      return NextResponse.json({ error: "Paciente não encontrado" }, { status: 404 });
    }

    const appointment = await prisma.appointment.create({
      data: {
        tenantId,
        patientId: body.patientId,
        scheduledAt: new Date(body.scheduledAt),
        duration: body.duration || 50,
        notes: body.notes || null,
        consultationType: body.consultationType || null,
      },
      include: { patient: { select: { name: true, phone: true } } },
    });

    // Envia confirmação automática via WhatsApp
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true, clinicName: true, whatsappStatus: true },
      });

      if (tenant?.whatsappStatus === "CONNECTED") {
        const template = await prisma.messageTemplate.findUnique({
          where: { tenantId_type: { tenantId, type: "CONFIRMATION" } },
        });

        if (template) {
          const scheduledDate = new Date(appointment.scheduledAt);
          const message = replaceTemplateVars(template.content, {
            nome_paciente: patient.name,
            nome_nutricionista: tenant.name,
            nome_clinica: tenant.clinicName || "",
            data_consulta: formatDateBR(scheduledDate),
            hora_consulta: formatTimeBR(scheduledDate),
            tipo_consulta: appointment.consultationType || "",
          });

          await sendTextMessage(tenantId, patient.phone, message);
          await prisma.appointment.update({
            where: { id: appointment.id },
            data: { confirmationSent: true },
          });
          await prisma.whatsAppLog.create({
            data: {
              tenantId,
              patientId: patient.id,
              messageType: "CONFIRMATION",
              phoneNumber: patient.phone,
              messageText: message,
              status: "SENT",
            },
          });
        }
      }
    } catch (err) {
      // Não bloqueia a criação do agendamento se o envio falhar
      console.error("[confirmation-send]", err);
    }

    return NextResponse.json(appointment, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar agendamento" }, { status: 500 });
  }
}
