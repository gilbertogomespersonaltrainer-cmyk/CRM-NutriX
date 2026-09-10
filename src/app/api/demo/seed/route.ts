import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// Protegido por CRON_SECRET — rode uma única vez via curl após o deploy
export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const DEMO_EMAIL = "demo@nutrix.com";

  const existing = await prisma.tenant.findUnique({ where: { email: DEMO_EMAIL } });
  if (existing) {
    return NextResponse.json({ ok: true, message: "Conta demo já existe" });
  }

  const hashedPassword = await bcrypt.hash("demo2026", 10);

  const plan = await prisma.plan.findFirst();

  const tenant = await prisma.tenant.create({
    data: {
      name: "Dra. Ana Silva",
      email: DEMO_EMAIL,
      password: hashedPassword,
      crn: "CRN-3 12345",
      phone: "11999999999",
      clinicName: "Clínica NutriX Demo",
    },
  });

  if (plan) {
    await prisma.subscription.create({
      data: {
        tenantId: tenant.id,
        planId: plan.id,
        status: "ACTIVE",
        trialEndsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        startsAt: new Date(),
      },
    });
  }

  // Tipos de serviço
  const [consultaAvulsa] = await prisma.$transaction([
    prisma.serviceType.create({ data: { tenantId: tenant.id, name: "Consulta Avulsa", defaultPrice: 250, sortOrder: 0 } }),
    prisma.serviceType.create({ data: { tenantId: tenant.id, name: "Plano Trimestral", defaultPrice: 600, sortOrder: 1 } }),
    prisma.serviceType.create({ data: { tenantId: tenant.id, name: "Plano Semestral", defaultPrice: 1080, sortOrder: 2 } }),
  ]);

  // Pacientes demo
  const names = [
    "Maria Lima", "Ana Souza", "Júlia Costa", "Carla Mendes",
    "Fernanda Rocha", "Beatriz Alves", "Patrícia Santos", "Larissa Nunes",
    "Renata Oliveira", "Camila Ferreira", "Pedro Ramos", "Rafael Silva",
  ];

  const patients = await Promise.all(
    names.map((name, i) =>
      prisma.patient.create({
        data: {
          tenantId: tenant.id,
          name,
          phone: `1199999${String(i).padStart(4, "0")}`,
          email: `${name.toLowerCase().replace(/ /g, ".")}@email.com`,
          isActive: i < 9,
          stage: i < 9 ? "ACTIVE" : "INACTIVE",
        },
      })
    )
  );

  // Agendamentos — alguns hoje, outros no passado
  const today = new Date();
  const appts = [
    { patientIdx: 0, hoursOffset: 2, status: "SCHEDULED" },
    { patientIdx: 1, hoursOffset: 4, status: "SCHEDULED" },
    { patientIdx: 2, hoursOffset: -48, status: "COMPLETED" },
    { patientIdx: 3, hoursOffset: -96, status: "COMPLETED" },
    { patientIdx: 4, hoursOffset: -168, status: "COMPLETED" },
    { patientIdx: 5, hoursOffset: -24, status: "NO_SHOW" },
    { patientIdx: 6, hoursOffset: 24, status: "SCHEDULED" },
    { patientIdx: 7, hoursOffset: -336, status: "COMPLETED" },
  ];

  await Promise.all(
    appts.map(({ patientIdx, hoursOffset, status }) =>
      prisma.appointment.create({
        data: {
          tenantId: tenant.id,
          patientId: patients[patientIdx].id,
          scheduledAt: new Date(today.getTime() + hoursOffset * 60 * 60 * 1000),
          duration: 60,
          status,
          consultationType: "Consulta Avulsa",
        },
      })
    )
  );

  // Pagamentos do mês atual
  const paymentData = [
    { patientIdx: 2, amount: 250, status: "PAID" },
    { patientIdx: 3, amount: 250, status: "PAID" },
    { patientIdx: 4, amount: 600, status: "PAID" },
    { patientIdx: 7, amount: 250, status: "PENDING" },
    { patientIdx: 8, amount: 1080, status: "PAID" },
  ];

  await Promise.all(
    paymentData.map(({ patientIdx, amount, status }) =>
      prisma.payment.create({
        data: {
          tenantId: tenant.id,
          patientId: patients[patientIdx].id,
          serviceTypeId: consultaAvulsa.id,
          description: "Consulta Avulsa",
          totalAmount: amount,
          discountAmount: 0,
          finalAmount: amount,
          modality: "SINGLE",
          paymentMethod: "PIX",
          installmentCount: 1,
          status,
        },
      })
    )
  );

  return NextResponse.json({ ok: true, message: "Conta demo criada com sucesso", tenantId: tenant.id });
}
