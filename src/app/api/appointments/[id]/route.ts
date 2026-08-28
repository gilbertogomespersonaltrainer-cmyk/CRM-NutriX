import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/session";
import { updateCalendarEvent, deleteCalendarEvent } from "@/lib/google-calendar";
import { evoSendText } from "@/lib/evolution";
import { replaceTemplateVars, formatDateBR, formatTimeBR } from "@/lib/templates";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = await getTenantId();
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.appointment.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
        duration: body.duration,
        status: body.status,
        notes: body.notes,
        consultationType: body.consultationType !== undefined ? body.consultationType : undefined,
        appointmentModality: body.appointmentModality !== undefined ? body.appointmentModality : undefined,
      },
      include: { patient: { select: { name: true, phone: true } } },
    });

    if (body.status === "COMPLETED") {
      const patient = await prisma.patient.findUnique({
        where: { id: existing.patientId },
        select: { stage: true },
      });

      // Automação de Pipeline: FIRST_CONSULTATION → ACTIVE ao concluir a 1ª consulta
      const stageUpdate =
        patient?.stage === "FIRST_CONSULTATION" ? { stage: "ACTIVE" as const } : {};

      await prisma.patient.update({
        where: { id: existing.patientId },
        data: { lastAppointmentAt: new Date(), isActive: true, ...stageUpdate },
      });

      // Cria lançamento financeiro automático já como PAGO
      if (body.serviceTypeId) {
        const serviceType = await prisma.serviceType.findFirst({
          where: { id: body.serviceTypeId, tenantId },
        });
        if (serviceType) {
          // Remove pagamentos pendentes duplicados para este agendamento
          const pendingPayments = await prisma.payment.findMany({
            where: { appointmentId: id, tenantId, status: "PENDING" },
            select: { id: true },
          });
          if (pendingPayments.length > 0) {
            const ids = pendingPayments.map((p) => p.id);
            await prisma.installment.deleteMany({ where: { paymentId: { in: ids } } });
            await prisma.payment.deleteMany({ where: { id: { in: ids } } });
          }
          const totalAmount = body.totalAmount ?? serviceType.defaultPrice;
          const discountAmount = body.discountAmount ?? 0;
          const finalAmount = Math.max(0, totalAmount - discountAmount);
          const installmentCount = Math.max(1, body.installmentCount || 1);
          const modality = installmentCount > 1 ? "PARCELADO" : "AVISTA";
          const payment = await prisma.payment.create({
            data: {
              tenantId,
              patientId: existing.patientId,
              appointmentId: id,
              serviceTypeId: serviceType.id,
              description: `${serviceType.name} — registrado ao concluir consulta`,
              notes: body.notes || null,
              totalAmount,
              discountAmount,
              finalAmount,
              modality,
              installmentCount,
              paymentMethod: body.paymentMethod || "Pix",
              status: installmentCount > 1 ? "PARTIALLY_PAID" : "PAID",
            },
          });
          const installmentAmount = parseFloat((finalAmount / installmentCount).toFixed(2));
          for (let i = 1; i <= installmentCount; i++) {
            const dueDate = new Date();
            dueDate.setMonth(dueDate.getMonth() + (i - 1));
            await prisma.installment.create({
              data: {
                paymentId: payment.id,
                tenantId,
                installmentNumber: i,
                amount: installmentAmount,
                dueDate,
                status: i === 1 ? "PAID" : "PENDING",
                paidAt: i === 1 ? new Date() : null,
              },
            });
          }
        }
      }
    }

    // Envia nova confirmação ao reagendar
    if (body.sendConfirmation) {
      try {
        const tenant = await prisma.tenant.findUnique({
          where: { id: tenantId },
          select: { name: true, clinicName: true, whatsappStatus: true },
        });
        if (tenant?.whatsappStatus === "CONNECTED") {
          const template = await prisma.messageTemplate.findUnique({
            where: { tenantId_type: { tenantId, type: "CONFIRMATION" } },
          });
          const patient = await prisma.patient.findUnique({
            where: { id: existing.patientId },
            select: { name: true, phone: true, whatsappChatId: true },
          });
          if (template && patient) {
            const scheduledDate = new Date(appointment.scheduledAt);
            const message = replaceTemplateVars(template.content, {
              nome_paciente: patient.name,
              nome_nutricionista: tenant.name,
              nome_clinica: tenant.clinicName || "",
              data_consulta: formatDateBR(scheduledDate),
              hora_consulta: formatTimeBR(scheduledDate),
              tipo_consulta: appointment.consultationType || "",
              modalidade_consulta: appointment.appointmentModality || "",
            });
            const phoneDigits = patient.phone.replace(/\D/g, "");
            const normalizedPhone = phoneDigits.length <= 11 ? `55${phoneDigits}` : phoneDigits;
            let resolvedChatId: string | undefined = patient.whatsappChatId ?? undefined;
            if (!resolvedChatId) {
              const lastMsg = await prisma.inboxMessage.findFirst({
                where: { tenantId, phone: normalizedPhone, fromMe: false, chatId: { not: null } },
                orderBy: { timestamp: "desc" },
                select: { chatId: true },
              });
              resolvedChatId = lastMsg?.chatId ?? undefined;
            }
            await evoSendText(tenantId, patient.phone, message, resolvedChatId);
            await prisma.whatsAppLog.create({
              data: {
                tenantId,
                patientId: existing.patientId,
                messageType: "CONFIRMATION",
                phoneNumber: patient.phone,
                messageText: message,
                status: "SENT",
              },
            });
          }
        }
      } catch (err) {
        console.error("[reschedule-confirmation]", err);
      }
    }

    // Sincroniza com Google Calendar (não-bloqueante)
    try {
      if (existing.googleEventId) {
        if (body.status === "CANCELLED" || body.status === "NO_SHOW") {
          // Remove o evento ao cancelar/falta
          await deleteCalendarEvent(tenantId, existing.googleEventId);
          await prisma.appointment.update({ where: { id }, data: { googleEventId: null } });
        } else {
          // Atualiza data/hora se mudou
          await updateCalendarEvent(
            tenantId,
            existing.googleEventId,
            {
              scheduledAt: appointment.scheduledAt,
              duration: appointment.duration,
              consultationType: appointment.consultationType,
              notes: appointment.notes,
            },
            appointment.patient.name
          );
        }
      }
    } catch { /* não-bloqueante */ }

    return NextResponse.json(appointment);
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar agendamento" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = await getTenantId();
    const { id } = await params;

    const existing = await prisma.appointment.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
    }

    // Remove evento do Google Calendar antes de deletar
    if (existing.googleEventId) {
      try { await deleteCalendarEvent(tenantId, existing.googleEventId); } catch { /* não-bloqueante */ }
    }

    await prisma.appointment.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Erro ao excluir agendamento" }, { status: 500 });
  }
}
