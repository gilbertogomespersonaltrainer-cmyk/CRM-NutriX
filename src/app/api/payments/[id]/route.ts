import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/session";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = await getTenantId();
    const { id } = await params;

    const payment = await prisma.payment.findFirst({ where: { id, tenantId } });
    if (!payment) {
      return NextResponse.json({ error: "Pagamento não encontrado" }, { status: 404 });
    }

    await prisma.installment.deleteMany({ where: { paymentId: id } });

    // Exclui Transaction de receita associada (mesma descrição e valor, criada junto ao pagamento)
    await prisma.transaction.deleteMany({
      where: {
        tenantId,
        type: "INCOME",
        amount: payment.finalAmount,
        description: `Pagamento - ${payment.description}`,
      },
    });

    await prisma.payment.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Erro ao excluir pagamento" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = await getTenantId();
    const { id } = await params;
    const body = await req.json();

    const payment = await prisma.payment.findFirst({ where: { id, tenantId } });
    if (!payment) {
      return NextResponse.json({ error: "Pagamento não encontrado" }, { status: 404 });
    }

    await prisma.payment.update({ where: { id }, data: { status: body.status } });

    if (body.status === "PAID") {
      await prisma.installment.updateMany({
        where: { paymentId: id, status: "PENDING" },
        data: { status: "PAID", paidAt: new Date() },
      });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar pagamento" }, { status: 500 });
  }
}
