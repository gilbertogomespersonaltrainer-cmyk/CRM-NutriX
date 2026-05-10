import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/session";

const VALID_STAGES = ["LEAD", "FIRST_CONSULTATION", "ACTIVE", "INACTIVE", "REACTIVATED"] as const;

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = await getTenantId();
    const { id } = await params;
    const { stage } = await req.json();

    if (!VALID_STAGES.includes(stage)) {
      return NextResponse.json({ error: "Stage inválido" }, { status: 400 });
    }

    const existing = await prisma.patient.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return NextResponse.json({ error: "Paciente não encontrado" }, { status: 404 });
    }

    const isActive = stage !== "INACTIVE" && stage !== "LEAD";

    const patient = await prisma.patient.update({
      where: { id },
      data: {
        stage,
        isActive,
        ...(stage === "REACTIVATED" ? { lastReactivationAt: new Date() } : {}),
      },
    });

    return NextResponse.json(patient);
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar stage" }, { status: 500 });
  }
}
