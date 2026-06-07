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

    // Create default message templates — todos os 12 tipos para garantir que
    // os disparos automáticos funcionem desde o primeiro dia de uso
    const defaultTemplates = [
      {
        type: "CONFIRMATION" as const,
        content: "Oi {nome_paciente}, tudo bem? Aqui é a {nome_nutricionista} 😊 Passando pra confirmar nosso encontro dia {data_consulta} às {hora_consulta}. Pode confirmar pra mim? Qualquer coisa me avisa que a gente ajusta!",
      },
      {
        type: "REMINDER_8D" as const,
        content: "Olá {nome_paciente}! Passando para lembrar que sua {tipo_consulta} com {nome_nutricionista} está agendada para {data_consulta} às {hora_consulta}. Confirme sua presença respondendo esta mensagem! 😊",
      },
      {
        type: "REMINDER" as const,
        content: "Oi {nome_paciente}! Só passando pra te lembrar que amanhã tem a nossa consulta, às {hora_consulta} 😊 Tô preparando tudo com carinho pra gente conversar. Te espero!",
      },
      {
        type: "REMINDER_2H" as const,
        content: "Oi {nome_paciente}! Daqui a pouquinho a gente se encontra, hein? Às {hora_consulta} te espero 😊 Se precisar de algo antes, é só me chamar!",
      },
      {
        type: "FOLLOWUP" as const,
        content: "Oi {nome_paciente}, tudo bem com você? Faz um tempinho que a gente não conversa e fiquei curiosa pra saber como você tá, como tá se sentindo, se tá conseguindo manter a rotina... Me conta! 💚",
      },
      {
        type: "POST_CONSULTATION" as const,
        content: "Oi {nome_paciente}! Como você tá? Queria saber como foi esses primeiros dias depois da nossa conversa. Tá conseguindo encaixar as mudanças na rotina? Pode me contar sem medo, tô aqui pra te ajudar no que precisar 😊",
      },
      {
        type: "BIRTHDAY" as const,
        content: "Oi {nome_paciente}! Hoje é seu dia e eu não podia deixar de te desejar tudo de mais lindo! 🎂 Que esse novo ano seja cheio de saúde, conquistas e muita comida gostosa (sim, pode comer bolo! 😄). Um abraço enorme! — {nome_nutricionista} 💚",
      },
      {
        type: "REACTIVATION_30" as const,
        content: "Oi {nome_paciente}, tudo bem? Aqui é a {nome_nutricionista}. Faz um tempinho que a gente não se fala e eu lembrei de você! Como você tá? Tá conseguindo se cuidar? Me conta como andam as coisas 😊",
      },
      {
        type: "REACTIVATION_60" as const,
        content: "Oi {nome_paciente}! Tudo bem com você? Eu tava aqui organizando minha agenda e lembrei de você. Espero que esteja bem! Como tá a rotina? Tô com saudade das nossas conversas 😊 Me dá um oi quando puder!",
      },
      {
        type: "REACTIVATION_90" as const,
        content: "Oi {nome_paciente}, quanto tempo! Tudo bem com você? Tava pensando em você esses dias e queria muito saber como você tá. A gente construiu tanta coisa junta e eu fico torcendo pra você estar bem! Se quiser conversar, tô por aqui 💚",
      },
      {
        type: "WELCOME" as const,
        content: "Oi {nome_paciente}! Que bom ter você aqui 😊 Sou a {nome_nutricionista} e vou te acompanhar nessa jornada. Pode contar comigo pra qualquer dúvida, tá? Seja bem-vindo(a)! 💚",
      },
      {
        type: "PLAN_RENEWAL" as const,
        content: "Oi {nome_paciente}, tudo bem? Passando pra te avisar que seu plano tá chegando ao fim. Queria conversar com você sobre como foi até aqui e o que a gente pode fazer daqui pra frente. Posso te ligar ou prefere que a gente converse por aqui? 😊",
      },
    ];

    await prisma.messageTemplate.createMany({
      data: defaultTemplates.map((t) => ({ ...t, tenantId: tenant.id })),
    });

    // Verifica se existe compra Hotmart pendente para este e-mail
    const pendingPurchase = await prisma.hotmartPurchase.findFirst({
      where: { email: email.toLowerCase(), activatedAt: null },
      orderBy: { createdAt: "desc" },
    });

    const defaultPlan = await prisma.plan.findFirst({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });

    if (pendingPurchase) {
      // Comprador existente → ativa assinatura imediatamente com o plano certo
      const purchasedPlan = await prisma.plan.findFirst({
        where: { name: { equals: pendingPurchase.planName, mode: "insensitive" }, isActive: true },
      });

      await prisma.subscription.create({
        data: {
          tenantId: tenant.id,
          planId: purchasedPlan?.id ?? defaultPlan?.id ?? "",
          status: "ACTIVE",
          startsAt: new Date(),
          expiresAt: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000),
        },
      });

      // Marca a compra como ativada
      await prisma.hotmartPurchase.update({
        where: { id: pendingPurchase.id },
        data: { activatedAt: new Date() },
      });
    } else {
      // Sem compra pendente → trial de 7 dias
      const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await prisma.subscription.create({
        data: {
          tenantId: tenant.id,
          planId: defaultPlan?.id ?? "",
          status: "TRIAL",
          trialEndsAt,
        },
      });
    }

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
