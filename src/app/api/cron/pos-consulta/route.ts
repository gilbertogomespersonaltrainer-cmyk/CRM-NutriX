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

  // Busca tenants com pós-consulta ativo e configurado para hoje
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

    // Mínimo de dias após última consulta para começar a enviar
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - tenant.postConsultDaysAfter);

    // Evita reenvio na mesma semana (6 dias de intervalo mínimo)
    const sixDaysAgo = new Date();
    sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);

    // Todos os pacientes ativos em acompanhamento elegíveis
    const patients = await prisma.patient.findMany({
      where: {
        tenantId: tenant.id,
        isActive: true,
        stage: { in: ["ACTIVE", "FIRST_CONSULTATION", "REACTIVATED"] },
        lastAppointmentAt: { lte: cutoffDate, not: null },
        OR: [
          { postConsultSentAt: null },
          { postConsultSentAt: { lt: sixDaysAgo } },
        ],
      },
    });

    for (const patient of patients) {
      if (!patient.phone) continue;

      const firstName = patient.name.split(" ")[0];
      const message = template.content.replace(/\{nome_paciente\}/g, firstName);

      try {
        await sendWhatsApp(tenant.id, apiUrl, apiKey, patient.phone, message);

        // Atualiza data do último envio
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
        console.log(`[pos-consulta] ✅ Enviado para ${patient.name} (tenant: ${tenant.id})`);
      } catch (e) {
        console.error(`[pos-consulta] ❌ Erro ao enviar para ${patient.name}:`, e);
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

  console.log(`[pos-consulta] Concluído — Enviados: ${totalSent}, Erros: ${totalErrors}`);
  return NextResponse.json({ sent: totalSent, errors: totalErrors });
}
