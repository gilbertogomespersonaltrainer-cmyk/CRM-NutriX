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

    const existing = await prisma.installment.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Parcela não encontrada" }, { status: 404 });
    }

    const installment = await prisma.installment.update({
      where: { id },
      data: {
        status: body.status,
        paidAt: body.status === "PAID" ? new Date() : null,
      },
    });

    // Update parent payment status
    const allInstallments = await prisma.installment.findMany({
      where: { paymentId: existing.paymentId },
    });
    const allPaid = allInstallments.every((i) => i.id === id ? body.status === "PAID" : i.status === "PAID");
    const anyPaid = allInstallments.some((i) => i.id === id ? body.status === "PAID" : i.status === "PAID");

    await prisma.payment.update({
      where: { id: existing.paymentId },
      data: {
        status: allPaid ? "PAID" : anyPaid ? "PARTIALLY_PAID" : "PENDING",
      },
    });

    return NextResponse.json(installment);
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar parcela" }, { status: 500 });
  }
}
