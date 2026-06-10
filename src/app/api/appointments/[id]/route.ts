import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/session";
import { updateCalendarEvent, deleteCalendarEvent } from "@/lib/google-calendar";

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
