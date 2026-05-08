import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/session";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = await getTenantId();
    const { id } = await params;

    const patient = await prisma.patient.findFirst({
      where: { id, tenantId },
      include: {
        appointments: {
          orderBy: { scheduledAt: "desc" },
          take: 20,
        },
        payments: {
          orderBy: { createdAt: "desc" },
          include: { serviceType: true, installments: true },
          take: 20,
        },
        whatsAppLogs: {
          orderBy: { sentAt: "desc" },
          take: 20,
        },
        followUpLogs: {
          orderBy: { contactedAt: "desc" },
          take: 10,
        },
      },
    });

    if (!patient) {
      return NextResponse.json({ error: "Paciente não encontrado" }, { status: 404 });
    }

    return NextResponse.json(patient);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar paciente" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = await getTenantId();
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.patient.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return NextResponse.json({ error: "Paciente não encontrado" }, { status: 404 });
    }

    const patient = await prisma.patient.update({
      where: { id },
      data: {
        name: body.name,
        cpf: body.cpf,
        birthDate: body.birthDate ? new Date(body.birthDate) : null,
        phone: body.phone,
        email: body.email,
        address: body.address,
        howFoundUs: body.howFoundUs,
        notes: body.notes,
        isActive: body.isActive,
      },
    });

    return NextResponse.json(patient);
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar paciente" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = await getTenantId();
    const { id } = await params;

    const existing = await prisma.patient.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return NextResponse.json({ error: "Paciente não encontrado" }, { status: 404 });
    }

    await prisma.patient.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Erro ao excluir paciente" }, { status: 500 });
  }
}
