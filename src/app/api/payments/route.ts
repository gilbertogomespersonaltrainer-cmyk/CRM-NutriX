import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/session";

export async function GET(req: Request) {
  try {
    const tenantId = await getTenantId();
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = { tenantId };
    if (patientId) where.patientId = patientId;
    if (status) where.status = status;

    const payments = await prisma.payment.findMany({
      where,
      include: {
        patient: { select: { name: true } },
        serviceType: { select: { name: true } },
        installments: { orderBy: { installmentNumber: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(payments);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar pagamentos" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const tenantId = await getTenantId();
    const body = await req.json();

    const finalAmount = body.totalAmount - (body.discountAmount || 0);

    const payment = await prisma.payment.create({
      data: {
        tenantId,
        patientId: body.patientId,
        appointmentId: body.appointmentId || null,
        serviceTypeId: body.serviceTypeId,
        description: body.description || null,
        totalAmount: body.totalAmount,
        discountAmount: body.discountAmount || 0,
        finalAmount,
        modality: body.modality,
        installmentCount: body.installmentCount || 1,
        paymentMethod: body.paymentMethod,
        status: body.modality === "AVISTA" ? "PAID" : "PENDING",
        notes: body.notes || null,
      },
    });

    if (body.modality === "PARCELADO" && body.installmentCount > 1) {
      const installmentAmount = finalAmount / body.installmentCount;
      const installments = [];

      for (let i = 0; i < body.installmentCount; i++) {
        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + i);
        installments.push({
          paymentId: payment.id,
          tenantId,
          installmentNumber: i + 1,
          amount: Math.round(installmentAmount * 100) / 100,
          dueDate,
        });
      }

      await prisma.installment.createMany({ data: installments });
    }

    // Also create income transaction
    await prisma.transaction.create({
      data: {
        tenantId,
        type: "INCOME",
        amount: finalAmount,
        description: `Pagamento - ${body.description || "Serviço"}`,
        date: new Date(),
      },
    });

    return NextResponse.json(payment, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar pagamento" }, { status: 500 });
  }
}
