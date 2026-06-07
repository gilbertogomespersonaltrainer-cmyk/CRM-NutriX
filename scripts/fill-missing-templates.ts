/**
 * fill-missing-templates.ts
 *
 * Cria os templates que estão faltando para tenants já cadastrados.
 * Não sobrescreve templates que já foram personalizados pelo nutri.
 *
 * Executar: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/fill-missing-templates.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ALL_TEMPLATES = [
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

async function main() {
  const tenants = await prisma.tenant.findMany({ select: { id: true, name: true } });
  console.log(`\nProcessando ${tenants.length} tenant(s)...\n`);

  let totalCreated = 0;
  let totalSkipped = 0;

  for (const tenant of tenants) {
    const existing = await prisma.messageTemplate.findMany({
      where: { tenantId: tenant.id },
      select: { type: true },
    });
    const existingTypes = new Set(existing.map(t => t.type));

    const missing = ALL_TEMPLATES.filter(t => !existingTypes.has(t.type));

    if (missing.length === 0) {
      console.log(`✅ ${tenant.name} — todos os templates já existem`);
      totalSkipped += ALL_TEMPLATES.length;
      continue;
    }

    await prisma.messageTemplate.createMany({
      data: missing.map(t => ({ ...t, tenantId: tenant.id })),
    });

    console.log(`📝 ${tenant.name} — criados ${missing.length} template(s) faltando:`);
    missing.forEach(t => console.log(`   + ${t.type}`));
    totalCreated += missing.length;
    totalSkipped += existing.length;
  }

  console.log(`\n✅ Concluído — ${totalCreated} templates criados, ${totalSkipped} já existiam\n`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
