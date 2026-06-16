import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { wahaSendText } from "@/lib/waha";
import { replaceTemplateVars, formatDateBR, formatTimeBR } from "@/lib/templates";

function authorizeCron(req: Request): boolean {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  return secret === process.env.CRON_SECRET;
}

function isProfessionalPlan(tenant: { subscription?: { plan?: { name: string } | null } | null }): boolean {
  return (tenant.subscription?.plan?.name ?? "").toLowerCase().includes("professional");
}

async function sendTemplateMessage(
  tenantId: string,
  patientId: string,
  phone: string,
  message: string,
  messageType: string
) {
  try {
    // Prioridade: 1) whatsappChatId salvo no paciente (cobre LIDs)
    //             2) último chatId do inbox (fallback)
    //             3) constrói a partir do telefone
    const patientRecord = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { whatsappChatId: true },
    });
    let resolvedChatId: string | undefined = patientRecord?.whatsappChatId ?? undefined;
    if (!resolvedChatId) {
      const phoneDigits = phone.replace(/\D/g, "");
      const normalizedPhone = phoneDigits.length <= 11 ? `55${phoneDigits}` : phoneDigits;
      const lastInboxMsg = await prisma.inboxMessage.findFirst({
        where: { tenantId, phone: normalizedPhone, fromMe: false, chatId: { not: null } },
        orderBy: { timestamp: "desc" },
        select: { chatId: true },
      });
      resolvedChatId = lastInboxMsg?.chatId ?? undefined;
    }
    await wahaSendText(tenantId, phone, message, resolvedChatId);
    await prisma.whatsAppLog.create({
      data: {
        tenantId,
        patientId,
        messageType,
        phoneNumber: phone,
        messageText: message,
        status: "SENT",
      },
    });
    return true;
  } catch (err) {
    await prisma.whatsAppLog.create({
      data: {
        tenantId,
        patientId,
        messageType,
        phoneNumber: phone,
        messageText: message,
        status: "FAILED",
        errorMessage: err instanceof Error ? err.message : "Erro",
      },
    });
    return false;
  }
}

// Lembrete 8 dias antes da consulta
async function sendReminders8d() {
  const target = new Date();
  target.setDate(target.getDate() + 8);
  const start = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  const appointments = await prisma.appointment.findMany({
    where: {
      scheduledAt: { gte: start, lt: end },
      status: "SCHEDULED",
      reminder8dSent: false,
    },
    include: {
      patient: { select: { id: true, name: true, phone: true } },
      tenant: { select: { id: true, name: true, clinicName: true, whatsappStatus: true } },
    },
  });

  let sent = 0;
  for (const apt of appointments) {
    if (apt.tenant.whatsappStatus !== "CONNECTED") continue;

    const template = await prisma.messageTemplate.findUnique({
      where: { tenantId_type: { tenantId: apt.tenantId, type: "REMINDER_8D" } },
    });
    if (!template) continue;

    const scheduledDate = new Date(apt.scheduledAt);
    const message = replaceTemplateVars(template.content, {
      nome_paciente: apt.patient.name,
      nome_nutricionista: apt.tenant.name,
      nome_clinica: apt.tenant.clinicName || "",
      data_consulta: formatDateBR(scheduledDate),
      hora_consulta: formatTimeBR(scheduledDate),
      tipo_consulta: apt.consultationType || "",
    });

    const ok = await sendTemplateMessage(apt.tenantId, apt.patient.id, apt.patient.phone, message, "REMINDER_8D");
    if (ok) {
      await prisma.appointment.update({ where: { id: apt.id }, data: { reminder8dSent: true } });
      sent++;
    }
  }
  return sent;
}

// Lembrete 24h antes da consulta
async function sendReminders24h() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const start = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  const appointments = await prisma.appointment.findMany({
    where: {
      scheduledAt: { gte: start, lt: end },
      status: "SCHEDULED",
      reminder24hSent: false,
    },
    include: {
      patient: { select: { id: true, name: true, phone: true } },
      tenant: { select: { id: true, name: true, clinicName: true, whatsappStatus: true } },
    },
  });

  let sent = 0;
  for (const apt of appointments) {
    if (apt.tenant.whatsappStatus !== "CONNECTED") continue;

    const template = await prisma.messageTemplate.findUnique({
      where: { tenantId_type: { tenantId: apt.tenantId, type: "REMINDER" } },
    });
    if (!template) continue;

    const scheduledDate = new Date(apt.scheduledAt);
    const message = replaceTemplateVars(template.content, {
      nome_paciente: apt.patient.name,
      nome_nutricionista: apt.tenant.name,
      nome_clinica: apt.tenant.clinicName || "",
      data_consulta: formatDateBR(scheduledDate),
      hora_consulta: formatTimeBR(scheduledDate),
      tipo_consulta: apt.consultationType || "",
    });

    const ok = await sendTemplateMessage(apt.tenantId, apt.patient.id, apt.patient.phone, message, "REMINDER");
    if (ok) {
      await prisma.appointment.update({ where: { id: apt.id }, data: { reminder24hSent: true } });
      sent++;
    }
  }
  return sent;
}

