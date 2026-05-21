import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const DEMO_EMAIL = "demo@nutrix.com";

export async function GET(req: Request) {
  const secret = new URL(req.url).searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tenant = await prisma.tenant.findUnique({ where: { email: DEMO_EMAIL } });
    if (!tenant) return NextResponse.json({ error: "Demo tenant not found" }, { status: 404 });

    const tid = tenant.id;

    // Limpa todos os dados do demo
    await prisma.whatsAppLog.deleteMany({ where: { tenantId: tid } });
    await prisma.followUpLog.deleteMany({ where: { tenantId: tid } });
    await prisma.messageTemplate.deleteMany({ where: { tenantId: tid } });
    await prisma.transaction.deleteMany({ where: { tenantId: tid } });
    await prisma.installment.deleteMany({ where: { tenantId: tid } });
    await prisma.payment.deleteMany({ where: { tenantId: tid } });
    await prisma.appointment.deleteMany({ where: { tenantId: tid } });
    await prisma.patient.deleteMany({ where: { tenantId: tid } });

    // Recria os dados
    await seedDemoData(tid);

    return NextResponse.json({ ok: true, message: "Demo resetado com sucesso!" });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro ao resetar demo" }, { status: 500 });
  }
}

async function seedDemoData(tenantId: string) {
  // Service types
  const [avulsa, trimestral, semestral, anual, grupo] = await Promise.all([
    prisma.serviceType.upsert({ where: { id: `demo-st-1` }, update: {}, create: { id: "demo-st-1", tenantId, name: "Consulta Avulsa", defaultPrice: 250, sortOrder: 0 } }),
    prisma.serviceType.upsert({ where: { id: `demo-st-2` }, update: {}, create: { id: "demo-st-2", tenantId, name: "Plano Trimestral", defaultPrice: 600, sortOrder: 1 } }),
    prisma.serviceType.upsert({ where: { id: `demo-st-3` }, update: {}, create: { id: "demo-st-3", tenantId, name: "Plano Semestral", defaultPrice: 1080, sortOrder: 2 } }),
    prisma.serviceType.upsert({ where: { id: `demo-st-4` }, update: {}, create: { id: "demo-st-4", tenantId, name: "Plano Anual", defaultPrice: 1920, sortOrder: 3 } }),
    prisma.serviceType.upsert({ where: { id: `demo-st-5` }, update: {}, create: { id: "demo-st-5", tenantId, name: "Grupo de Emagrecimento", defaultPrice: 150, sortOrder: 4 } }),
  ]);

  const today = new Date();
  today.setHours(9, 0, 0, 0);

  const d = (days: number) => new Date(today.getTime() + days * 86400000);
  const h = (hours: number) => new Date(today.getTime() + hours * 3600000);

  // Patients
  const patients = await Promise.all([
    prisma.patient.create({ data: { tenantId, name: "Ana Paula Mendes", phone: "11991110001", email: "anapaula@email.com", birthDate: new Date("1992-03-15"), howFoundUs: "Instagram", stage: "ACTIVE", tags: ["emagrecimento", "plano-trimestral"], isActive: true, lastAppointmentAt: d(-7) } }),
    prisma.patient.create({ data: { tenantId, name: "Carlos Roberto Silva", phone: "11991110002", email: "carlos@email.com", birthDate: new Date("1985-07-22"), howFoundUs: "Indicação", stage: "ACTIVE", tags: ["diabetes", "hipertensão"], isActive: true, lastAppointmentAt: d(-3) } }),
    prisma.patient.create({ data: { tenantId, name: "Fernanda Costa", phone: "11991110003", email: "fernanda@email.com", birthDate: new Date("1998-11-05"), howFoundUs: "Google", stage: "FIRST_CONSULTATION", tags: ["gestante"], isActive: true, lastAppointmentAt: d(-1) } }),
    prisma.patient.create({ data: { tenantId, name: "Roberto Lima", phone: "11991110004", howFoundUs: "Instagram", stage: "LEAD", tags: ["emagrecimento"], isActive: false } }),
    prisma.patient.create({ data: { tenantId, name: "Juliana Souza", phone: "11991110005", email: "juliana@email.com", birthDate: new Date("1990-06-18"), howFoundUs: "WhatsApp", stage: "INACTIVE", tags: ["pós-parto"], isActive: false, lastAppointmentAt: d(-45) } }),
    prisma.patient.create({ data: { tenantId, name: "Marcos Oliveira", phone: "11991110006", email: "marcos@email.com", birthDate: new Date("1983-09-30"), howFoundUs: "Indicação", stage: "ACTIVE", tags: ["ganho-muscular", "esportista"], isActive: true, lastAppointmentAt: d(-5) } }),
    prisma.patient.create({ data: { tenantId, name: "Patrícia Alves", phone: "11991110007", email: "patricia@email.com", birthDate: new Date("1995-01-12"), howFoundUs: "Instagram", stage: "REACTIVATED", tags: ["emagrecimento"], isActive: true, lastAppointmentAt: d(-2), lastReactivationAt: d(-10) } }),
    prisma.patient.create({ data: { tenantId, name: "Diego Ferreira", phone: "11991110008", howFoundUs: "Google", stage: "LEAD", tags: ["vegetariano"], isActive: false } }),
    prisma.patient.create({ data: { tenantId, name: "Camila Rodrigues", phone: "11991110009", email: "camila@email.com", birthDate: new Date("1993-04-25"), howFoundUs: "Indicação", stage: "ACTIVE", tags: ["intolerância-lactose", "plano-semestral"], isActive: true, lastAppointmentAt: d(-10) } }),
    prisma.patient.create({ data: { tenantId, name: "Lucas Martins", phone: "11991110010", email: "lucas@email.com", birthDate: new Date("2000-08-14"), howFoundUs: "TikTok", stage: "FIRST_CONSULTATION", tags: ["ganho-muscular"], isActive: true, lastAppointmentAt: d(0) } }),
    prisma.patient.create({ data: { tenantId, name: "Beatriz Nunes", phone: "11991110011", email: "beatriz@email.com", birthDate: new Date("1988-12-03"), howFoundUs: "Instagram", stage: "INACTIVE", tags: ["emagrecimento"], isActive: false, lastAppointmentAt: d(-60) } }),
    prisma.patient.create({ data: { tenantId, name: "Rafael Carvalho", phone: "11991110012", howFoundUs: "WhatsApp", stage: "LEAD", tags: [], isActive: false } }),
  ]);

  const [ana, carlos, fernanda, roberto, juliana, marcos, patricia, diego, camila, lucas, beatriz, rafael] = patients;

  // Appointments
  await prisma.appointment.createMany({
    data: [
      { tenantId, patientId: lucas.id,    scheduledAt: h(0),    duration: 50, status: "SCHEDULED" },
      { tenantId, patientId: ana.id,      scheduledAt: h(1),    duration: 50, status: "SCHEDULED" },
      { tenantId, patientId: fernanda.id, scheduledAt: h(2),    duration: 50, status: "SCHEDULED", notes: "1ª consulta" },
      { tenantId, patientId: carlos.id,   scheduledAt: d(1),    duration: 50, status: "SCHEDULED" },
      { tenantId, patientId: marcos.id,   scheduledAt: d(2),    duration: 50, status: "SCHEDULED" },
      { tenantId, patientId: camila.id,   scheduledAt: d(3),    duration: 50, status: "SCHEDULED" },
      { tenantId, patientId: patricia.id, scheduledAt: d(1),    duration: 50, status: "SCHEDULED" },
      { tenantId, patientId: ana.id,      scheduledAt: d(-7),   duration: 50, status: "COMPLETED" },
      { tenantId, patientId: carlos.id,   scheduledAt: d(-3),   duration: 50, status: "COMPLETED" },
      { tenantId, patientId: marcos.id,   scheduledAt: d(-5),   duration: 50, status: "COMPLETED" },
      { tenantId, patientId: juliana.id,  scheduledAt: d(-45),  duration: 50, status: "COMPLETED" },
      { tenantId, patientId: beatriz.id,  scheduledAt: d(-60),  duration: 50, status: "COMPLETED" },
      { tenantId, patientId: camila.id,   scheduledAt: d(-10),  duration: 50, status: "COMPLETED" },
      { tenantId, patientId: ana.id,      scheduledAt: d(-30),  duration: 50, status: "NO_SHOW" },
    ],
  });

  // Payments
  const p1 = await prisma.payment.create({ data: { tenantId, patientId: ana.id, serviceTypeId: trimestral.id, totalAmount: 600, discountAmount: 0, finalAmount: 600, modality: "PARCELADO", installmentCount: 3, paymentMethod: "Cartão de Crédito", status: "PARTIALLY_PAID" } });
  await prisma.installment.createMany({ data: [
    { paymentId: p1.id, tenantId, installmentNumber: 1, amount: 200, dueDate: d(-30), status: "PAID", paidAt: d(-30) },
    { paymentId: p1.id, tenantId, installmentNumber: 2, amount: 200, dueDate: d(0),   status: "PENDING" },
    { paymentId: p1.id, tenantId, installmentNumber: 3, amount: 200, dueDate: d(30),  status: "PENDING" },
  ]});

  const p2 = await prisma.payment.create({ data: { tenantId, patientId: carlos.id, serviceTypeId: avulsa.id, totalAmount: 250, discountAmount: 0, finalAmount: 250, modality: "AVISTA", installmentCount: 1, paymentMethod: "PIX", status: "PAID" } });
  await prisma.installment.create({ data: { paymentId: p2.id, tenantId, installmentNumber: 1, amount: 250, dueDate: d(-3), status: "PAID", paidAt: d(-3) } });

  const p3 = await prisma.payment.create({ data: { tenantId, patientId: marcos.id, serviceTypeId: semestral.id, totalAmount: 1080, discountAmount: 80, finalAmount: 1000, modality: "AVISTA", installmentCount: 1, paymentMethod: "PIX", status: "PAID" } });
  await prisma.installment.create({ data: { paymentId: p3.id, tenantId, installmentNumber: 1, amount: 1000, dueDate: d(-5), status: "PAID", paidAt: d(-5) } });

  const p4 = await prisma.payment.create({ data: { tenantId, patientId: camila.id, serviceTypeId: trimestral.id, totalAmount: 600, discountAmount: 0, finalAmount: 600, modality: "PARCELADO", installmentCount: 3, paymentMethod: "Cartão de Crédito", status: "PARTIALLY_PAID" } });
  await prisma.installment.createMany({ data: [
    { paymentId: p4.id, tenantId, installmentNumber: 1, amount: 200, dueDate: d(-30), status: "PAID", paidAt: d(-30) },
    { paymentId: p4.id, tenantId, installmentNumber: 2, amount: 200, dueDate: d(-5),  status: "OVERDUE" },
    { paymentId: p4.id, tenantId, installmentNumber: 3, amount: 200, dueDate: d(25),  status: "PENDING" },
  ]});

  await prisma.payment.create({ data: { tenantId, patientId: patricia.id, serviceTypeId: avulsa.id, totalAmount: 250, discountAmount: 0, finalAmount: 250, modality: "AVISTA", installmentCount: 1, paymentMethod: "Dinheiro", status: "PAID" } });

  // Transactions
  await prisma.transaction.createMany({ data: [
    { tenantId, type: "INCOME",  amount: 250,  description: "Consulta Avulsa — Carlos Roberto", date: d(-3) },
    { tenantId, type: "INCOME",  amount: 1000, description: "Plano Semestral — Marcos Oliveira", date: d(-5) },
    { tenantId, type: "INCOME",  amount: 200,  description: "Plano Trimestral 1/3 — Ana Paula", date: d(-30) },
    { tenantId, type: "INCOME",  amount: 200,  description: "Plano Trimestral 1/3 — Camila Rodrigues", date: d(-30) },
    { tenantId, type: "INCOME",  amount: 250,  description: "Consulta Avulsa — Patrícia Alves", date: d(-2) },
    { tenantId, type: "EXPENSE", amount: 1800, description: "Aluguel do consultório", date: d(-15) },
    { tenantId, type: "EXPENSE", amount: 180,  description: "Material de escritório", date: d(-10) },
    { tenantId, type: "EXPENSE", amount: 320,  description: "Software NutriX", date: d(-1) },
  ]});

  // Message templates
  await prisma.messageTemplate.createMany({ data: [
    { tenantId, type: "CONFIRMATION",     content: "Olá {nome_paciente}! Sua consulta com {nome_nutricionista} está confirmada para {data_consulta} às {hora_consulta}. Te esperamos! 😊" },
    { tenantId, type: "REMINDER",         content: "Olá {nome_paciente}! Lembrando que amanhã temos consulta às {hora_consulta}. Qualquer dúvida me chame! 💚" },
    { tenantId, type: "REMINDER_2H",      content: "Olá {nome_paciente}! Daqui a pouco nos encontramos, às {hora_consulta}. Estou te esperando! 😊" },
    { tenantId, type: "FOLLOWUP",         content: "Oi {nome_paciente}, tudo bem? Faz um tempo que não nos falamos. Como você está se sentindo? 💚" },
    { tenantId, type: "POST_CONSULTATION",content: "Olá {nome_paciente}! Como estão os primeiros dias após nossa consulta? Estou à disposição para qualquer dúvida! 😊" },
    { tenantId, type: "BIRTHDAY",         content: "Feliz aniversário, {nome_paciente}! 🎂 Que seu dia seja incrível! — {nome_nutricionista} 💚" },
    { tenantId, type: "REACTIVATION_30",  content: "Oi {nome_paciente}! Faz um mês que não nos falamos. Como você está? Me conta! 😊" },
    { tenantId, type: "REACTIVATION_60",  content: "Olá {nome_paciente}! Tô com saudade das nossas conversas. Tudo bem por aí? 💚" },
    { tenantId, type: "REACTIVATION_90",  content: "Oi {nome_paciente}! Muito tempo sem se falar. Espero que esteja bem! Quando quiser retomar, estou aqui 🌿" },
    { tenantId, type: "WELCOME",          content: "Olá {nome_paciente}! Seja bem-vindo(a)! Sou {nome_nutricionista} e estou aqui para te ajudar. 💚" },
    { tenantId, type: "PLAN_RENEWAL",     content: "Oi {nome_paciente}! Seu plano está chegando ao fim. Vamos conversar sobre a continuidade? 😊" },
  ]});
}
