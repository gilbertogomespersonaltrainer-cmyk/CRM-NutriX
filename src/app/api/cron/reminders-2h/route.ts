import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { evoSendText } from "@/lib/evolution";
import { replaceTemplateVars, formatDateBR, formatTimeBR } from "@/lib/templates";

export async function GET(req: Request) {
  const secret =
    req.headers.get("authorization")?.replace("Bearer ", "") ??
    req.headers.get("x-cron-secret") ??
    new URL(req.url).searchParams.get("secret");

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const threeHoursFromNow = new Date(now.getTime() + 3 * 60 * 60 * 1000);

  const appointments = await prisma.appointment.findMany({
    where: {
      scheduledAt: { gte: twoHoursFromNow, lt: threeHoursFromNow },
      status: "SCHEDULED",
      reminder2hSent: false,
    },
    include: {
      patient: { select: { id: true, name: true, phone: true } },
      tenant: { select: { id: true, name: true, clinicName: true, whatsappStatus: true } },
    },
  });

  let sent = 0;
  let errors = 0;

  for (const apt of appointments) {
    if (apt.tenant.whatsappStatus !== "CONNECTED") continue;

    const template = await prisma.messageTemplate.findUnique({
      where: { tenantId_type: { tenantId: apt.tenantId, type: "REMINDER_2H" } },
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

    try {
      // Prioridade: 1) whatsappChatId salvo no paciente (cobre LIDs)
      //             2) último chatId do inbox (fallback)
      //             3) constrói a partir do telefone
      const patientRecord = await prisma.patient.findUnique({
        where: { id: apt.patient.id },
        select: { whatsappChatId: true },
      });
      let resolvedChatId: string | undefined = patientRecord?.whatsappChatId ?? undefined;
      if (!resolvedChatId) {
        const phoneDigits = apt.patient.phone.replace(/\D/g, "");
        const normalizedPhone = phoneDigits.length <= 11 ? `55${phoneDigits}` : phoneDigits;
        const lastInboxMsg = await prisma.inboxMessage.findFirst({
          where: { tenantId: apt.tenantId, phone: normalizedPhone, fromMe: false, chatId: { not: null } },
          orderBy: { timestamp: "desc" },
          select: { chatId: true },
        });
        resolvedChatId = lastInboxMsg?.chatId ?? undefined;
      }
      await evoSendText(apt.tenantId, apt.patient.phone, message, resolvedChatId);

      await prisma.appointment.update({
        where: { id: apt.id },
        data: { reminder2hSent: true },
      });

      await prisma.whatsAppLog.create({
        data: {
          tenantId: apt.tenantId,
          patientId: apt.patient.id,
          messageType: "REMINDER_2H",
          phoneNumber: apt.patient.phone,
          messageText: message,
          status: "SENT",
        },
      });

      sent++;
      console.log(`[reminders-2h] ✅ ${apt.patient.name} — ${formatTimeBR(scheduledDate)} (tenant: ${apt.tenantId})`);
    } catch (e) {
      errors++;
      console.error(`[reminders-2h] ❌ Erro para ${apt.patient.name}:`, e);

      await prisma.whatsAppLog.create({
        data: {
          tenantId: apt.tenantId,
          patientId: apt.patient.id,
          messageType: "REMINDER_2H",
          phoneNumber: apt.patient.phone,
          messageText: message,
          status: "FAILED",
          errorMessage: e instanceof Error ? e.message : String(e),
        },
      });
    }
  }

  console.log(`[reminders-2h] Concluído — Enviados: ${sent}, Erros: ${errors}`);
  return NextResponse.json({ sent, errors });
}