// Mensagem pós-consulta (3 dias depois de consulta COMPLETED)
async function sendPostConsultation() {
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const fourDaysAgo = new Date();
  fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);

  const appointments = await prisma.appointment.findMany({
    where: {
      scheduledAt: { gte: fourDaysAgo, lt: threeDaysAgo },
      status: "COMPLETED",
      postConsultSent: false,
    },
    include: {
      patient: { select: { id: true, name: true, phone: true } },
      tenant: { select: { id: true, name: true, clinicName: true, whatsappStatus: true, subscription: { select: { plan: { select: { name: true } } } } } },
    },
  });

  let sent = 0;
  for (const apt of appointments) {
    if (apt.tenant.whatsappStatus !== "CONNECTED") continue;
    if (!isProfessionalPlan(apt.tenant)) continue;

    const template = await prisma.messageTemplate.findUnique({
      where: { tenantId_type: { tenantId: apt.tenantId, type: "POST_CONSULTATION" } },
    });
    if (!template) continue;

    const message = replaceTemplateVars(template.content, {
      nome_paciente: apt.patient.name,
      nome_nutricionista: apt.tenant.name,
      nome_clinica: apt.tenant.clinicName || "",
    });

    const ok = await sendTemplateMessage(apt.tenantId, apt.patient.id, apt.patient.phone, message, "POST_CONSULTATION");
    if (ok) {
      await prisma.appointment.update({ where: { id: apt.id }, data: { postConsultSent: true } });
      sent++;
    }
  }
  return sent;
}

// Mensagem de aniversário
async function sendBirthday() {
  const today = new Date();
  const currentYear = today.getFullYear();

  const patients = await prisma.patient.findMany({
    where: {
      isActive: true,
      birthDate: { not: null },
      OR: [
        { birthdaySentYear: null },
        { birthdaySentYear: { lt: currentYear } },
      ],
    },
    include: {
      tenant: { select: { id: true, name: true, clinicName: true, whatsappStatus: true } },
    },
  });

  let sent = 0;
  for (const patient of patients) {
    if (patient.tenant.whatsappStatus !== "CONNECTED") continue;
    if (!patient.birthDate) continue;

    const birth = new Date(patient.birthDate);
    if (birth.getMonth() !== today.getMonth() || birth.getDate() !== today.getDate()) continue;

    const template = await prisma.messageTemplate.findUnique({
      where: { tenantId_type: { tenantId: patient.tenantId, type: "BIRTHDAY" } },
    });
    if (!template) continue;

    const message = replaceTemplateVars(template.content, {
      nome_paciente: patient.name,
      nome_nutricionista: patient.tenant.name,
      nome_clinica: patient.tenant.clinicName || "",
    });

    const ok = await sendTemplateMessage(patient.tenantId, patient.id, patient.phone, message, "BIRTHDAY");
    if (ok) {
      await prisma.patient.update({ where: { id: patient.id }, data: { birthdaySentYear: currentYear } });
      sent++;
    }
  }
  return sent;
}

// Reativação escalonada (30/60/90 dias)
async function sendReactivation() {
  const now = new Date();
  const ranges = [
    { days: 30, type: "REACTIVATION_30" as const },
    { days: 60, type: "REACTIVATION_60" as const },
    { days: 90, type: "REACTIVATION_90" as const },
  ];

  let totalSent = 0;

  for (const range of ranges) {
    const targetDate = new Date(now.getTime() - range.days * 24 * 60 * 60 * 1000);
    const windowStart = new Date(targetDate.getTime() - 24 * 60 * 60 * 1000);

    const patients = await prisma.patient.findMany({
      where: {
        isActive: false,
        stage: "INACTIVE",
        lastAppointmentAt: { gte: windowStart, lt: targetDate },
        OR: [
          { lastReactivationAt: null },
          { lastReactivationAt: { lt: windowStart } },
        ],
      },
      include: {
        tenant: { select: { id: true, name: true, clinicName: true, whatsappStatus: true, subscription: { select: { plan: { select: { name: true } } } } } },
      },
    });

    for (const patient of patients) {
      if (patient.tenant.whatsappStatus !== "CONNECTED") continue;
      // Reativação de 60 e 90 dias é exclusiva do plano Professional
      if (range.days > 30 && !isProfessionalPlan(patient.tenant)) continue;

      const template = await prisma.messageTemplate.findUnique({
        where: { tenantId_type: { tenantId: patient.tenantId, type: range.type } },
      });
      if (!template) continue;

      const message = replaceTemplateVars(template.content, {
        nome_paciente: patient.name,
        nome_nutricionista: patient.tenant.name,
        nome_clinica: patient.tenant.clinicName || "",
      });

      const ok = await sendTemplateMessage(patient.tenantId, patient.id, patient.phone, message, range.type);
      if (ok) {
        await prisma.patient.update({ where: { id: patient.id }, data: { lastReactivationAt: now } });
        totalSent++;
      }
    }
  }

  return totalSent;
}

export async function GET(req: Request) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tasks = {
    reminders8d: sendReminders8d(),
    reminders24h: sendReminders24h(),
    postConsult: sendPostConsultation(),
    birthdays: sendBirthday(),
    reactivations: sendReactivation(),
  };

  const results = await Promise.allSettled(Object.values(tasks));
  const taskNames = Object.keys(tasks) as (keyof typeof tasks)[];

  const summary: Record<string, number | { error: string }> = {};
  let hasError = false;

  results.forEach((result, i) => {
    const name = taskNames[i];
    if (result.status === "fulfilled") {
      summary[name] = result.value;
    } else {
      hasError = true;
      const message = result.reason instanceof Error ? result.reason.message : String(result.reason);
      console.error(`[cron/whatsapp-reminders] Falha em "${name}":`, result.reason);
      summary[name] = { error: message };
    }
  });

  return NextResponse.json(summary, { status: hasError ? 207 : 200 });
}
