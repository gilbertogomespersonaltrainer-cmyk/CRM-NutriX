import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { evoSendText } from "@/lib/evolution";
import { replaceTemplateVars } from "@/lib/templates";

export async function GET(req: Request) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "")
    ?? req.headers.get("x-cron-secret")
    ?? new URL(req.url).searchParams.get("secret");

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Busca tenants com pós-consulta ativo e WhatsApp conectado
  const tenants = await prisma.tenant.findMany({
    where: { postConsultEnabled: true, whatsappStatus: "CONNECTED" },
    select: { id: true, name: true, clinicName: true, postConsultDaysAfter: true },
  });

  let totalSent = 0;
  let totalErrors = 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  for (const tenant of tenants) {
    const daysAfter = tenant.postConsultDaysAfter ?? 3;

    // Data alvo: hoje - daysAfter (consultas que deveriam disparar hoje)
    const targetStart = new Date(today.getTime() - daysAfter * 24 * 60 * 60 * 1000);
    const targetEnd = new Date(tomorrow.getTime() - daysAfter * 24 * 60 * 60 * 1000);

    const appointments = await prisma.appointment.findMany({
      where: {
        tenantId: tenant.id,
        status: "COMPLETED",
        scheduledAt: { gte: targetStart, lt: targetEnd },
        postConsultSent: false,
      },
      include: {
        patient: { select: { id: true, name: true, phone: true, whatsappChatId: true } },
      },
    });

    const template = await prisma.messageTemplate.findUnique({
      where: { tenantId_type: { tenantId: tenant.id, type: "POST_CONSULTATION" } },
    });
    if (!template) continue;

    for (const apt of appointments) {
      const message = replaceTemplateVars(template.content, {
        nome_paciente: apt.patient.name.split(" ")[0],
        nome_nutricionista: tenant.name,
        nome_clinica: tenant.clinicName || "",
      });

      try {
        // Resolve chatId para garantir entrega correta (inclusive LIDs)
        let resolvedChatId: string | undefined = apt.patient.whatsappChatId ?? undefined;
        if (!resolvedChatId) {
          const phoneDigits = apt.patient.phone.replace(/\D/g, "");
          const normalizedPhone = phoneDigits.length <= 11 ? `55${phoneDigits}` : phoneDigits;
          const lastMsg = await prisma.inboxMessage.findFirst({
            where: { tenantId: tenant.id, phone: normalizedPhone, fromMe: false, chatId: { not: null } },
            orderBy: { timestamp: "desc" },
            select: { chatId: true },
          });
          resolvedChatId = lastMsg?.chatId ?? undefined;
        }

        await evoSendText(tenant.id, apt.patient.phone, message, resolvedChatId);

        await prisma.appointment.update({
          where: { id: apt.id },
          data: { postConsultSent: true },
        });

        await prisma.whatsAppLog.create({
          data: {
            tenantId: tenant.id,
            patientId: apt.patient.id,
            messageType: "POST_CONSULTATION",
            phoneNumber: apt.patient.phone,
            messageText: message,
            status: "SENT",
          },
        });

        totalSent++;
        console.log(`[pos-consulta] ✅ ${apt.patient.name} (tenant: ${tenant.id})`);
      } catch (e) {
        console.error(`[pos-consulta] ❌ Erro para ${apt.patient.name}:`, e);
        await prisma.whatsAppLog.create({
          data: {
            tenantId: tenant.id,
            patientId: apt.patient.id,
            messageType: "POST_CONSULTATION",
            phoneNumber: apt.patient.phone,
            messageText: message,
            status: "FAILED",
            errorMessage: String(e),
          },
        });
        totalErrors++;
      }
    }
  }

  console.log(`[pos-consulta] Concluído — Enviados: ${totalSent}, Erros: ${totalErrors}`);
  return NextResponse.json({ sent: totalSent, errors: totalErrors });
}
