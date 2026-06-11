import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { wahaSendText } from "@/lib/waha";
import { replaceTemplateVars } from "@/lib/templates";

export async function GET(req: Request) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "")
    ?? req.headers.get("x-cron-secret")
    ?? new URL(req.url).searchParams.get("secret");

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const todayDayOfWeek = new Date().getDay(); // 0=Dom, 1=Seg ... 6=Sab

  // Busca tenants com pós-consulta ativo, configurado para hoje e WhatsApp conectado
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

    // Evita reenvio na mesma semana (6 dias de intervalo mínimo)
    const sixDaysAgo = new Date();
    sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);

    const patients = await prisma.patient.findMany({
      where: {
        tenantId: tenant.id,
        isActive: true,
        stage: { in: ["ACTIVE", "FIRST_CONSULTATION", "REACTIVATED"] },
        OR: [
          { postConsultSentAt: null },
          { postConsultSentAt: { lt: sixDaysAgo } },
        ],
      },
    });

    for (const patient of patients) {
      if (!patient.phone) continue;

      const message = replaceTemplateVars(template.content, {
        nome_paciente: patient.name.split(" ")[0],
        nome_nutricionista: tenant.name,
        nome_clinica: tenant.clinicName || "",
      });

      try {
        await wahaSendText(tenant.id, patient.phone, message);

        await prisma.patient.update({
          where: { id: patient.id },
          data: { postConsultSentAt: new Date() },
        });

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
        console.log(`[pos-consulta] ✅ ${patient.name} (tenant: ${tenant.id})`);
      } catch (e) {
        console.error(`[pos-consulta] ❌ Erro para ${patient.name}:`, e);
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
