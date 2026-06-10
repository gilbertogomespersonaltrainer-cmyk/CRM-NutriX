import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/session";
import { wahaSendText } from "@/lib/waha";
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

    // Automação de Pipeline: avança o estágio do paciente ao criar agendamento
    // LEAD → FIRST_CONSULTATION (primeiro agendamento confirmado)
    // INACTIVE → REACTIVATED (voltou a agendar após inatividade)
    if (patient.stage === "LEAD" || patient.stage === "INACTIVE") {
      const newStage = patient.stage === "LEAD" ? "FIRST_CONSULTATION" : "REACTIVATED";
      await prisma.patient.update({
        where: { id: patient.id },
        data: { stage: newStage, isActive: true },
      });
    }

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

          // Prioridade: 1) whatsappChatId salvo no paciente (cobre LIDs)
          //             2) último chatId do inbox (fallback)
          //             3) constrói a partir do telefone
          const patientFull = await prisma.patient.findUnique({
            where: { id: patient.id },
            select: { whatsappChatId: true },
          });
          const phoneDigits = patient.phone.replace(/\D/g, "");
          const normalizedPhone = phoneDigits.length <= 11 ? `55${phoneDigits}` : phoneDigits;
          let resolvedChatId: string | undefined = patientFull?.whatsappChatId ?? undefined;
          if (!resolvedChatId) {
            const lastInboxMsg = await prisma.inboxMessage.findFirst({
              where: { tenantId, phone: normalizedPhone, fromMe: false, chatId: { not: null } },
              orderBy: { timestamp: "desc" },
              select: { chatId: true },
            });
            resolvedChatId = lastInboxMsg?.chatId ?? undefined;
          }

          await wahaSendText(tenantId, patient.phone, message, resolvedChatId);
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
