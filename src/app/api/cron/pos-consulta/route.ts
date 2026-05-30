import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function sendWhatsApp(instanceName: string, apiUrl: string, apiKey: string, phone: string, message: string) {
  const cleanPhone = phone.replace(/\D/g, "");
  const res = await fetch(`${apiUrl}/message/sendText/${instanceName}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: apiKey },
    body: JSON.stringify({ number: `55${cleanPhone}`, text: message }),
  });
  if (!res.ok) throw new Error(`WhatsApp error: ${res.status}`);
}

export async function GET(req: Request) {
  const secret = req.headers.get("x-cron-secret") ?? new URL(req.url).searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const todayDayOfWeek = new Date().getDay(); // 0=Dom, 1=Seg ... 6=Sab
  const apiUrl = process.env.EVOLUTION_API_URL;
  const apiKey = process.env.EVOLUTION_API_KEY;

  if (!apiUrl || !apiKey) {
    return NextResponse.json({ error: "Evolution API não configurada" }, { status: 500 });
  }

  // Busca todos os tenants com pós-consulta ativado e no dia correto
  const tenants = await prisma.tenant.findMany({
    where: {
      postConsultEnabled: true,
      postConsultDayOfWeek: todayDayOfWeek,
      whatsappStatus: "CONNECTED",
    },
    include: {
      messageTemplates: { where: { type: "POST_CONSULTATION" } },
    },
  });

  let totalSent = 0;
  let totalErrors = 0;

  for (const tenant of tenants) {
    const template = tenant.messageTemplates[0];
    if (!template) continue;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - tenant.postConsultDaysAfter);

    // Consultas concluídas há >= daysAfter dias sem pós-consulta enviado
    const appointments = await prisma.appointment.findMany({
      where: {
        tenantId: tenant.id,
        status: "COMPLETED",
        postConsultSent: false,
        scheduledAt: { lte: cutoffDate },
      },
      include: { patient: true },
    });

    for (const appt of appointments) {
      const patient = appt.patient;
      if (!patient.phone || !patient.isActive) continue;

      const message = template.content.replace(/\{nome_paciente\}/g, patient.name.split(" ")[0]);

      try {
        await sendWhatsApp(tenant.id, apiUrl, apiKey, patient.phone, message);

        // Marca como enviado
        await prisma.appointment.update({
          where: { id: appt.id },
          data: { postConsultSent: true },
        });
        await prisma.patient.update({
          where: { id: patient.id },
          data: { postConsultSentAt: new Date() },
        });

        // Registra no log
        await prisma.whatsAppLog.create({
          data: {
            tenantId: tenant.id,
            patientId: patient.id,
            messageType: "POST_CONSULTATION",
            phoneNumber: patient.phone,
            messageText: message,
            status: "SENT",
          },
        });

        totalSent++;
      } catch (e) {
        console.error(`[pos-consulta] Erro ao enviar para ${patient.name}:`, e);
        await prisma.whatsAppLog.create({
          data: {
            tenantId: tenant.id,
            patientId: patient.id,
            messageType: "POST_CONSULTATION",
            phoneNumber: patient.phone,
            messageText: message,
            status: "FAILED",
            errorMessage: String(e),
          },
        });
        totalErrors++;
      }
    }
  }

  console.log(`[pos-consulta] Enviados: ${totalSent}, Erros: ${totalErrors}`);
  return NextResponse.json({ sent: totalSent, errors: totalErrors });
}
