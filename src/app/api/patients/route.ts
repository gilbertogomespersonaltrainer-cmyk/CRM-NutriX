import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/session";

export async function GET(req: Request) {
  try {
    const tenantId = await getTenantId();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status");

    const where: Record<string, unknown> = { tenantId };

    if (status === "active") where.isActive = true;
    if (status === "inactive") where.isActive = false;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { cpf: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const patients = await prisma.patient.findMany({
      where,
      orderBy: { name: "asc" },
    });

    return NextResponse.json(patients);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar pacientes" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const tenantId = await getTenantId();
    const body = await req.json();

    const patient = await prisma.patient.create({
      data: {
        tenantId,
        name: body.name,
        cpf: body.cpf || null,
        birthDate: body.birthDate ? new Date(body.birthDate) : null,
        phone: body.phone,
        email: body.email || null,
        address: body.address || null,
        howFoundUs: body.howFoundUs || null,
        notes: body.notes || null,
      },
    });

    return NextResponse.json(patient, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar paciente" }, { status: 500 });
  }
}
