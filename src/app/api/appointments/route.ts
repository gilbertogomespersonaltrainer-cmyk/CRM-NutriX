import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/session";

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
      },
      include: { patient: { select: { name: true, phone: true } } },
    });

    return NextResponse.json(appointment, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar agendamento" }, { status: 500 });
  }
}
