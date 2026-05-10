import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("123456", 12);

  const tenant = await prisma.tenant.create({
    data: {
      name: "Dra. Ana Silva",
      email: "ana@nutrix.com",
      password: hashedPassword,
      crn: "CRN-3 12345",
      phone: "11999990000",
      clinicName: "NutriVida Consultório",
      inactiveDaysThreshold: 30,
      defaultDuration: 50,
    },
  });

  // Service Types
  const serviceTypes = await Promise.all([
    prisma.serviceType.create({
      data: { tenantId: tenant.id, name: "Consulta Avulsa", defaultPrice: 250, sortOrder: 0 },
    }),
    prisma.serviceType.create({
      data: { tenantId: tenant.id, name: "Plano Trimestral (3 meses)", defaultPrice: 600, sortOrder: 1 },
    }),
    prisma.serviceType.create({
      data: { tenantId: tenant.id, name: "Plano Semestral (6 meses)", defaultPrice: 1080, sortOrder: 2 },
    }),
    prisma.serviceType.create({
      data: { tenantId: tenant.id, name: "Plano Anual (12 meses)", defaultPrice: 1920, sortOrder: 3 },
    }),
    prisma.serviceType.create({
      data: { tenantId: tenant.id, name: "Grupo de Emagrecimento", defaultPrice: 150, sortOrder: 4 },
    }),
  ]);

  // Message Templates
  await prisma.messageTemplate.createMany({
    data: [
      {
        tenantId: tenant.id,
        type: "CONFIRMATION",
        content: "Oi {nome_paciente}, tudo bem? Aqui é a {nome_nutricionista} 😊 Passando pra confirmar nosso encontro dia {data_consulta} às {hora_consulta}. Pode confirmar pra mim? Qualquer coisa me avisa que a gente ajusta!",
      },
      {
        tenantId: tenant.id,
        type: "REMINDER",
        content: "Oi {nome_paciente}! Só passando pra te lembrar que amanhã tem a nossa consulta, às {hora_consulta} 😊 Tô preparando tudo com carinho pra gente conversar. Te espero!",
      },
      {
        tenantId: tenant.id,
        type: "REMINDER_2H",
        content: "Oi {nome_paciente}! Daqui a pouquinho a gente se encontra, hein? Às {hora_consulta} te espero 😊 Se precisar de algo antes, é só me chamar!",
      },
      {
        tenantId: tenant.id,
        type: "FOLLOWUP",
        content: "Oi {nome_paciente}, tudo bem com você? Faz um tempinho que a gente não conversa e fiquei curiosa pra saber como você tá, como tá se sentindo, se tá conseguindo manter a rotina... Me conta! 💚",
      },
      {
        tenantId: tenant.id,
        type: "POST_CONSULTATION",
        content: "Oi {nome_paciente}! Como você tá? Queria saber como foi esses primeiros dias depois da nossa conversa. Tá conseguindo encaixar as mudanças na rotina? Pode me contar sem medo, tô aqui pra te ajudar no que precisar 😊",
      },
      {
        tenantId: tenant.id,
        type: "BIRTHDAY",
        content: "Oi {nome_paciente}! Hoje é seu dia e eu não podia deixar de te desejar tudo de mais lindo! 🎂 Que esse novo ano seja cheio de saúde, conquistas e muita comida gostosa (sim, pode comer bolo! 😄). Um abraço enorme! — {nome_nutricionista} 💚",
      },
      {
        tenantId: tenant.id,
        type: "REACTIVATION_30",
        content: "Oi {nome_paciente}, tudo bem? Aqui é a {nome_nutricionista}. Faz um tempinho que a gente não se fala e eu lembrei de você! Como você tá? Tá conseguindo se cuidar? Me conta como andam as coisas 😊",
      },
      {
        tenantId: tenant.id,
        type: "REACTIVATION_60",
        content: "Oi {nome_paciente}! Tudo bem com você? Eu tava aqui organizando minha agenda e lembrei de você. Espero que esteja bem! Como tá a rotina? Tô com saudade das nossas conversas 😊 Me dá um oi quando puder!",
      },
      {
        tenantId: tenant.id,
        type: "REACTIVATION_90",
        content: "Oi {nome_paciente}, quanto tempo! Tudo bem com você? Tava pensando em você esses dias e queria muito saber como você tá. A gente construiu tanta coisa junta e eu fico torcendo pra você estar bem! Se quiser conversar, tô por aqui 💚",
      },
      {
        tenantId: tenant.id,
        type: "WELCOME",
        content: "Oi {nome_paciente}! Que bom ter você aqui 😊 Sou a {nome_nutricionista} e vou te acompanhar nessa jornada. Pode contar comigo pra qualquer dúvida, tá? Seja bem-vindo(a)! 💚",
      },
      {
        tenantId: tenant.id,
        type: "PLAN_RENEWAL",
        content: "Oi {nome_paciente}, tudo bem? Passando pra te avisar que seu plano tá chegando ao fim. Queria conversar com você sobre como foi até aqui e o que a gente pode fazer daqui pra frente. Posso te ligar ou prefere que a gente converse por aqui? 😊",
      },
    ],
  });

  // Patients with stages and tags
  const patients = await Promise.all([
    prisma.patient.create({
      data: {
        tenantId: tenant.id,
        name: "Maria Santos",
        cpf: "123.456.789-00",
        phone: "11988881111",
        email: "maria@email.com",
        birthDate: new Date("1990-05-15"),
        howFoundUs: "Instagram",
        isActive: true,
        stage: "ACTIVE",
        tags: ["emagrecimento", "plano-trimestral"],
        lastAppointmentAt: new Date(),
      },
    }),
    prisma.patient.create({
      data: {
        tenantId: tenant.id,
        name: "João Oliveira",
        cpf: "987.654.321-00",
        phone: "11988882222",
        email: "joao@email.com",
        birthDate: new Date("1985-08-20"),
        howFoundUs: "Indicação",
        isActive: true,
        stage: "ACTIVE",
        tags: ["diabetes", "reeducação-alimentar"],
        lastAppointmentAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.patient.create({
      data: {
        tenantId: tenant.id,
        name: "Fernanda Lima",
        phone: "11988883333",
        email: "fernanda@email.com",
        birthDate: new Date("1995-03-10"),
        howFoundUs: "Google",
        isActive: true,
        stage: "FIRST_CONSULTATION",
        tags: ["gestante"],
        lastAppointmentAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.patient.create({
      data: {
        tenantId: tenant.id,
        name: "Carlos Pereira",
        phone: "11988884444",
        howFoundUs: "Indicação",
        isActive: false,
        stage: "INACTIVE",
        tags: ["intolerância-lactose"],
        lastAppointmentAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        notes: "Paciente com restrição a lactose",
      },
    }),
    prisma.patient.create({
      data: {
        tenantId: tenant.id,
        name: "Lucia Mendes",
        phone: "11988885555",
        email: "lucia@email.com",
        birthDate: new Date("1988-12-25"),
        isActive: false,
        stage: "INACTIVE",
        tags: ["emagrecimento"],
        lastAppointmentAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.patient.create({
      data: {
        tenantId: tenant.id,
        name: "Roberto Almeida",
        phone: "11988886666",
        email: "roberto@email.com",
        howFoundUs: "WhatsApp",
        isActive: false,
        stage: "LEAD",
        tags: ["esportista"],
      },
    }),
    prisma.patient.create({
      data: {
        tenantId: tenant.id,
        name: "Patrícia Costa",
        phone: "11988887777",
        email: "patricia@email.com",
        birthDate: new Date("1992-07-03"),
        howFoundUs: "Indicação",
        isActive: true,
        stage: "REACTIVATED",
        tags: ["emagrecimento", "pós-parto"],
        lastAppointmentAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        lastReactivationAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      },
    }),
  ]);

  // Set referral: Patrícia was referred by Maria
  await prisma.patient.update({
    where: { id: patients[6].id },
    data: { referredById: patients[0].id },
  });

  // Appointments
  const today = new Date();
  today.setHours(9, 0, 0, 0);

  await prisma.appointment.createMany({
    data: [
      {
        tenantId: tenant.id,
        patientId: patients[0].id,
        scheduledAt: new Date(today.getTime()),
        duration: 50,
        status: "SCHEDULED",
      },
      {
        tenantId: tenant.id,
        patientId: patients[1].id,
        scheduledAt: new Date(today.getTime() + 60 * 60 * 1000),
        duration: 50,
        status: "SCHEDULED",
      },
      {
        tenantId: tenant.id,
        patientId: patients[2].id,
        scheduledAt: new Date(today.getTime() + 2 * 60 * 60 * 1000),
        duration: 50,
        status: "SCHEDULED",
      },
      {
        tenantId: tenant.id,
        patientId: patients[0].id,
        scheduledAt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        duration: 50,
        status: "SCHEDULED",
        notes: "Retorno",
      },
      {
        tenantId: tenant.id,
        patientId: patients[1].id,
        scheduledAt: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
        duration: 50,
        status: "COMPLETED",
      },
      {
        tenantId: tenant.id,
        patientId: patients[3].id,
        scheduledAt: new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000),
        duration: 50,
        status: "COMPLETED",
      },
      {
        tenantId: tenant.id,
        patientId: patients[6].id,
        scheduledAt: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000),
        duration: 50,
        status: "COMPLETED",
        postConsultSent: false,
      },
    ],
  });

  // Payments
  await prisma.payment.create({
    data: {
      tenantId: tenant.id,
      patientId: patients[0].id,
      serviceTypeId: serviceTypes[0].id,
      totalAmount: 250,
      discountAmount: 0,
      finalAmount: 250,
      modality: "AVISTA",
      paymentMethod: "PIX",
      status: "PAID",
    },
  });

  const parceladoPayment = await prisma.payment.create({
    data: {
      tenantId: tenant.id,
      patientId: patients[1].id,
      serviceTypeId: serviceTypes[1].id,
      totalAmount: 600,
      discountAmount: 0,
      finalAmount: 600,
      modality: "PARCELADO",
      installmentCount: 3,
      paymentMethod: "CREDIT_CARD",
      status: "PARTIALLY_PAID",
    },
  });

  await prisma.installment.createMany({
    data: [
      {
        paymentId: parceladoPayment.id,
        tenantId: tenant.id,
        installmentNumber: 1,
        amount: 200,
        dueDate: new Date(),
        status: "PAID",
        paidAt: new Date(),
      },
      {
        paymentId: parceladoPayment.id,
        tenantId: tenant.id,
        installmentNumber: 2,
        amount: 200,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: "PENDING",
      },
      {
        paymentId: parceladoPayment.id,
        tenantId: tenant.id,
        installmentNumber: 3,
        amount: 200,
        dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        status: "PENDING",
      },
    ],
  });

  // Transactions
  await prisma.transaction.createMany({
    data: [
      {
        tenantId: tenant.id,
        type: "INCOME",
        amount: 250,
        description: "Consulta Avulsa - Maria Santos",
        date: new Date(),
      },
      {
        tenantId: tenant.id,
        type: "INCOME",
        amount: 200,
        description: "Plano Trimestral - João Oliveira (1/3)",
        date: new Date(),
      },
      {
        tenantId: tenant.id,
        type: "EXPENSE",
        amount: 1500,
        description: "Aluguel do consultório",
        date: new Date(),
      },
      {
        tenantId: tenant.id,
        type: "EXPENSE",
        amount: 200,
        description: "Material de escritório",
        date: new Date(),
      },
    ],
  });

  // Follow-up logs
  await prisma.followUpLog.create({
    data: {
      tenantId: tenant.id,
      patientId: patients[3].id,
      notes: "Ligou mas não atendeu. Enviar mensagem WhatsApp.",
    },
  });

  console.log("Seed completo!");
  console.log("Login: ana@nutrix.com / 123456");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
