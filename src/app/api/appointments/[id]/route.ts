import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/session";

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
      await prisma.patient.update({
        where: { id: existing.patientId },
        data: { lastAppointmentAt: new Date(), isActive: true },
      });
    }

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

    await prisma.appointment.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Erro ao excluir agendamento" }, { status: 500 });
  }
}
