import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password, crn, phone, clinicName } = body;

    if (!name || !email || !password || !crn || !phone) {
      return NextResponse.json(
        { error: "Campos obrigatórios não preenchidos" },
        { status: 400 }
      );
    }

    const existing = await prisma.tenant.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Email já cadastrado" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const tenant = await prisma.tenant.create({
      data: {
        name,
        email,
        password: hashedPassword,
        crn,
        phone,
        clinicName,
      },
    });

    // Create default service types
    const defaultTypes = [
      { name: "Consulta Avulsa", defaultPrice: 250, sortOrder: 0 },
      { name: "Plano Trimestral (3 meses)", defaultPrice: 600, sortOrder: 1 },
      { name: "Plano Semestral (6 meses)", defaultPrice: 1080, sortOrder: 2 },
      { name: "Plano Anual (12 meses)", defaultPrice: 1920, sortOrder: 3 },
      { name: "Grupo de Emagrecimento", defaultPrice: 150, sortOrder: 4 },
    ];

    await prisma.serviceType.createMany({
      data: defaultTypes.map((t) => ({ ...t, tenantId: tenant.id })),
    });

    // Create default message templates
    const defaultTemplates = [
      {
        type: "CONFIRMATION" as const,
        content:
          "Olá {nome_paciente}! Sua consulta com {nome_nutricionista} está confirmada para {data_consulta} às {hora_consulta}.",
      },
      {
        type: "REMINDER_8D" as const,
        content:
          "Olá {nome_paciente}! Passando para lembrar que sua consulta com {nome_nutricionista} está agendada para {data_consulta} às {hora_consulta}. Confirme sua presença respondendo esta mensagem! 😊",
      },
      {
        type: "REMINDER" as const,
        content:
          "Olá {nome_paciente}! Lembrando que você tem consulta amanhã, {data_consulta} às {hora_consulta} com {nome_nutricionista}. Até lá! 👋",
      },
      {
        type: "FOLLOWUP" as const,
        content:
          "Olá {nome_paciente}! Faz um tempo que não nos vemos. Que tal agendar uma consulta com {nome_nutricionista}?",
      },
    ];

    await prisma.messageTemplate.createMany({
      data: defaultTemplates.map((t) => ({ ...t, tenantId: tenant.id })),
    });

    // Create 7-day trial subscription
    const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.subscription.create({
      data: {
        tenantId: tenant.id,
        planId: await prisma.plan
          .findFirst({ where: { isActive: true }, orderBy: { sortOrder: "asc" } })
          .then((p) => p?.id ?? ""),
        status: "TRIAL",
        trialEndsAt,
      },
    });

    return NextResponse.json(
      { id: tenant.id, name: tenant.name, email: tenant.email },
      { status: 201 }
    );
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Erro ao criar conta" },
      { status: 500 }
    );
  }
}
