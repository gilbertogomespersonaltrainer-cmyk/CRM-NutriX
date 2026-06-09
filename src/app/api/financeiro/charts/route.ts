import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/session";

export async function GET() {
  try {
    const tenantId = await getTenantId();

    const now = new Date();

    // Últimos 6 meses
    const months: { year: number; month: number; label: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        year: d.getFullYear(),
        month: d.getMonth(), // 0-indexed
        label: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
      });
    }

    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const transactions = await prisma.transaction.findMany({
      where: { tenantId, date: { gte: sixMonthsAgo } },
      select: { type: true, amount: true, date: true },
    });

    const monthly = months.map((m) => {
      const txs = transactions.filter((t) => {
        const d = new Date(t.date);
        return d.getFullYear() === m.year && d.getMonth() === m.month;
      });
      return {
        month: m.label,
        receita: txs
          .filter((t) => t.type === "INCOME")
          .reduce((s, t) => s + t.amount, 0),
        despesas: txs
          .filter((t) => t.type === "EXPENSE")
          .reduce((s, t) => s + t.amount, 0),
      };
    });

    const payments = await prisma.payment.findMany({
      where: { tenantId },
      select: {
        finalAmount: true,
        paymentMethod: true,
        serviceType: { select: { name: true } },
      },
    });

    const methodLabels: Record<string, string> = {
      PIX: "Pix",
      CREDIT_CARD: "Cartão Crédito",
      DEBIT_CARD: "Cartão Débito",
      CASH: "Dinheiro",
      TRANSFER: "Transferência",
    };

    const byServiceType: Record<string, number> = {};
    const byMethod: Record<string, number> = {};

    payments.forEach((p) => {
      byServiceType[p.serviceType.name] =
        (byServiceType[p.serviceType.name] || 0) + p.finalAmount;
      const label = methodLabels[p.paymentMethod] || p.paymentMethod;
      byMethod[label] = (byMethod[label] || 0) + p.finalAmount;
    });

    return NextResponse.json({ monthly, byServiceType, byMethod });
  } catch {
    return NextResponse.json({ error: "Erro ao buscar dados" }, { status: 500 });
  }
}
