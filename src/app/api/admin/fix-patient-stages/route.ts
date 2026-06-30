import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/session";

// POST /api/admin/fix-patient-stages
// Corrige pacientes criados pelo formulário que ficaram com stage=LEAD indevidamente.
// Critério: stage=LEAD + whatsappChatId=null (não veio pelo WhatsApp — foi cadastrado manualmente).
export async function POST() {
  try {
    const tenantId = await getTenantId();

    const result = await prisma.patient.updateMany({
      where: {
        tenantId,
        stage: "LEAD",
        whatsappChatId: null,
      },
      data: {
        stage: "ACTIVE",
        isActive: true,
      },
    });

    return NextResponse.json({
      fixed: result.count,
      message: `${result.count} paciente(s) corrigido(s) — estágio atualizado de Lead para Ativo.`,
    });
  } catch (err) {
    console.error("[fix-patient-stages]", err);
    return NextResponse.json({ error: "Erro ao corrigir estágios" }, { status: 500 });
  }
}
