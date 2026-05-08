import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/session";

export async function GET(req: Request) {
  try {
    const tenantId = await getTenantId();
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    const where: Record<string, unknown> = { tenantId };

    if (month && year) {
      const start = new Date(parseInt(year), parseInt(month) - 1, 1);
      const end = new Date(parseInt(year), parseInt(month), 1);
      where.date = { gte: start, lt: end };
    }

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { date: "desc" },
    });

    return NextResponse.json(transactions);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar transações" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const tenantId = await getTenantId();
    const body = await req.json();

    const transaction = await prisma.transaction.create({
      data: {
        tenantId,
        type: body.type,
        amount: body.amount,
        description: body.description,
        date: new Date(body.date),
      },
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar transação" }, { status: 500 });
  }
}
