import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/session";

export async function GET() {
  try {
    const tenantId = await getTenantId();

    const patients = await prisma.patient.findMany({
      where: { tenantId, isActive: false },
      include: {
        followUpLogs: {
          orderBy: { contactedAt: "desc" },
          take: 1,
        },
      },
      orderBy: { lastAppointmentAt: "asc" },
    });

    return NextResponse.json(patients);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar inativos" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const tenantId = await getTenantId();
    const body = await req.json();

    const log = await prisma.followUpLog.create({
      data: {
        tenantId,
        patientId: body.patientId,
        notes: body.notes || null,
      },
    });

    return NextResponse.json(log, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao registrar contato" }, { status: 500 });
  }
}
