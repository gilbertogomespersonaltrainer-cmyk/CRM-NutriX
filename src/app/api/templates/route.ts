import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/session";
import { MessageTemplateType } from "@prisma/client";

const TEMPLATE_DEFAULTS: Record<string, string> = {
  CONFIRMATION: "Olá {nome_paciente}! Sua {tipo_consulta} ({modalidade_consulta}) com {nome_nutricionista} está confirmada para {data_consulta} às {hora_consulta}. Qualquer dúvida, estou à disposição! 😊",
  REMINDER_8D: "Olá {nome_paciente}! Passando para lembrar que sua {tipo_consulta} ({modalidade_consulta}) com {nome_nutricionista} está agendada para {data_consulta} às {hora_consulta}. Confirme sua presença respondendo esta mensagem! 😊",
  REMINDER_2H: "Olá {nome_paciente}! Sua {tipo_consulta} ({modalidade_consulta}) com {nome_nutricionista} é daqui a pouco, às {hora_consulta}. Até logo! 🕐",
  REMINDER: "Olá {nome_paciente}! Lembrando que você tem {tipo_consulta} ({modalidade_consulta}) amanhã, {data_consulta} às {hora_consulta} com {nome_nutricionista}. Até lá! 👋",
  FOLLOWUP: "Olá {nome_paciente}! Tudo bem com você? 😊 Estava pensando em você e quis dar um oi. Como você está se sentindo em relação à sua alimentação ultimamente? Estou aqui se precisar de mim! 🌱",
  POST_CONSULTATION: "Olá {nome_paciente}! Como você está se sentindo após nossa última consulta? Lembre-se de seguir as orientações nutricionais combinadas. Qualquer dúvida, pode me chamar! 🌿",
  BIRTHDAY: "Olá {nome_paciente}! 🎉 Hoje é um dia especial — feliz aniversário! Desejo que este novo ciclo seja repleto de saúde, alegria e conquistas. Um abraço carinhoso de {nome_nutricionista}! 🎂",
  REACTIVATION_30: "Olá {nome_paciente}! Faz um tempo que não nos falamos. Que tal retomar sua jornada de saúde? Estou aqui para te ajudar! 🌱",
  REACTIVATION_60: "Olá {nome_paciente}! Saudades! 😊 Que tal marcarmos uma consulta para colocarmos o papo em dia e ajustarmos seu plano alimentar? Entre em contato comigo!",
  REACTIVATION_90: "Olá {nome_paciente}! Há 3 meses não nos vemos. Sua saúde é importante para mim. Que tal uma consulta de retorno? Pode contar comigo! 💚",
  WELCOME: "Bem-vindo(a) ao consultório de {nome_nutricionista}, {nome_paciente}! Estamos muito felizes em ter você conosco. Em breve entraremos em contato para agendar sua consulta. 😊",
  PLAN_RENEWAL: "Olá {nome_paciente}! Seu plano alimentar está chegando ao fim. Que tal renovarmos e continuarmos juntos nessa jornada? Entre em contato para agendarmos! 🌿",
};

export async function GET() {
  try {
    const tenantId = await getTenantId();
    const existing = await prisma.messageTemplate.findMany({ where: { tenantId } });
    const existingTypes = new Set(existing.map((t) => t.type));

    // Auto-cria templates padrão que ainda não existem no banco
    const missing = Object.entries(TEMPLATE_DEFAULTS).filter(([type]) => !existingTypes.has(type as MessageTemplateType));
    if (missing.length > 0) {
      await prisma.messageTemplate.createMany({
        data: missing.map(([type, content]) => ({ tenantId, type: type as MessageTemplateType, content })),
        skipDuplicates: true,
      });
      const all = await prisma.messageTemplate.findMany({ where: { tenantId } });
      return NextResponse.json(all);
    }

    return NextResponse.json(existing);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar templates" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const tenantId = await getTenantId();
    const body = await req.json();

    const template = await prisma.messageTemplate.upsert({
      where: {
        tenantId_type: { tenantId, type: body.type },
      },
      update: { content: body.content },
      create: {
        tenantId,
        type: body.type,
        content: body.content,
      },
    });

    return NextResponse.json(template);
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar template" }, { status: 500 });
  }
}
